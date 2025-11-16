const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodeCrypto = require('crypto');
const { database, initializeDatabase } = require('../../config/database');
const {
  corsHeaders,
  json: jsonResponse,
  error: errorResponse,
  parseBody,
  authenticate
} = require('../../utils/http');
const { withHandler } = require('../../utils/fn');
const { validatePassword } = require('../../utils/password');
const { isValidRole } = require('../../utils/rbac');
const { checkRateLimit, getClientIP } = require('../../utils/rate-limit');
const { generateCSRFToken } = require('../../utils/csrf');
const { logAudit } = require('../../utils/audit');
const { sendVerificationEmail } = require('../../utils/email');
const {
  generateTOTPSecret,
  verifyTOTPToken,
  generateQRCode,
  generateBackupCodes,
  verifyBackupCode,
  prepareBackupCodesForStorage,
  parseStoredBackupCodes
} = require('../../utils/totp');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Helper to track email verification attempts
const trackVerificationAttempt = async (
  userId,
  email,
  attemptType,
  success,
  token = null,
  errorMessage = null,
  event = null
) => {
  try {
    const ip = event
      ? event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'] || 'unknown'
      : null;
    const userAgent = event
      ? event.headers['user-agent'] || event.headers['User-Agent'] || null
      : null;
    await database.run(
      'INSERT INTO email_verification_attempts (user_id, email, attempt_type, token_used, success, ip_address, user_agent, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, email, attemptType, token, success ? 1 : 0, ip, userAgent, errorMessage]
    );
  } catch (e) {
    console.error('Failed to track verification attempt:', e);
  }
};

// Generate tokens with optional "remember me" extended expiry
const generateTokens = (userId, rememberMe = false) => {
  const accessExpiry = rememberMe ? '30d' : process.env.JWT_EXPIRES_IN || '7d';
  const refreshExpiry = rememberMe ? '90d' : process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: accessExpiry });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: refreshExpiry
  });
  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken, rememberMe = false) => {
  const tokenHash = nodeCrypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiryDays = rememberMe ? 90 : 30;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  await database.run(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt.toISOString()]
  );
};

// authenticate now provided by shared helper

let dbInitialized = false;
exports.handler = withHandler(async event => {
  // Connect and initialize database (once per cold start)
  if (!dbInitialized) {
    await database.connect();
    try {
      await initializeDatabase();
    } catch (e) {
      /* tables may already exist */
    }
    dbInitialized = true;
  }

  // Expect an action param via path or query (?action=login) or JSON body { action }
  let action = (event.queryStringParameters && event.queryStringParameters.action) || '';
  const payload = parseBody(event);
  if (!action && payload.action) action = payload.action;
  const method = event.httpMethod;

  try {
    // REGISTER
    if (action === 'register' || (method === 'POST' && event.path.endsWith('/auth/register'))) {
      const { email, password, name } = payload;
      if (!email || !password || !name)
        return errorResponse(400, 'Missing email, password or name');

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return errorResponse(400, 'Password does not meet requirements', {
          errors: passwordValidation.errors
        });
      }

      const existing = await database.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) return errorResponse(409, 'User already exists with this email');
      const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(password, rounds);
      const verificationToken = nodeCrypto.randomBytes(32).toString('hex');
      const verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
      const result = await database.run(
        'INSERT INTO users (email, name, password_hash, role, email_verified, email_verification_token, email_verification_expires) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [email, name, passwordHash, 'user', 0, verificationToken, verificationExpires]
      );

      // Log user registration
      await logAudit(event, {
        action: 'auth.register',
        userId: result.id,
        details: { email, name }
      });

      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL || 'https://joshburt.com.au'}/verify-email.html?token=${verificationToken}`;
      try {
        await sendVerificationEmail(email, name, verificationUrl);
        await trackVerificationAttempt(
          result.id,
          email,
          'initial',
          true,
          verificationToken,
          null,
          event
        );
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        await trackVerificationAttempt(
          result.id,
          email,
          'initial',
          false,
          verificationToken,
          emailError.message,
          event
        );
        // Don't fail registration if email fails
      }

      return jsonResponse(201, { message: 'Registered. Verify email.', userId: result.id });
    }

    // RESEND VERIFICATION EMAIL
    if (action === 'resend-verification') {
      const { email } = payload;
      if (!email) return errorResponse(400, 'Email required');

      const user = await database.get(
        'SELECT id, name, email, email_verified, email_verification_token, email_verification_expires FROM users WHERE email = ?',
        [email]
      );
      if (!user) {
        // Don't reveal if user exists - always return success
        return jsonResponse(200, {
          message: 'If account exists and is not verified, verification email sent.'
        });
      }

      if (user.email_verified) {
        return errorResponse(400, 'Email already verified');
      }

      // Generate new verification token
      const verificationToken = nodeCrypto.randomBytes(32).toString('hex');
      const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      await database.run(
        'UPDATE users SET email_verification_token = ?, email_verification_expires = ? WHERE id = ?',
        [verificationToken, verificationExpires, user.id]
      );

      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL || 'https://joshburt.com.au'}/verify-email.html?token=${verificationToken}`;
      try {
        await sendVerificationEmail(user.email, user.name, verificationUrl);
        await trackVerificationAttempt(
          user.id,
          user.email,
          'resend',
          true,
          verificationToken,
          null,
          event
        );

        // Log resend verification
        await logAudit(event, {
          action: 'auth.verification_resent',
          userId: user.id,
          details: { email: user.email }
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        await trackVerificationAttempt(
          user.id,
          user.email,
          'resend',
          false,
          verificationToken,
          emailError.message,
          event
        );
        return errorResponse(500, 'Failed to send verification email. Please try again later.');
      }

      return jsonResponse(200, { message: 'Verification email sent.' });
    }

    // VERIFY EMAIL
    if (action === 'verify-email') {
      const { token } = event.queryStringParameters || {};
      if (!token) return errorResponse(400, 'Missing verification token');
      const user = await database.get(
        'SELECT id, email FROM users WHERE email_verification_token = ?',
        [token]
      );
      if (!user) {
        await trackVerificationAttempt(
          null,
          'unknown',
          'verify',
          false,
          token,
          'Invalid token',
          event
        );
        return errorResponse(400, 'Invalid or expired verification token');
      }
      const userFull = await database.get(
        'SELECT id, email, email_verification_expires FROM users WHERE id = ?',
        [user.id]
      );
      if (userFull.email_verification_expires && userFull.email_verification_expires < Date.now()) {
        await trackVerificationAttempt(
          user.id,
          user.email,
          'verify',
          false,
          token,
          'Token expired',
          event
        );
        return errorResponse(400, 'Verification token expired');
      }
      await database.run(
        'UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?',
        [user.id]
      );
      await trackVerificationAttempt(user.id, user.email, 'verify', true, token, null, event);

      // Log successful verification
      await logAudit(event, {
        action: 'auth.email_verified',
        userId: user.id,
        details: { email: user.email }
      });

      return jsonResponse(200, { message: 'Email verified' });
    }

    // LOGIN
    if (action === 'login' || (method === 'POST' && event.path.endsWith('/auth/login'))) {
      const { email, password, totpToken, backupCode, rememberMe } = payload;
      if (!email || !password) return errorResponse(400, 'Invalid email or password format');

      // Enhanced rate limiting by IP
      const ip = getClientIP(event);
      const rlKey = `login:${ip}`;
      const rateCheck = checkRateLimit(rlKey, 10, 60 * 1000); // 10 attempts per minute
      if (!rateCheck.allowed) {
        return errorResponse(
          429,
          'Too many login attempts. Please wait a few minutes and try again.',
          { retryAfter: rateCheck.retryAfter }
        );
      }

      const user = await database.get(
        'SELECT id, email, name, password_hash, role, is_active, email_verified, failed_login_attempts, lockout_expires, totp_enabled, totp_secret, backup_codes FROM users WHERE email = ?',
        [email]
      );
      if (!user || !user.is_active) {
        // Log failed login attempt (user not found or inactive)
        await logAudit(event, {
          action: 'auth.login_failed',
          userId: null,
          details: { email, reason: 'invalid_credentials' }
        });
        return errorResponse(401, 'Invalid credentials');
      }
      if (user.lockout_expires && user.lockout_expires > Date.now()) {
        const minutes = Math.ceil((user.lockout_expires - Date.now()) / 60000);
        return errorResponse(403, `Account locked. Try again in ${minutes} minute(s).`);
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      const MAX_ATTEMPTS = 5;
      const LOCKOUT_MINUTES = 15;
      if (!valid) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        let lockout = null;
        if (attempts >= MAX_ATTEMPTS) lockout = Date.now() + LOCKOUT_MINUTES * 60000;
        await database.run(
          'UPDATE users SET failed_login_attempts = ?, lockout_expires = ? WHERE id = ?',
          [attempts, lockout, user.id]
        );

        // Log failed password attempt
        await logAudit(event, {
          action: 'auth.login_failed',
          userId: user.id,
          details: { email: user.email, reason: 'invalid_password', attempts, locked: !!lockout }
        });

        if (lockout)
          return errorResponse(
            403,
            `Account locked due to too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`
          );
        return errorResponse(
          401,
          `Invalid credentials. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.`
        );
      }

      // Check 2FA if enabled
      if (user.totp_enabled) {
        let twoFactorValid = false;

        // Try TOTP token first
        if (totpToken && user.totp_secret) {
          twoFactorValid = verifyTOTPToken(totpToken, user.totp_secret);
        }

        // Try backup code if TOTP failed and backup code provided
        if (!twoFactorValid && backupCode && user.backup_codes) {
          const storedCodes = parseStoredBackupCodes(user.backup_codes);
          const backupResult = verifyBackupCode(backupCode, storedCodes);

          if (backupResult.valid) {
            twoFactorValid = true;
            // Update remaining backup codes
            const updatedCodes = prepareBackupCodesForStorage(backupResult.remainingCodes);
            await database.run('UPDATE users SET backup_codes = ? WHERE id = ?', [
              updatedCodes,
              user.id
            ]);
          }
        }

        if (!twoFactorValid) {
          return errorResponse(401, '2FA verification required', { requires2FA: true });
        }
      }

      if (user.failed_login_attempts > 0 || user.lockout_expires) {
        await database.run(
          'UPDATE users SET failed_login_attempts = 0, lockout_expires = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id]
        );
      } else {
        await database.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [
          user.id
        ]);
      }
      const { accessToken, refreshToken } = generateTokens(user.id, rememberMe);
      await storeRefreshToken(user.id, refreshToken, rememberMe);

      // Log successful login
      await logAudit(event, {
        action: 'auth.login',
        userId: user.id,
        details: {
          email: user.email,
          role: user.role,
          rememberMe: !!rememberMe,
          twoFactorUsed: !!user.totp_enabled
        }
      });

      return jsonResponse(200, {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.email_verified
        },
        accessToken,
        refreshToken
      });
    }

    // REFRESH
    if (action === 'refresh') {
      const { refreshToken } = payload;
      if (!refreshToken) return errorResponse(401, 'Refresh token required');
      try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        if (decoded.type !== 'refresh') return errorResponse(401, 'Invalid token type');
        const tokenHash = nodeCrypto.createHash('sha256').update(refreshToken).digest('hex');
        const nowIso = new Date().toISOString();
        const tokenRecord = await database.get(
          'SELECT user_id FROM refresh_tokens WHERE token_hash = ? AND expires_at > ?',
          [tokenHash, nowIso]
        );
        if (!tokenRecord) return errorResponse(401, 'Invalid or expired refresh token');
        const user = await database.get('SELECT id, is_active FROM users WHERE id = ?', [
          tokenRecord.user_id
        ]);
        if (!user || !user.is_active) return errorResponse(401, 'User not found or inactive');
        const tokens = generateTokens(user.id);
        await storeRefreshToken(user.id, tokens.refreshToken);
        await database.run('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
        return jsonResponse(200, {
          message: 'Tokens refreshed',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        });
      } catch (e) {
        return errorResponse(401, 'Token refresh failed');
      }
    }

    // LOGOUT
    if (action === 'logout') {
      const { refreshToken } = payload || {};

      // Try to get user from token before deleting
      let userId = null;
      if (refreshToken) {
        try {
          const decoded = jwt.verify(refreshToken, JWT_SECRET);
          userId = decoded.userId;
        } catch (_) {
          // Token invalid or expired, continue with deletion
        }
        const tokenHash = nodeCrypto.createHash('sha256').update(refreshToken).digest('hex');
        await database.run('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
      }

      const nowIso = new Date().toISOString();
      await database.run('DELETE FROM refresh_tokens WHERE expires_at <= ?', [nowIso]);

      // Log logout
      await logAudit(event, {
        action: 'auth.logout',
        userId,
        details: { tokenProvided: !!refreshToken }
      });

      return jsonResponse(200, { message: 'Logged out successfully' });
    }

    // FORGOT PASSWORD (always 200)
    if (action === 'forgot-password') {
      const { email } = payload;
      if (email) {
        const user = await database.get('SELECT id, name FROM users WHERE email = ?', [email]);
        if (user) {
          const resetToken = nodeCrypto.randomBytes(32).toString('hex');
          const resetTokenExpires = Date.now() + 3600000; // 1h
          await database.run(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [resetToken, resetTokenExpires, user.id]
          );

          // Log password reset request
          await logAudit(event, {
            action: 'auth.password_reset_requested',
            userId: user.id,
            details: { email }
          });
          // Email sending is omitted here (previously via nodemailer) – can integrate later.
        }
      }
      return jsonResponse(200, { message: 'If account exists, reset link sent.' });
    }

    // RESET PASSWORD
    if (action === 'reset-password') {
      const { token, password } = payload;
      if (!token || !password) return errorResponse(400, 'Invalid token or password format');

      // Validate new password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return errorResponse(400, 'Password does not meet requirements', {
          errors: passwordValidation.errors
        });
      }

      const user = await database.get(
        'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?',
        [token, Date.now()]
      );
      if (!user) return errorResponse(400, 'Invalid or expired reset token');
      const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hash = await bcrypt.hash(password, rounds);
      await database.run(
        'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
        [hash, user.id]
      );
      await database.run('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);

      // Log successful password reset
      await logAudit(event, {
        action: 'auth.password_reset_completed',
        userId: user.id,
        details: { allSessionsInvalidated: true }
      });

      return jsonResponse(200, { message: 'Password reset successfully' });
    }

    // ME
    if (action === 'me') {
      const user = await authenticate(event);
      if (!user) return errorResponse(401, 'User not found');
      return jsonResponse(200, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.email_verified,
          totpEnabled: user.totp_enabled || false,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          avatarUrl: user.avatar_url
        }
      });
    }

    // 2FA SETUP - Generate TOTP secret and QR code
    if (action === '2fa-setup') {
      const user = await authenticate(event);
      if (!user) return errorResponse(401, 'Authentication required');

      // Generate new TOTP secret
      const { secret, otpauthUrl } = generateTOTPSecret(user.email);

      // Generate QR code
      const qrCode = await generateQRCode(otpauthUrl);

      // Store secret temporarily (not enabled yet)
      await database.run('UPDATE users SET totp_secret = ? WHERE id = ?', [secret, user.id]);

      return jsonResponse(200, {
        message: '2FA setup initiated',
        secret,
        qrCode
      });
    }

    // 2FA ENABLE - Verify TOTP and enable 2FA
    if (action === '2fa-enable') {
      const user = await authenticate(event);
      if (!user) return errorResponse(401, 'Authentication required');

      const { totpToken } = payload;
      if (!totpToken) return errorResponse(400, 'TOTP token required');

      // Get current secret
      const userData = await database.get('SELECT totp_secret FROM users WHERE id = ?', [user.id]);
      if (!userData || !userData.totp_secret) {
        return errorResponse(400, 'Please setup 2FA first');
      }

      // Verify token
      if (!verifyTOTPToken(totpToken, userData.totp_secret)) {
        return errorResponse(401, 'Invalid TOTP token');
      }

      // Generate backup codes
      const backupCodes = generateBackupCodes();
      const storedCodes = prepareBackupCodesForStorage(backupCodes);

      // Enable 2FA
      await database.run('UPDATE users SET totp_enabled = ?, backup_codes = ? WHERE id = ?', [
        true,
        storedCodes,
        user.id
      ]);

      return jsonResponse(200, {
        message: '2FA enabled successfully',
        backupCodes // Return plain text codes once for user to save
      });
    }

    // 2FA DISABLE - Disable 2FA with password verification
    if (action === '2fa-disable') {
      const user = await authenticate(event);
      if (!user) return errorResponse(401, 'Authentication required');

      const { password } = payload;
      if (!password) return errorResponse(400, 'Password required to disable 2FA');

      // Verify password
      const userData = await database.get('SELECT password_hash FROM users WHERE id = ?', [
        user.id
      ]);
      const valid = await bcrypt.compare(password, userData.password_hash);

      if (!valid) {
        return errorResponse(401, 'Invalid password');
      }

      // Disable 2FA
      await database.run(
        'UPDATE users SET totp_enabled = ?, totp_secret = NULL, backup_codes = NULL WHERE id = ?',
        [false, user.id]
      );

      return jsonResponse(200, { message: '2FA disabled successfully' });
    }

    // 2FA REGENERATE BACKUP CODES - Generate new backup codes
    if (action === '2fa-regenerate-codes') {
      const user = await authenticate(event);
      if (!user) return errorResponse(401, 'Authentication required');

      const { password } = payload;
      if (!password) return errorResponse(400, 'Password required');

      // Verify password
      const userData = await database.get(
        'SELECT password_hash, totp_enabled FROM users WHERE id = ?',
        [user.id]
      );

      if (!userData.totp_enabled) {
        return errorResponse(400, '2FA is not enabled');
      }

      const valid = await bcrypt.compare(password, userData.password_hash);
      if (!valid) {
        return errorResponse(401, 'Invalid password');
      }

      // Generate new backup codes
      const backupCodes = generateBackupCodes();
      const storedCodes = prepareBackupCodesForStorage(backupCodes);

      await database.run('UPDATE users SET backup_codes = ? WHERE id = ?', [storedCodes, user.id]);

      return jsonResponse(200, {
        message: 'Backup codes regenerated',
        backupCodes
      });
    }

    // CSRF TOKEN - Generate CSRF token for authenticated session
    if (action === 'csrf-token') {
      const user = await authenticate(event);
      if (!user) return errorResponse(401, 'Authentication required');

      const sessionId = `user:${user.id}`;
      const csrfToken = generateCSRFToken(sessionId);

      return jsonResponse(200, { csrfToken });
    }

    // CHANGE PASSWORD - Change password for authenticated user
    if (action === 'change-password') {
      const user = await authenticate(event);
      if (!user) return errorResponse(401, 'Authentication required');

      const { currentPassword, newPassword } = payload;
      if (!currentPassword || !newPassword) {
        return errorResponse(400, 'Current password and new password are required');
      }

      // Verify current password
      const userData = await database.get('SELECT password_hash FROM users WHERE id = ?', [
        user.id
      ]);
      const valid = await bcrypt.compare(currentPassword, userData.password_hash);

      if (!valid) {
        await logAudit(event, {
          action: 'auth.password_change_failed',
          userId: user.id,
          details: { reason: 'invalid_current_password' }
        });
        return errorResponse(401, 'Current password is incorrect');
      }

      // Validate new password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return errorResponse(400, 'New password does not meet requirements', {
          errors: passwordValidation.errors
        });
      }

      // Check that new password is different from current
      const samePassword = await bcrypt.compare(newPassword, userData.password_hash);
      if (samePassword) {
        return errorResponse(400, 'New password must be different from current password');
      }

      // Hash and update password
      const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hash = await bcrypt.hash(newPassword, rounds);
      await database.run(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hash, user.id]
      );

      // Invalidate all existing refresh tokens for security
      await database.run('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);

      // Log successful password change
      await logAudit(event, {
        action: 'auth.password_changed',
        userId: user.id,
        details: { allSessionsInvalidated: true }
      });

      return jsonResponse(200, {
        message: 'Password changed successfully. Please log in again with your new password.'
      });
    }

    return errorResponse(400, 'Unknown auth action');
  } catch (error) {
    console.error('Auth function error', error);
    return errorResponse(500, 'Internal server error');
  }
});

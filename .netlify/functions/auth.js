const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodeCrypto = require('crypto');
const { database, initializeDatabase } = require('../../config/database');
const { corsHeaders, json: jsonResponse, error: errorResponse, parseBody, authenticate } = require('../../utils/http');
const { withHandler } = require('../../utils/fn');
const { validatePassword } = require('../../utils/password');
const { isValidRole } = require('../../utils/rbac');
const { checkRateLimit, getClientIP } = require('../../utils/rate-limit');
const { generateCSRFToken } = require('../../utils/csrf');
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

// Generate tokens with optional "remember me" extended expiry
const generateTokens = (userId, rememberMe = false) => {
  const accessExpiry = rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '7d');
  const refreshExpiry = rememberMe ? '90d' : (process.env.JWT_REFRESH_EXPIRES_IN || '30d');
  
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: accessExpiry });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: refreshExpiry });
  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken, rememberMe = false) => {
  const tokenHash = nodeCrypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiryDays = rememberMe ? 90 : 30;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  await database.run('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [userId, tokenHash, expiresAt.toISOString()]);
};

// authenticate now provided by shared helper

let dbInitialized = false;
exports.handler = withHandler(async (event) => {

  // Connect and initialize database (once per cold start)
  if (!dbInitialized) {
    await database.connect();
    try { await initializeDatabase(); } catch (e) { /* tables may already exist */ }
    dbInitialized = true;
  }

  // Expect an action param via path or query (?action=login) or JSON body { action }
  let action = (event.queryStringParameters && event.queryStringParameters.action) || '';
  const payload = parseBody(event);
  if (!action && payload.action) action = payload.action;
  const method = event.httpMethod;

  try {
    // REGISTER
    if ((action === 'register' || (method === 'POST' && event.path.endsWith('/auth/register')))) {
      const { email, password, name } = payload;
      if (!email || !password || !name) return errorResponse(400, 'Missing email, password or name');
      
      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return errorResponse(400, 'Password does not meet requirements', { errors: passwordValidation.errors });
      }
      
      const existing = await database.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) return errorResponse(409, 'User already exists with this email');
      const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(password, rounds);
      const verificationToken = nodeCrypto.randomBytes(32).toString('hex');
      const verificationExpires = Date.now() + 24*60*60*1000;
      const result = await database.run('INSERT INTO users (email, name, password_hash, role, email_verified, email_verification_token, email_verification_expires) VALUES (?, ?, ?, ?, ?, ?, ?)', [email, name, passwordHash, 'user', 0, verificationToken, verificationExpires]);
      return jsonResponse(201, { message: 'Registered. Verify email.', userId: result.id });
    }

    // VERIFY EMAIL
    if (action === 'verify-email') {
      const { token } = event.queryStringParameters || {};
      if (!token) return errorResponse(400, 'Missing verification token');
      const user = await database.get('SELECT id, email_verification_expires FROM users WHERE email_verification_token = ?', [token]);
      if (!user) return errorResponse(400, 'Invalid or expired verification token');
      if (user.email_verification_expires && user.email_verification_expires < Date.now()) return errorResponse(400, 'Verification token expired');
      await database.run('UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?', [user.id]);
      return jsonResponse(200, { message: 'Email verified' });
    }

    // LOGIN
    if ((action === 'login' || (method === 'POST' && event.path.endsWith('/auth/login')))) {
      const { email, password, totpToken, backupCode, rememberMe } = payload;
      if (!email || !password) return errorResponse(400, 'Invalid email or password format');
      
      // Enhanced rate limiting by IP
      const ip = getClientIP(event);
      const rlKey = `login:${ip}`;
      const rateCheck = checkRateLimit(rlKey, 10, 60 * 1000); // 10 attempts per minute
      if (!rateCheck.allowed) {
        return errorResponse(429, 'Too many login attempts. Please wait a few minutes and try again.', { retryAfter: rateCheck.retryAfter });
      }
      
      const user = await database.get('SELECT id, email, name, password_hash, role, is_active, email_verified, failed_login_attempts, lockout_expires, totp_enabled, totp_secret, backup_codes FROM users WHERE email = ?', [email]);
      if (!user || !user.is_active) return errorResponse(401, 'Invalid credentials');
      if (user.lockout_expires && user.lockout_expires > Date.now()) {
        const minutes = Math.ceil((user.lockout_expires - Date.now())/60000);
        return errorResponse(403, `Account locked. Try again in ${minutes} minute(s).`);
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      const MAX_ATTEMPTS = 5; const LOCKOUT_MINUTES = 15;
      if (!valid) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        let lockout = null; if (attempts >= MAX_ATTEMPTS) lockout = Date.now() + LOCKOUT_MINUTES*60000;
        await database.run('UPDATE users SET failed_login_attempts = ?, lockout_expires = ? WHERE id = ?', [attempts, lockout, user.id]);
        if (lockout) return errorResponse(403, `Account locked due to too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`);
        return errorResponse(401, `Invalid credentials. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.`);
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
            await database.run('UPDATE users SET backup_codes = ? WHERE id = ?', [updatedCodes, user.id]);
          }
        }
        
        if (!twoFactorValid) {
          return errorResponse(401, '2FA verification required', { requires2FA: true });
        }
      }
      
      if (user.failed_login_attempts > 0 || user.lockout_expires) {
        await database.run('UPDATE users SET failed_login_attempts = 0, lockout_expires = NULL WHERE id = ?', [user.id]);
      }
      const { accessToken, refreshToken } = generateTokens(user.id, rememberMe);
      await storeRefreshToken(user.id, refreshToken, rememberMe);
      return jsonResponse(200, { message: 'Login successful', user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.email_verified }, accessToken, refreshToken });
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
        const tokenRecord = await database.get('SELECT user_id FROM refresh_tokens WHERE token_hash = ? AND expires_at > ?', [tokenHash, nowIso]);
        if (!tokenRecord) return errorResponse(401, 'Invalid or expired refresh token');
        const user = await database.get('SELECT id, is_active FROM users WHERE id = ?', [tokenRecord.user_id]);
        if (!user || !user.is_active) return errorResponse(401, 'User not found or inactive');
        const tokens = generateTokens(user.id);
        await storeRefreshToken(user.id, tokens.refreshToken);
        await database.run('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
        return jsonResponse(200, { message: 'Tokens refreshed', accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      } catch (e) {
        return errorResponse(401, 'Token refresh failed');
      }
    }

    // LOGOUT
    if (action === 'logout') {
      const { refreshToken } = payload || {};
      if (refreshToken) {
        const tokenHash = nodeCrypto.createHash('sha256').update(refreshToken).digest('hex');
        await database.run('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
      }
      const nowIso = new Date().toISOString();
      await database.run('DELETE FROM refresh_tokens WHERE expires_at <= ?', [nowIso]);
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
          await database.run('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [resetToken, resetTokenExpires, user.id]);
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
        return errorResponse(400, 'Password does not meet requirements', { errors: passwordValidation.errors });
      }
      
      const user = await database.get('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?', [token, Date.now()]);
      if (!user) return errorResponse(400, 'Invalid or expired reset token');
      const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hash = await bcrypt.hash(password, rounds);
      await database.run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hash, user.id]);
      await database.run('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);
      return jsonResponse(200, { message: 'Password reset successfully' });
    }

    // ME
    if (action === 'me') {
      const user = await authenticate(event);
      if (!user) return errorResponse(401, 'User not found');
      return jsonResponse(200, { user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.email_verified, totpEnabled: user.totp_enabled || false } });
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
      await database.run('UPDATE users SET totp_enabled = ?, backup_codes = ? WHERE id = ?', [true, storedCodes, user.id]);
      
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
      const userData = await database.get('SELECT password_hash FROM users WHERE id = ?', [user.id]);
      const valid = await bcrypt.compare(password, userData.password_hash);
      
      if (!valid) {
        return errorResponse(401, 'Invalid password');
      }
      
      // Disable 2FA
      await database.run('UPDATE users SET totp_enabled = ?, totp_secret = NULL, backup_codes = NULL WHERE id = ?', [false, user.id]);
      
      return jsonResponse(200, { message: '2FA disabled successfully' });
    }

    // 2FA REGENERATE BACKUP CODES - Generate new backup codes
    if (action === '2fa-regenerate-codes') {
      const user = await authenticate(event);
      if (!user) return errorResponse(401, 'Authentication required');
      
      const { password } = payload;
      if (!password) return errorResponse(400, 'Password required');
      
      // Verify password
      const userData = await database.get('SELECT password_hash, totp_enabled FROM users WHERE id = ?', [user.id]);
      
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

    return errorResponse(400, 'Unknown auth action');
  } catch (error) {
    console.error('Auth function error', error);
    return errorResponse(500, 'Internal server error');
  }
});

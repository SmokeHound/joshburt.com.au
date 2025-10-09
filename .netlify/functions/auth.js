const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodeCrypto = require('crypto');
const { database } = require('../../config/database');
const { corsHeaders, json: jsonResponse, error: errorResponse, parseBody, authenticate } = require('../../utils/http');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
  const tokenHash = nodeCrypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await database.run('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [userId, tokenHash, expiresAt.toISOString()]);
};

// In-memory rate limiter (per cold start container). Basic protection for login brute force.
const rateBuckets = {};
function rateLimit(key, limit = 5, windowMs = 5 * 60 * 1000) {
  const now = Date.now();
  if (!rateBuckets[key]) rateBuckets[key] = [];
  // purge old
  rateBuckets[key] = rateBuckets[key].filter(ts => now - ts < windowMs);
  if (rateBuckets[key].length >= limit) return false;
  rateBuckets[key].push(now);
  return true;
}

// authenticate now provided by shared helper

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
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
      const { email, password } = payload;
      if (!email || !password) return errorResponse(400, 'Invalid email or password format');
      // Basic rate limiting by IP + action
      const ip = (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'unknown';
      const rlKey = `login:${ip}`;
      if (!rateLimit(rlKey, 5, 5 * 60 * 1000)) {
        return errorResponse(429, 'Too many login attempts. Please wait a few minutes and try again.');
      }
      const user = await database.get('SELECT id, email, name, password_hash, role, is_active, email_verified, failed_login_attempts, lockout_expires FROM users WHERE email = ?', [email]);
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
      if (user.failed_login_attempts > 0 || user.lockout_expires) {
        await database.run('UPDATE users SET failed_login_attempts = 0, lockout_expires = NULL WHERE id = ?', [user.id]);
      }
      const { accessToken, refreshToken } = generateTokens(user.id);
      await storeRefreshToken(user.id, refreshToken);
      return jsonResponse(200, { message: 'Login successful', user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.email_verified }, accessToken, refreshToken });
    }

    // REFRESH
    if (action === 'refresh') {
      const { refreshToken } = payload;
      if (!refreshToken) return errorResponse(401, 'Refresh token required');
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        if (decoded.type !== 'refresh') return errorResponse(401, 'Invalid token type');
        const tokenHash = nodeCrypto.createHash('sha256').update(refreshToken).digest('hex');
        const tokenRecord = await database.get('SELECT user_id FROM refresh_tokens WHERE token_hash = ? AND expires_at > datetime("now")', [tokenHash]);
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
      await database.run('DELETE FROM refresh_tokens WHERE expires_at <= datetime("now")');
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
      return jsonResponse(200, { user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.email_verified } });
    }

    return errorResponse(400, 'Unknown auth action');
  } catch (error) {
    console.error('Auth function error', error);
    return errorResponse(500, 'Internal server error');
  }
};

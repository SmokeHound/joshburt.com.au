const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createHash, randomBytes } = require('node:crypto');

const { database, initializeDatabase } = require('../../config/database');
const { json: jsonResponse, error: errorResponse, parseBody, authenticate } = require('../../utils/http');
const { withHandler } = require('../../utils/fn');
const { logAudit } = require('../../utils/audit');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

let dbReady = false;
async function ensureDb() {
  if (!dbReady) {
    await initializeDatabase();
    dbReady = true;
  }
}

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { accessToken, refreshToken };
}

async function storeRefreshToken(userId, refreshToken) {
  const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await database.run('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [userId, tokenHash, expiresAt.toISOString()]);
}

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

exports.handler = withHandler(async (event) => {
  await ensureDb();

  // action from query or body
  let action = (event.queryStringParameters && event.queryStringParameters.action) || '';
  let payload = parseBody(event) || {};
  if (!action && payload.action) action = payload.action;
  const method = event.httpMethod;

  try {
    // REGISTER
    if (action === 'register' || (method === 'POST' && event.path && event.path.endsWith('/auth/register'))) {
      const { email, password, name } = payload;
      if (!email || !password || !name) return jsonResponse(400, { error: 'Missing email, password or name' });
      const existing = await database.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) return jsonResponse(409, { error: 'User already exists with this email' });
      const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
      const passwordHash = await bcrypt.hash(password, rounds);
      const verificationToken = randomBytes(32).toString('hex');
      const verificationExpires = Date.now() + 24*60*60*1000; // 24h
      const result = await database.run(
        'INSERT INTO users (email, name, password_hash, role, email_verified, email_verification_token, email_verification_expires) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [email, name, passwordHash, 'user', 0, verificationToken, verificationExpires]
      );
      // Audit (best-effort)
      await logAudit(event, { action: 'auth.register', userId: result.id, details: { email } });
      return jsonResponse(201, { message: 'Registered. Verify email.', userId: result.id });
    }

    // VERIFY EMAIL
    if (action === 'verify-email') {
      const { token } = event.queryStringParameters || {};
      if (!token) return jsonResponse(400, { error: 'Missing verification token' });
      const u = await database.get('SELECT id, email_verification_expires FROM users WHERE email_verification_token = ?', [token]);
      if (!u) return jsonResponse(400, { error: 'Invalid or expired verification token' });
      if (u.email_verification_expires && u.email_verification_expires < Date.now()) return jsonResponse(400, { error: 'Verification token expired' });
      await database.run('UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?', [u.id]);
      await logAudit(event, { action: 'auth.verify_email', userId: u.id });
      return jsonResponse(200, { message: 'Email verified' });
    }

    // LOGIN
    if (action === 'login' || (method === 'POST' && event.path && event.path.endsWith('/auth/login'))) {
      const { email, password } = payload;
      if (!email || !password) return jsonResponse(400, { error: 'Invalid email or password format' });
      const ip = (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'unknown';
      const rlKey = `login:${ip}`;
      if (!rateLimit(rlKey, 5, 5 * 60 * 1000)) return jsonResponse(429, { error: 'Too many login attempts. Please wait a few minutes and try again.' });

      const user = await database.get('SELECT id, email, name, password_hash, role, is_active, email_verified, failed_login_attempts, lockout_expires FROM users WHERE email = ?', [email]);
      if (!user || !user.is_active) {
        await logAudit(event, { action: 'auth.login_failed', details: { email } });
        return jsonResponse(401, { error: 'Invalid credentials' });
      }
      if (user.lockout_expires && user.lockout_expires > Date.now()) {
        const minutes = Math.ceil((user.lockout_expires - Date.now())/60000);
        return jsonResponse(403, { error: `Account locked. Try again in ${minutes} minute(s).` });
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      const MAX_ATTEMPTS = 5; const LOCKOUT_MINUTES = 15;
      if (!valid) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        let lockout = null; if (attempts >= MAX_ATTEMPTS) lockout = Date.now() + LOCKOUT_MINUTES*60000;
        await database.run('UPDATE users SET failed_login_attempts = ?, lockout_expires = ? WHERE id = ?', [attempts, lockout, user.id]);
        if (lockout) {
          await logAudit(event, { action: 'auth.login_locked', userId: user.id, details: { email } });
          return jsonResponse(403, { error: `Account locked due to too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.` });
        }
        await logAudit(event, { action: 'auth.login_failed', userId: user.id, details: { email } });
        return jsonResponse(401, { error: `Invalid credentials. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.` });
      }
      if (user.failed_login_attempts > 0 || user.lockout_expires) {
        await database.run('UPDATE users SET failed_login_attempts = 0, lockout_expires = NULL WHERE id = ?', [user.id]);
      }
      const { accessToken, refreshToken } = generateTokens(user.id);
      await storeRefreshToken(user.id, refreshToken);
      await logAudit(event, { action: 'auth.login_success', userId: user.id });
      return jsonResponse(200, { message: 'Login successful', user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.email_verified }, accessToken, refreshToken });
    }

    // REFRESH
    if (action === 'refresh') {
      const { refreshToken } = payload;
      if (!refreshToken) return jsonResponse(401, { error: 'Refresh token required' });
      try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        if (decoded.type !== 'refresh') return jsonResponse(401, { error: 'Invalid token type' });
        const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
        const nowIso = new Date().toISOString();
        const tokenRecord = await database.get('SELECT user_id FROM refresh_tokens WHERE token_hash = ? AND expires_at > ?', [tokenHash, nowIso]);
        if (!tokenRecord) return jsonResponse(401, { error: 'Invalid or expired refresh token' });
        const user = await database.get('SELECT id, is_active FROM users WHERE id = ?', [tokenRecord.user_id]);
        if (!user || !user.is_active) return jsonResponse(401, { error: 'User not found or inactive' });
        const tokens = generateTokens(user.id);
        await storeRefreshToken(user.id, tokens.refreshToken);
        await database.run('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
        await logAudit(event, { action: 'auth.refresh_success', userId: user.id, details: { message: 'Tokens refreshed' } });

        return jsonResponse(200, { message: 'Tokens refreshed', accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      } catch (e) {
        // Attempt to audit failure (best-effort) with any available context
        let possibleUserId = null;
        try { const maybe = jwt.decode(refreshToken); if (maybe && maybe.userId) possibleUserId = maybe.userId; } catch(_) { /* noop */ }
        await logAudit(event, { action: 'auth.refresh_failed', userId: possibleUserId, details: { message: 'Token refresh failed', error: (e && e.message) ? e.message : String(e) } });
        return jsonResponse(401, { error: 'Token refresh failed' });
      }
    }

    // LOGOUT
    if (action === 'logout') {
      const { refreshToken } = payload || {};
      if (refreshToken) {
        const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
        await database.run('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
      }
      const nowIso = new Date().toISOString();
      await database.run('DELETE FROM refresh_tokens WHERE expires_at <= ?', [nowIso]);
      // Audit logout (best-effort)
      let possibleUserId = null;
      try { const maybe = jwt.decode(refreshToken); if (maybe && maybe.userId) possibleUserId = maybe.userId; } catch(_) { /* noop */ }
      await logAudit(event, { action: 'auth.logout', userId: possibleUserId });
      return jsonResponse(200, { message: 'Logged out successfully' });
    }

    // FORGOT PASSWORD (always 200)
    if (action === 'forgot-password') {
      const { email } = payload;
      if (email) {
        const user = await database.get('SELECT id, name FROM users WHERE email = ?', [email]);
        if (user) {
          const resetToken = randomBytes(32).toString('hex');
          const resetTokenExpires = Date.now() + 3600000; // 1h
          await database.run('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [resetToken, resetTokenExpires, user.id]);
          // Email sending omitted
        }
      }
      return jsonResponse(200, { message: 'If account exists, reset link sent.' });
    }

    // RESET PASSWORD
    if (action === 'reset-password') {
      const { token, password } = payload;
      if (!token || !password) return jsonResponse(400, { error: 'Invalid token or password format' });
      const user = await database.get('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?', [token, Date.now()]);
      if (!user) return jsonResponse(400, { error: 'Invalid or expired reset token' });
      const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
      const hash = await bcrypt.hash(password, rounds);
      await database.run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hash, user.id]);
      await logAudit(event, { action: 'auth.reset_password', userId: user.id });
      await database.run('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);
      return jsonResponse(200, { message: 'Password reset successfully' });
    }

    // ME
    if (action === 'me') {
      const user = await authenticate(event);
      if (!user) return jsonResponse(401, { error: 'User not found' });
      return jsonResponse(200, { user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.email_verified } });
    }

    return jsonResponse(400, { error: 'Unknown auth action' });
  } catch (error) {
    console.error('Auth function error', error);
    return errorResponse(500, 'Internal server error');
  }
});

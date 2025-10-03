const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const { database } = require('../config/database');
const { authenticateToken, auditLog } = require('../middleware/auth');
const { sendResetEmail } = require('../utils/email');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate JWT token
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

// Store refresh token in database
const storeRefreshToken = async (userId, refreshToken) => {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await database.run(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt.toISOString()]
  );
};


// POST /api/auth/register
router.post('/register', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body('name').trim().isLength({ min: 2, max: 50 }),
], auditLog('user_register'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await database.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h

    // Create user (email_verified=0)
    const result = await database.run(
      'INSERT INTO users (email, name, password_hash, role, email_verified, email_verification_token, email_verification_expires) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email, name, passwordHash, 'user', 0, verificationToken, verificationExpires]
    );

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:8000'}/verify-email.html?token=${verificationToken}`;
    try {
      const { sendVerificationEmail } = require('../utils/email');
      await sendVerificationEmail(email, name, verificationUrl);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
    }

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      userId: result.id,
      email,
      name
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/auth/verify-email?token=...
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Missing verification token' });
    }
    // Find user by token
    const user = await database.get('SELECT id, email_verification_expires FROM users WHERE email_verification_token = ?', [token]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    if (user.email_verification_expires && user.email_verification_expires < Date.now()) {
      return res.status(400).json({ error: 'Verification token expired' });
    }
    // Mark as verified
    await database.run('UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?', [user.id]);
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});


// POST /api/auth/login (with account lockout)
router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], auditLog('user_login'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid email or password format'
      });
    }

    const { email, password } = req.body;
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    // Get user from database (include lockout fields)
    const user = await database.get(
      'SELECT id, email, name, password_hash, role, is_active, email_verified, failed_login_attempts, lockout_expires FROM users WHERE email = ?',
      [email]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check for lockout
    if (user.lockout_expires && user.lockout_expires > Date.now()) {
      const minutes = Math.ceil((user.lockout_expires - Date.now()) / 60000);
      return res.status(403).json({ error: `Account locked. Try again in ${minutes} minute(s).` });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      // Increment failed attempts
      const attempts = (user.failed_login_attempts || 0) + 1;
      let lockout_expires = null;
      if (attempts >= MAX_ATTEMPTS) {
        lockout_expires = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
      }
      await database.run(
        'UPDATE users SET failed_login_attempts = ?, lockout_expires = ? WHERE id = ?',
        [attempts, lockout_expires, user.id]
      );
      if (lockout_expires) {
        return res.status(403).json({ error: `Account locked due to too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.` });
      }
      return res.status(401).json({ error: `Invalid credentials. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.` });
    }

    // Reset failed attempts on success
    if (user.failed_login_attempts > 0 || user.lockout_expires) {
      await database.run(
        'UPDATE users SET failed_login_attempts = 0, lockout_expires = NULL WHERE id = ?',
        [user.id]
      );
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);
    await storeRefreshToken(user.id, refreshToken);

    res.json({
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

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Check if refresh token exists in database
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenRecord = await database.get(
      'SELECT user_id FROM refresh_tokens WHERE token_hash = ? AND expires_at > datetime("now")',
      [tokenHash]
    );

    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Get user
    const user = await database.get(
      'SELECT id, email, name, role, is_active FROM users WHERE id = ?',
      [tokenRecord.user_id]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Generate new tokens
    const tokens = generateTokens(user.id);
    await storeRefreshToken(user.id, tokens.refreshToken);

    // Clean up old refresh token
    await database.run('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);

    res.json({
      message: 'Tokens refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, auditLog('user_logout'), async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await database.run('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
    }

    // Clean up expired tokens
    await database.run('DELETE FROM refresh_tokens WHERE expires_at <= datetime("now")');

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, [
  body('email').isEmail().normalizeEmail(),
], auditLog('password_reset_request'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    const { email } = req.body;

    // Check if user exists
    const user = await database.get('SELECT id, name FROM users WHERE email = ?', [email]);

    // Always return success to prevent email enumeration
    res.json({ 
      message: 'If an account with that email exists, a reset link has been sent.'
    });

    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = Date.now() + 3600000; // 1 hour

      await database.run(
        'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
        [resetToken, resetTokenExpires, user.id]
      );

      // Send reset email
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8000'}/reset-password.html?token=${resetToken}`;
      
      try {
        await sendResetEmail(email, user.name, resetUrl);
  // ...existing code...
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
      }
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
], auditLog('password_reset_complete'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid token or password format',
        details: errors.array()
      });
    }

    const { token, password } = req.body;

    // Find user by reset token
    const user = await database.get(
      'SELECT id, email FROM users WHERE reset_token = ? AND reset_token_expires > ?',
      [token, Date.now()]
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    await database.run(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [passwordHash, user.id]
    );

    // Invalidate all refresh tokens for this user
    await database.run('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await database.get(
      'SELECT id, email, name, role, email_verified, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.email_verified,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

module.exports = router;
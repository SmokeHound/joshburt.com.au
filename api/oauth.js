const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const jwt = require('jsonwebtoken');

const { database } = require('../config/database');

const router = express.Router();

// Configure Passport strategies
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const name = profile.displayName;
      const avatarUrl = profile.photos[0]?.value;

      // Check if user exists
      let user = await database.get('SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?', 
        ['google', profile.id]);

      if (!user) {
        // Check if user exists with same email
        user = await database.get('SELECT * FROM users WHERE email = ?', [email]);
        
        if (user) {
          // Link OAuth account to existing user
          await database.run(
            'UPDATE users SET oauth_provider = ?, oauth_id = ?, avatar_url = ? WHERE id = ?',
            ['google', profile.id, avatarUrl, user.id]
          );
        } else {
          // Create new user
          const result = await database.run(
            'INSERT INTO users (email, name, oauth_provider, oauth_id, avatar_url, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [email, name, 'google', profile.id, avatarUrl, 'user', 1]
          );
          
          user = await database.get('SELECT * FROM users WHERE id = ?', [result.id]);
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "/api/auth/github/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || profile.username;
      const avatarUrl = profile.photos?.[0]?.value;

      if (!email) {
        return done(new Error('No email provided by GitHub'), null);
      }

      // Check if user exists
      let user = await database.get('SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?', 
        ['github', profile.id]);

      if (!user) {
        // Check if user exists with same email
        user = await database.get('SELECT * FROM users WHERE email = ?', [email]);
        
        if (user) {
          // Link OAuth account to existing user
          await database.run(
            'UPDATE users SET oauth_provider = ?, oauth_id = ?, avatar_url = ? WHERE id = ?',
            ['github', profile.id, avatarUrl, user.id]
          );
        } else {
          // Create new user
          const result = await database.run(
            'INSERT INTO users (email, name, oauth_provider, oauth_id, avatar_url, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [email, name, 'github', profile.id, avatarUrl, 'user', 1]
          );
          
          user = await database.get('SELECT * FROM users WHERE id = ?', [result.id]);
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Initialize Passport
router.use(passport.initialize());

// Generate JWT tokens for OAuth users
const generateTokensForUser = (userId) => {
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

// Store refresh token
const storeRefreshToken = async (userId, refreshToken) => {
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await database.run(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt.toISOString()]
  );
};

// OAuth Routes
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: 'Google OAuth not configured' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user) => {
    if (err) {
      console.error('Google OAuth error:', err);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8000'}/login.html?error=oauth_failed`);
    }

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8000'}/login.html?error=oauth_cancelled`);
    }

    try {
      // Generate tokens
      const { accessToken, refreshToken } = generateTokensForUser(user.id);
      await storeRefreshToken(user.id, refreshToken);

      // Redirect with tokens (in production, use secure cookies or redirect to a page that stores tokens)
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:8000'}/oauth-success.html?token=${accessToken}&refresh=${refreshToken}`;
      res.redirect(redirectUrl);

    } catch (error) {
      console.error('Token generation error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8000'}/login.html?error=token_failed`);
    }
  })(req, res, next);
});

router.get('/github', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.status(501).json({ error: 'GitHub OAuth not configured' });
  }
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', { session: false }, async (err, user) => {
    if (err) {
      console.error('GitHub OAuth error:', err);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8000'}/login.html?error=oauth_failed`);
    }

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8000'}/login.html?error=oauth_cancelled`);
    }

    try {
      // Generate tokens
      const { accessToken, refreshToken } = generateTokensForUser(user.id);
      await storeRefreshToken(user.id, refreshToken);

      // Redirect with tokens
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:8000'}/oauth-success.html?token=${accessToken}&refresh=${refreshToken}`;
      res.redirect(redirectUrl);

    } catch (error) {
      console.error('Token generation error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8000'}/login.html?error=token_failed`);
    }
  })(req, res, next);
});

module.exports = router;
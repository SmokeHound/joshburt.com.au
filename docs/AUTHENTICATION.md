# Authentication System

Complete guide to authentication and security in joshburt.com.au.

## Table of Contents

- [Overview](#overview)
- [Authentication Methods](#authentication-methods)
- [JWT Implementation](#jwt-implementation)
- [Role-Based Access Control](#role-based-access-control)
- [Two-Factor Authentication](#two-factor-authentication)
- [OAuth Integration](#oauth-integration)
- [Security Best Practices](#security-best-practices)
- [Password Management](#password-management)

---

## Overview

### Authentication Strategy

**Primary**: JWT (JSON Web Tokens) with refresh token rotation

**Optional**: Auth0 OAuth for social login (Google, GitHub, etc.)

**Security Features**:
- Password hashing (bcrypt, 12 rounds)
- Optional 2FA (TOTP)
- Rate limiting (5 failed attempts per 15 minutes)
- Refresh token rotation
- Session tracking (last_login)

---

## Authentication Methods

### Email/Password Login

**Endpoint**: `POST /.netlify/functions/auth?action=login`

**Flow**:
```
1. User submits email + password
2. Backend queries users table for email
3. Backend compares password with bcrypt hash
4. If 2FA enabled, require TOTP code
5. Generate access token (JWT, 7 days)
6. Generate refresh token (random, hashed, 30 days)
7. Store refresh token in database
8. Return tokens + user object
9. Log audit event (user:login)
```

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "totpCode": "123456"  // Required if 2FA enabled
}
```

**Response** (`200 OK`):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "abc123def456...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "manager",
    "avatarUrl": "/assets/images/avatars/avatar1.svg",
    "totpEnabled": true
  }
}
```

**Errors**:
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: 2FA required, account locked
- `429 Too Many Requests`: Rate limit exceeded

---

### Registration

**Endpoint**: `POST /.netlify/functions/auth?action=register`

**Flow**:
```
1. User submits email, password, name
2. Backend validates email uniqueness
3. Backend validates password strength
4. Backend hashes password with bcrypt (12 rounds)
5. Backend creates user record (role: 'mechanic' default)
6. Generate tokens
7. Return tokens + user object
8. Log audit event (user:register)
```

**Request**:
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123",
  "name": "Jane Smith"
}
```

**Response** (`201 Created`):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "abc123def456...",
  "user": {
    "id": 2,
    "email": "newuser@example.com",
    "name": "Jane Smith",
    "role": "mechanic"
  }
}
```

**Errors**:
- `400 Bad Request`: Weak password, invalid email format
- `409 Conflict`: Email already registered

---

### Token Refresh

**Endpoint**: `POST /.netlify/functions/auth?action=refresh`

**Flow**:
```
1. Client sends refresh token
2. Backend verifies token exists in database
3. Backend checks expiration
4. Generate new access token
5. Optionally rotate refresh token (security best practice)
6. Return new access token
```

**Request**:
```json
{
  "refreshToken": "abc123def456..."
}
```

**Response** (`200 OK`):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:
- `401 Unauthorized`: Invalid or expired refresh token

**Frontend Implementation**:
```javascript
// Auto-refresh before token expires
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('/.netlify/functions/auth?action=refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  const { accessToken } = await response.json();
  localStorage.setItem('accessToken', accessToken);
  
  return accessToken;
};

// Call every 6 days (before 7-day expiry)
setInterval(refreshAccessToken, 6 * 24 * 60 * 60 * 1000);
```

---

### Logout

**Endpoint**: `POST /.netlify/functions/auth?action=logout`

**Flow**:
```
1. Client sends refresh token
2. Backend deletes token from database (invalidates)
3. Return success
4. Client clears localStorage
```

**Request**:
```json
{
  "refreshToken": "abc123def456..."
}
```

**Response** (`200 OK`):
```json
{
  "message": "Logged out successfully"
}
```

**Frontend Implementation**:
```javascript
const logout = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  await fetch('/.netlify/functions/auth?action=logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  // Clear local storage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  
  // Redirect to login
  window.location.href = '/login.html';
};
```

---

## JWT Implementation

### Token Structure

**Access Token** (JWT):

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": 1,
    "email": "user@example.com",
    "role": "manager",
    "iat": 1699876543,
    "exp": 1700481343
  },
  "signature": "..."
}
```

**Generation** (`utils/auth.js`):

```javascript
const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};
```

**Verification** (`utils/http.js`):

```javascript
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
};
```

### Token Storage

| Token | Storage | Lifetime | Usage |
|-------|---------|----------|-------|
| **Access Token** | `localStorage.accessToken` | 7 days | API authentication |
| **Refresh Token** | `localStorage.refreshToken` + DB | 30 days | Renew access token |

**Security Note**: For production, consider HTTP-only cookies for refresh tokens to prevent XSS attacks.

---

## Role-Based Access Control

### Roles

| Role | Level | Permissions |
|------|-------|-------------|
| **mechanic** | 1 | Read products/consumables/filters, create/read own orders |
| **manager** | 2 | mechanic + create/update products, view all users, manage orders |
| **admin** | 3 | Full access including delete operations, site settings, audit logs |

### Permission Matrix

**Defined in** `utils/rbac.js`:

```javascript
const permissions = {
  mechanic: {
    products: ['read'],
    consumables: ['read'],
    filters: ['read'],
    orders: ['read', 'create']
  },
  manager: {
    products: ['read', 'create', 'update'],
    consumables: ['read', 'create', 'update'],
    filters: ['read', 'create', 'update'],
    users: ['read'],
    orders: ['read', 'create', 'update'],
    inventory: ['read', 'update'],
    settings: ['read']
  },
  admin: {
    '*': ['*']  // All permissions on all resources
  }
};

const hasPermission = (role, resource, action) => {
  // Check wildcard for admin
  if (permissions[role]?.['*']?.includes('*')) return true;
  
  // Check specific resource permission
  return permissions[role]?.[resource]?.includes(action) || false;
};

module.exports = { hasPermission };
```

### Enforcement

**Middleware** `requirePermission` in `utils/http.js`:

```javascript
const requirePermission = async (event, resource, action) => {
  // Extract JWT from Authorization header
  const token = event.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('Unauthorized: No token provided');
  }
  
  // Verify JWT
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // Check RBAC permissions
  if (!hasPermission(decoded.role, resource, action)) {
    throw new Error('Forbidden: Insufficient permissions');
  }
  
  // Return decoded user info
  return decoded;
};
```

**Usage in Functions**:

```javascript
// netlify/functions/products.js
const { withHandler } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');

exports.handler = withHandler(async (event) => {
  if (event.httpMethod === 'POST') {
    // Require manager+ to create products
    await requirePermission(event, 'products', 'create');
    
    // Create product logic...
  }
  
  if (event.httpMethod === 'GET') {
    // All authenticated users can read
    await requirePermission(event, 'products', 'read');
    
    // List products logic...
  }
});
```

---

## Two-Factor Authentication

### TOTP Implementation

**Library**: `speakeasy` (Time-based One-Time Password)

**Authenticator Apps**: Google Authenticator, Authy, 1Password, etc.

### Setup Flow

#### 1. Generate Secret

**Endpoint**: `POST /.netlify/functions/auth?action=2fa-setup`

**Backend**:
```javascript
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// Generate secret
const secret = speakeasy.generateSecret({
  name: 'Josh Burt Workshop (user@example.com)'
});

// Generate QR code
const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

// Store secret temporarily (not enabled yet)
await pool.query(
  'UPDATE users SET totp_secret = $1 WHERE id = $2',
  [secret.base32, userId]
);

return {
  secret: secret.base32,
  qrCode: qrCodeDataURL
};
```

**Response**:
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBOR..."
}
```

#### 2. User Scans QR Code

User scans QR code with authenticator app, which generates 6-digit codes every 30 seconds.

#### 3. Enable 2FA

**Endpoint**: `POST /.netlify/functions/auth?action=2fa-enable`

**Request**:
```json
{
  "totpCode": "123456"
}
```

**Backend Verification**:
```javascript
const verified = speakeasy.totp.verify({
  secret: user.totp_secret,
  encoding: 'base32',
  token: totpCode,
  window: 1  // Allow 30s window for clock drift
});

if (!verified) {
  throw new Error('Invalid TOTP code');
}

// Enable 2FA
await pool.query(
  'UPDATE users SET totp_enabled = TRUE WHERE id = $1',
  [userId]
);
```

**Response**:
```json
{
  "message": "2FA enabled successfully"
}
```

### Login with 2FA

**Modified Login Flow**:
```
1. User submits email + password
2. Backend verifies credentials
3. Backend checks if totp_enabled = TRUE
4. If TRUE, require totpCode in request
5. Verify TOTP code with speakeasy
6. If valid, generate tokens
7. Return tokens
```

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "totpCode": "654321"
}
```

### Disable 2FA

**Endpoint**: `POST /.netlify/functions/auth?action=2fa-disable`

**Backend**:
```javascript
await pool.query(
  'UPDATE users SET totp_enabled = FALSE, totp_secret = NULL WHERE id = $1',
  [userId]
);
```

---

## OAuth Integration

### Auth0 Setup (Optional)

#### 1. Create Auth0 Application

1. Sign up at [Auth0](https://auth0.com/)
2. Create new application (Single Page Application)
3. Configure:
   - **Allowed Callback URLs**: `https://joshburt.netlify.app/oauth-success.html`
   - **Allowed Logout URLs**: `https://joshburt.netlify.app/login.html`
   - **Allowed Web Origins**: `https://joshburt.netlify.app`

#### 2. Environment Variables

```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=abc123def456
AUTH0_AUDIENCE=https://your-api-identifier
```

#### 3. Frontend Implementation

**File**: `assets/js/auth0.js`

```javascript
import { Auth0Client } from '@auth0/auth0-spa-js';

const auth0 = new Auth0Client({
  domain: AUTH0_DOMAIN,
  client_id: AUTH0_CLIENT_ID,
  audience: AUTH0_AUDIENCE,
  redirect_uri: window.location.origin + '/oauth-success.html'
});

// Login with redirect
const loginWithAuth0 = async () => {
  await auth0.loginWithRedirect();
};

// Handle callback
const handleCallback = async () => {
  const result = await auth0.handleRedirectCallback();
  const user = await auth0.getUser();
  const token = await auth0.getTokenSilently();
  
  // Exchange Auth0 token for backend JWT
  const response = await fetch('/.netlify/functions/auth?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth0Token: token,
      email: user.email,
      name: user.name
    })
  });
  
  const { accessToken } = await response.json();
  localStorage.setItem('accessToken', accessToken);
  
  window.location.href = '/administration.html';
};
```

**OAuth Success Page**: `oauth-success.html`

```html
<!DOCTYPE html>
<html>
<body>
  <script type="module">
    import { handleCallback } from '/assets/js/auth0.js';
    handleCallback();
  </script>
</body>
</html>
```

---

## Security Best Practices

### Password Requirements

**Enforced Client + Server**:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (optional but recommended)

**Validation** (`utils/password.js`):

```javascript
const validatePassword = (password) => {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain number');
  }
  
  return true;
};
```

### Rate Limiting

**Failed Login Attempts**: Max 5 per email per 15 minutes

**Implementation** (`netlify/functions/auth.js`):

```javascript
// Check recent failed attempts
const recentAttempts = await pool.query(
  `SELECT COUNT(*) FROM login_attempts 
   WHERE email = $1 AND attempt_time > NOW() - INTERVAL '15 minutes'`,
  [email]
);

if (parseInt(recentAttempts.rows[0].count) >= 5) {
  return error(429, 'Too many login attempts. Try again in 15 minutes.');
}

// Log failed attempt
if (loginFailed) {
  await pool.query(
    'INSERT INTO login_attempts (email, ip_address) VALUES ($1, $2)',
    [email, ipAddress]
  );
}
```

**Cleanup**: Purge old attempts periodically

```sql
DELETE FROM login_attempts WHERE attempt_time < NOW() - INTERVAL '24 hours';
```

### Token Security

**JWT Secret**:
- Minimum 32 characters
- Cryptographically random
- Never commit to Git
- Rotate periodically (invalidates all tokens)

**Refresh Token**:
- Hashed before storage (bcrypt)
- One-time use (rotate on refresh)
- Stored in database for revocation
- Expired tokens pruned via `scripts/prune-refresh-tokens.js`

### HTTPS Only

**Netlify**: Automatic HTTPS with free SSL certificates

**Redirect HTTP → HTTPS** (`netlify.toml`):

```toml
[[redirects]]
  from = "http://joshburt.netlify.app/*"
  to = "https://joshburt.netlify.app/:splat"
  status = 301
  force = true
```

---

## Password Management

### Password Reset Flow

#### 1. Request Reset

**Endpoint**: `POST /.netlify/functions/auth?action=forgot-password`

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Backend**:
```javascript
// Generate reset token (random, 32 chars)
const resetToken = crypto.randomBytes(32).toString('hex');
const resetTokenHash = await bcrypt.hash(resetToken, 12);
const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

// Store token
await pool.query(
  'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
  [resetTokenHash, expiresAt, email]
);

// Send email
await sendEmail(email, {
  subject: 'Password Reset',
  body: `Reset link: https://joshburt.netlify.app/reset-password.html?token=${resetToken}`
});
```

#### 2. Reset Password

**Endpoint**: `POST /.netlify/functions/auth?action=reset-password`

**Request**:
```json
{
  "token": "abc123def456...",
  "newPassword": "NewSecurePass789"
}
```

**Backend**:
```javascript
// Find user by valid token
const user = await pool.query(
  `SELECT * FROM users 
   WHERE reset_token_expires > NOW()`,
  []
);

// Verify token matches
const valid = await bcrypt.compare(token, user.reset_token);

if (!valid) {
  throw new Error('Invalid or expired reset token');
}

// Update password
const passwordHash = await bcrypt.hash(newPassword, 12);
await pool.query(
  `UPDATE users 
   SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL 
   WHERE id = $2`,
  [passwordHash, user.id]
);
```

---

## Support

- **Auth0 Docs**: https://auth0.com/docs/
- **JWT.io**: https://jwt.io/ (decode/verify tokens)
- **TOTP RFC**: https://tools.ietf.org/html/rfc6238

---

**Last Updated**: 2025-11-11  
**Maintained By**: Development Team

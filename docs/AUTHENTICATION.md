# Authentication and Authorization System

This document describes the authentication and authorization system implemented for joshburt.com.au.

## Overview

The system implements a comprehensive Role-Based Access Control (RBAC) system with three user roles, secure password requirements, JWT-based authentication, and role-based permissions across all API endpoints.

## User Roles

The system supports three distinct user roles with different permission levels:

### 1. Admin
- **Full system access**
- Can create, read, update, and delete all resources
- Can manage users (create, update roles, delete)
- Can view and manage audit logs
- Can configure system settings
- Can approve/reject orders
- Can manage products, consumables, and inventory

### 2. Manager
- **Content management and user viewing**
- Can create, read, and update most content (products, consumables, orders)
- Can view users but cannot create or delete them
- Can approve/reject orders
- Can manage inventory
- Cannot access system settings or audit logs
- Cannot modify user roles or account status

### 3. User
- **Basic read and create access**
- Can read products and consumables
- Can create orders
- Cannot view other users
- Cannot modify products or consumables
- Cannot view or manage inventory
- Cannot access admin functions

## Password Requirements

All passwords must meet the following security requirements:

- **Minimum 8 characters long**
- **At least one uppercase letter** (A-Z)
- **At least one lowercase letter** (a-z)
- **At least one number** (0-9)
- **At least one special character** (!@#$%^&*(),.?":{}|<>)

Password validation is enforced during:
- User registration
- Password reset
- Admin user creation

## Authentication Flow

### Registration
1. User provides email, name, and password
2. System validates password strength
3. Password is hashed using bcrypt (12 rounds by default)
4. Verification token is generated
5. User account is created with `email_verified = false`
6. Verification email sent (when email service configured)

### Login
1. User provides email and password
2. System validates credentials
3. Checks account status (is_active, lockout status)
4. Generates JWT access token (7-day expiry) and refresh token (30-day expiry)
5. Returns tokens and user information

### Token Refresh
1. Client provides refresh token
2. System validates token and checks expiry
3. Generates new access and refresh tokens
4. Invalidates old refresh token

### Logout
1. Client provides refresh token
2. System deletes refresh token from database
3. Client should discard local tokens

## Authorization

### Permission System

Permissions are defined in `utils/rbac.js` for each resource and action combination:

```javascript
PERMISSIONS = {
  users: {
    create: ['admin'],
    read: ['admin', 'manager'],
    update: ['admin'],
    delete: ['admin'],
    list: ['admin', 'manager'],
    stats: ['admin', 'manager']
  },
  products: {
    create: ['admin', 'manager'],
    read: ['admin', 'manager', 'user'],
    update: ['admin', 'manager'],
    delete: ['admin'],
    list: ['admin', 'manager', 'user']
  },
  // ... more resources
}
```

### Using Authorization

#### In Function Handlers

```javascript
const { requirePermission } = require('../../utils/http');

// Require specific permission
const { user, response: authResponse } = await requirePermission(event, 'products', 'create');
if (authResponse) return authResponse;

// User is now authenticated and authorized
// Proceed with operation
```

#### In Frontend

```javascript
// Check if user has permission
import { hasPermission } from './utils/rbac';

if (hasPermission(user, 'products', 'create')) {
  // Show create button
}
```

## API Endpoints

All protected endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Authentication Endpoints

- `POST /netlify/functions/auth?action=register` - Register new user
- `POST /netlify/functions/auth?action=login` - Login
- `POST /netlify/functions/auth?action=refresh` - Refresh tokens
- `POST /netlify/functions/auth?action=logout` - Logout
- `GET /netlify/functions/auth?action=me` - Get current user
- `POST /netlify/functions/auth?action=forgot-password` - Request password reset
- `POST /netlify/functions/auth?action=reset-password` - Reset password
- `GET /netlify/functions/auth?action=verify-email` - Verify email

### Protected Endpoints

All of the following require authentication:

#### Users (Admin/Manager)
- `GET /netlify/functions/users` - List users (admin, manager)
- `POST /netlify/functions/users` - Create user (admin only)
- `GET /netlify/functions/users/{id}` - Get user by ID (admin, manager)
- `PUT /netlify/functions/users/{id}` - Update user (admin, or self)
- `DELETE /netlify/functions/users/{id}` - Delete user (admin only)
- `GET /netlify/functions/users/stats/overview` - User statistics (admin, manager)

**Note**: The `{id}` in the path represents the user ID as part of the URL path, parsed by the function handler.

#### Products (All authenticated users can read)
- `GET /netlify/functions/products` - List products (all)
- `POST /netlify/functions/products` - Create product (admin, manager)
- `PUT /netlify/functions/products` - Update product (admin, manager)
- `DELETE /netlify/functions/products` - Delete product (admin)

#### Orders (All authenticated users can create)
- `GET /netlify/functions/orders` - List orders (admin, manager)
- `POST /netlify/functions/orders` - Create order (all)
- `PATCH /netlify/functions/orders` - Approve/reject order (admin, manager)

#### Consumables (All authenticated users can read)
- `GET /netlify/functions/consumables` - List consumables (all)
- `POST /netlify/functions/consumables` - Create consumable (admin, manager)
- `PUT /netlify/functions/consumables` - Update consumable (admin, manager)
- `DELETE /netlify/functions/consumables` - Delete consumable (admin)

#### Other Endpoints
- `GET /netlify/functions/consumable-categories` - List categories (all)
- `GET /netlify/functions/inventory` - View inventory (admin, manager)
- `GET /netlify/functions/audit-logs` - View audit logs (admin only)
- `GET /netlify/functions/settings` - View settings (admin only)
- `PUT /netlify/functions/settings` - Update settings (admin only)

## Security Features

### Password Security
- Bcrypt hashing with configurable rounds (default: 12)
- Strong password requirements enforced
- Password complexity validation

### Account Security
- Failed login tracking
- Automatic account lockout after 5 failed attempts
- 15-minute lockout duration
- Email verification support

### Token Security
- JWT tokens with configurable expiry
- Refresh token rotation
- Secure token storage in database (hashed)
- Automatic cleanup of expired tokens

### Rate Limiting
- In-memory rate limiting for login attempts
- 5 attempts per 5 minutes per IP address

## Default Users

The system creates default users for testing and initial setup. **These should only be used in development:**

- **Admin**: admin@joshburt.com.au / (generated strong password)
- **Test User**: test@example.com / (generated strong password)
- **Test Manager**: manager@example.com / (generated strong password)

**⚠️ CRITICAL SECURITY WARNING**: 
- Change ALL default passwords immediately in production
- Consider disabling default user creation in production via environment variable
- Use environment variables to set initial admin credentials securely
- Delete test users in production environments

## Environment Variables

Configure the following environment variables:

```env
# JWT Configuration (REQUIRED - Generate a strong random secret)
JWT_SECRET=use-a-cryptographically-secure-random-string-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Password Hashing
BCRYPT_ROUNDS=12

# Database (REQUIRED)
DB_TYPE=postgres
DATABASE_URL=postgres://user:pass@host/db

# Email (optional - for password reset and verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@joshburt.com.au

# OAuth (optional - Auth0 integration)
# Note: OAuth users are auto-provisioned and use JWT tokens after OAuth login
# The system supports both traditional login and OAuth side-by-side
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_AUDIENCE=optional-api-audience
AUTH0_AUTO_PROVISION=true  # Auto-create user accounts from OAuth
```

**To generate a secure JWT_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Testing

### Run Tests

```bash
# Run all function tests
npm run test:functions

# Run RBAC tests specifically
node tests/functions/rbac.test.js

# Run handler tests
node tests/functions/handlers.test.js
```

### Test Coverage

- ✅ User registration with password validation
- ✅ User login with credentials
- ✅ Token refresh
- ✅ Permission checking for all roles
- ✅ Protected endpoint access control
- ✅ Password strength requirements
- ✅ Role-based access to resources

## Migration from Old System

If migrating from an existing system:

1. **Update default user passwords** to meet new requirements
2. **Run password validation** on existing user passwords
3. **Assign roles** to existing users (default: 'user')
4. **Test authentication** with new system
5. **Update frontend** to use new token-based auth
6. **Remove old authentication** code

## Troubleshooting

### "Invalid credentials" error
- Check email and password
- Verify account is active (`is_active = true`)
- Check if account is locked (`lockout_expires`)

### "Insufficient permissions" error
- Verify user role
- Check permission requirements for endpoint
- Ensure token is valid and not expired

### "Password does not meet requirements" error
- Password must be at least 8 characters
- Must contain uppercase, lowercase, number, and special character
- Try: `MyPassword123!`

### Token expired
- Use refresh token to get new access token
- If refresh token expired, re-login required

## Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** (httpOnly cookies preferred)
3. **Implement token refresh** before expiry
4. **Never log passwords** or tokens
5. **Use environment variables** for secrets
6. **Rotate JWT_SECRET** periodically
7. **Monitor failed login attempts**
8. **Implement proper logout** (clear tokens)
9. **Use role checks** in frontend UI
10. **Test permissions** thoroughly

## Future Enhancements

- [ ] Two-factor authentication (2FA)
- [ ] OAuth integration (Google, GitHub)
- [ ] Session management dashboard
- [ ] Password history (prevent reuse)
- [ ] Advanced rate limiting (Redis-based)
- [ ] Audit log frontend viewer
- [ ] Role-based UI hiding/showing
- [ ] Permission-based feature flags
- [ ] API key authentication for services
- [ ] RBAC policy management UI

## Support

For issues or questions:
- Check documentation in `/docs`
- Review test files in `/tests/functions`
- Check environment variables
- Verify database connectivity
- Review audit logs for debugging

---

**Last Updated**: October 2025
**Version**: 1.0.0

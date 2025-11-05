# API Documentation

This document provides comprehensive documentation for all API endpoints in the joshburt.com.au application.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Common Response Patterns](#common-response-patterns)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Health & Status](#health--status)
  - [Authentication & Users](#authentication--users)
  - [Products](#products)
  - [Orders](#orders)
  - [Consumables](#consumables)
  - [Inventory](#inventory)
  - [Settings](#settings)
  - [Audit Logs](#audit-logs)

---

## Overview

All API endpoints are implemented as Netlify serverless functions located at `/netlify/functions/`.

### Base URL
- **Production**: `https://joshburt.com.au/netlify/functions/`
- **Development**: `http://localhost:8888/netlify/functions/`

### Content Type
All endpoints accept and return `application/json` unless otherwise specified.

### CORS
All endpoints support CORS with appropriate headers. OPTIONS requests return 204 status.

---

## Authentication

Most endpoints require authentication via JWT (JSON Web Token) passed in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Types
- **Access Token**: Short-lived token (7 days default) for API access
- **Refresh Token**: Long-lived token (30 days default) for obtaining new access tokens

### Role-Based Access Control (RBAC)

The system supports three roles with hierarchical permissions:

1. **admin**: Full system access
2. **manager**: Content management and user viewing
3. **user**: Basic access, read-only for most resources

See `utils/rbac.js` for detailed permission definitions.

---

## Common Response Patterns

### Success Response
```json
{
  "data": { ... },
  "message": "Success message"
}
```

### Paginated Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": { ... }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (OPTIONS) |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 405 | Method Not Allowed |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

---

## Endpoints

### Health & Status

#### GET /health
Check service health and database connectivity.

**Authentication**: None required

**Response**: 200 OK
```json
{
  "status": "healthy",
  "time": "2024-01-01T00:00:00.000Z",
  "uptimeSeconds": 12345,
  "db": {
    "ok": true,
    "driver": "postgresql"
  },
  "version": "1.0.0",
  "latencyMs": 5
}
```

#### GET /public-stats
Get anonymous aggregate statistics.

**Authentication**: None required

**Response**: 200 OK
```json
{
  "users": 100,
  "orders": 250,
  "products": 50
}
```

---

### Authentication & Users

#### POST /auth?action=register
Register a new user account.

**Authentication**: None required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*(),.?":{}|<>)

**Response**: 201 Created
```json
{
  "message": "Registered. Verify email.",
  "userId": 123
}
```

**Errors**:
- 400: Missing required fields or password does not meet requirements
- 409: User already exists with this email

---

#### POST /auth?action=verify-email
Verify email address with token sent during registration.

**Authentication**: None required

**Query Parameters**:
- `token` (required): Email verification token

**Response**: 200 OK
```json
{
  "message": "Email verified successfully"
}
```

**Errors**:
- 400: Invalid or expired verification token

---

#### POST /auth?action=login
Authenticate user and receive access tokens.

**Authentication**: None required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response**: 200 OK
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

**Rate Limiting**: 5 attempts per 5 minutes per IP

**Errors**:
- 400: Missing email or password
- 401: Invalid credentials
- 403: Email not verified
- 429: Too many login attempts

---

#### POST /auth?action=refresh
Refresh access token using refresh token.

**Authentication**: Refresh token required

**Request Body**:
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response**: 200 OK
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

**Note**: Implements token rotation - old refresh token is invalidated

---

#### POST /auth?action=logout
Invalidate refresh token.

**Authentication**: Required

**Request Body**:
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response**: 200 OK
```json
{
  "message": "Logged out"
}
```

---

#### GET /auth?action=me
Get current authenticated user profile.

**Authentication**: Required

**Response**: 200 OK
```json
{
  "id": 123,
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "email_verified": true,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

#### POST /auth?action=forgot-password
Request password reset email.

**Authentication**: None required

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**: 200 OK
```json
{
  "message": "Password reset email sent"
}
```

---

#### POST /auth?action=reset-password
Reset password using token from email.

**Authentication**: None required

**Request Body**:
```json
{
  "token": "reset-token-here",
  "newPassword": "NewSecurePass123!"
}
```

**Response**: 200 OK
```json
{
  "message": "Password reset successfully"
}
```

---

#### GET /users
List users with pagination and filtering.

**Authentication**: Required (admin or manager role)

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)
- `search` (optional): Search by name or email
- `role` (optional): Filter by role (admin, manager, user)

**Response**: 200 OK
```json
{
  "users": [
    {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

---

#### POST /users
Create a new user.

**Authentication**: Required (admin role only)

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "name": "Jane Doe",
  "role": "user"
}
```

**Response**: 201 Created
```json
{
  "message": "User created",
  "userId": 124
}
```

---

#### GET /users/:id
Get specific user by ID.

**Authentication**: Required (admin/manager for any user, users can view their own profile)

**Response**: 200 OK
```json
{
  "id": 123,
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "is_active": true,
  "email_verified": true,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

#### PUT /users/:id
Update user information.

**Authentication**: Required (admin for any user, users can update their own profile except role/is_active)

**Request Body**:
```json
{
  "name": "John Updated",
  "email": "newemail@example.com",
  "role": "manager",
  "is_active": false
}
```

**Response**: 200 OK
```json
{
  "message": "User updated"
}
```

---

#### DELETE /users/:id
Delete a user.

**Authentication**: Required (admin role only)

**Response**: 200 OK
```json
{
  "message": "User deleted"
}
```

**Errors**:
- 403: Cannot delete yourself

---

#### GET /users/stats/overview
Get user statistics.

**Authentication**: Required (admin or manager role)

**Response**: 200 OK
```json
{
  "total": 100,
  "active": 95,
  "byRole": {
    "admin": 5,
    "manager": 10,
    "user": 85
  },
  "recentSignups": 15
}
```

---

### Products

#### GET /products
List all products with optional filtering.

**Authentication**: Required

**Query Parameters**:
- `type` (optional): Filter by product type

**Response**: 200 OK
```json
{
  "products": [
    {
      "id": 1,
      "name": "Castrol EDGE 5W-30",
      "code": "CE-5W30",
      "type": "oil",
      "specs": "Fully synthetic",
      "description": "Advanced engine oil",
      "image": "url-to-image",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### POST /products
Create a new product.

**Authentication**: Required (admin or manager role)

**Request Body**:
```json
{
  "name": "Castrol EDGE 5W-30",
  "code": "CE-5W30",
  "type": "oil",
  "specs": "Fully synthetic",
  "description": "Advanced engine oil",
  "image": "url-to-image"
}
```

**Response**: 201 Created
```json
{
  "message": "Product created",
  "productId": 1
}
```

---

#### PUT /products
Update an existing product.

**Authentication**: Required (admin or manager role)

**Request Body**:
```json
{
  "id": 1,
  "name": "Updated Product Name",
  "code": "UP-123",
  "type": "oil",
  "specs": "Updated specs",
  "description": "Updated description",
  "image": "new-url"
}
```

**Response**: 200 OK
```json
{
  "message": "Product updated"
}
```

---

#### DELETE /products
Delete a product.

**Authentication**: Required (admin role only)

**Request Body**:
```json
{
  "id": 1
}
```

**Response**: 200 OK
```json
{
  "message": "Product deleted"
}
```

---

### Orders

#### GET /orders
List orders with pagination.

**Authentication**: Required (admin or manager role)

**Query Parameters**:
- `page` (optional): Page number
- `limit` (optional): Results per page (default: 50)

**Response**: 200 OK
```json
{
  "orders": [
    {
      "id": 1,
      "requested_by": "John Doe",
      "status": "pending",
      "created_at": "2024-01-01T00:00:00.000Z",
      "items": [
        {
          "name": "Castrol EDGE 5W-30",
          "code": "CE-5W30",
          "quantity": 2
        }
      ]
    }
  ]
}
```

---

#### POST /orders
Create a new order.

**Authentication**: Required

**Request Body**:
```json
{
  "items": [
    {
      "name": "Castrol EDGE 5W-30",
      "code": "CE-5W30",
      "quantity": 2
    }
  ],
  "requestedBy": "John Doe"
}
```

**Response**: 201 Created
```json
{
  "orderId": 1
}
```

---

#### PATCH /orders
Update order status.

**Authentication**: Required (admin or manager role)

**Request Body**:
```json
{
  "orderId": 1,
  "status": "approved"
}
```

**Valid Statuses**: pending, approved, rejected, completed

**Response**: 200 OK
```json
{
  "message": "Order updated"
}
```

---

### Consumables

#### GET /consumables
List consumables with optional filtering.

**Authentication**: Required

**Query Parameters**:
- `type` (optional): Filter by type
- `category` (optional): Filter by category

**Response**: 200 OK
```json
{
  "consumables": [
    {
      "id": 1,
      "name": "Oil Filter",
      "type": "filter",
      "category": "engine",
      "code": "OF-123",
      "description": "Engine oil filter"
    }
  ]
}
```

---

#### POST /consumables
Create a new consumable.

**Authentication**: Required (admin or manager role)

**Request Body**:
```json
{
  "name": "Oil Filter",
  "type": "filter",
  "category": "engine",
  "code": "OF-123",
  "description": "Engine oil filter"
}
```

**Response**: 201 Created
```json
{
  "message": "Consumable created",
  "consumableId": 1
}
```

---

#### PUT /consumables
Update a consumable.

**Authentication**: Required (admin or manager role)

**Request Body**:
```json
{
  "id": 1,
  "name": "Updated Filter",
  "type": "filter",
  "category": "engine",
  "code": "OF-123",
  "description": "Updated description"
}
```

**Response**: 200 OK
```json
{
  "message": "Consumable updated"
}
```

---

#### DELETE /consumables
Delete a consumable.

**Authentication**: Required (admin role only)

**Request Body**:
```json
{
  "id": 1
}
```

**Response**: 200 OK
```json
{
  "message": "Consumable deleted"
}
```

---

#### GET /consumable-categories
Get distinct categories from consumables.

**Authentication**: Required

**Response**: 200 OK
```json
{
  "categories": ["engine", "transmission", "brake", "suspension"]
}
```

---

### Inventory

#### GET /inventory
Get inventory items (PostgreSQL only).

**Authentication**: Required (admin or manager role)

**Response**: 200 OK
```json
{
  "inventory": [
    {
      "id": 1,
      "item_name": "Oil Filter",
      "quantity": 50,
      "location": "Warehouse A"
    }
  ]
}
```

---

### Settings

#### GET /settings
Get application settings.

**Authentication**: Required (admin role only)

**Response**: 200 OK
```json
{
  "theme": "dark",
  "maintenanceMode": false,
  "customSettings": { ... }
}
```

---

#### PUT /settings
Update application settings.

**Authentication**: Required (admin role only)

**Request Body**:
```json
{
  "theme": "light",
  "maintenanceMode": false,
  "customSettings": { ... }
}
```

**Response**: 200 OK
```json
{
  "message": "Settings updated"
}
```

---

### Audit Logs

#### GET /audit-logs
Query audit logs with filtering.

**Authentication**: Required (admin role only)

**Query Parameters**:
- `userId` (optional): Filter by user ID
- `action` (optional): Filter by action type
- `startDate` (optional): Filter by start date (ISO 8601)
- `endDate` (optional): Filter by end date (ISO 8601)
- `q` (optional): Free-text search
- `page` (optional): Page number
- `limit` (optional): Results per page
- `format` (optional): Response format (json or csv)

**Response**: 200 OK (JSON)
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "action": "user.login",
      "details": "Login successful",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000
  }
}
```

**Response**: 200 OK (CSV)
```
id,user_id,action,details,ip_address,user_agent,timestamp
1,123,user.login,Login successful,192.168.1.1,Mozilla/5.0...,2024-01-01T00:00:00.000Z
```

---

#### POST /audit-logs
Create an audit log entry.

**Authentication**: Required

**Request Body**:
```json
{
  "action": "user.login",
  "userId": 123,
  "details": "Login successful",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

**Response**: 201 Created
```json
{
  "message": "Audit log created"
}
```

---

#### DELETE /audit-logs
Delete old audit logs.

**Authentication**: Required (admin role only)

**Query Parameters**:
- `olderThanDays` (optional): Delete logs older than N days

**Response**: 200 OK
```json
{
  "message": "Audit logs deleted",
  "deleted": 100
}
```

---

## Rate Limiting

Basic rate limiting is implemented for sensitive endpoints:

- **Login**: 5 attempts per 5 minutes per IP
- Other endpoints: No specific rate limits (handled by Netlify)

---

## Pagination

Most list endpoints support pagination with these query parameters:

- `page`: Page number (minimum: 1, default: 1)
- `limit`: Results per page (minimum: 1, maximum: 100, default: varies by endpoint)

Response includes pagination metadata:
```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## Security Considerations

1. **Authentication**: JWT tokens expire after 7 days (access) / 30 days (refresh)
2. **Password Requirements**: Enforced strong password policy
3. **RBAC**: Role-based access control for all sensitive operations
4. **Rate Limiting**: Basic protection against brute force attacks
5. **Token Rotation**: Refresh tokens are rotated on use
6. **Audit Logging**: All significant actions are logged
7. **SQL Injection**: Parameterized queries prevent SQL injection
8. **XSS Protection**: JSON responses with proper content-type headers

---

## Development

### Environment Variables

Required:
- `JWT_SECRET`: Secret key for JWT token signing
- `DB_TYPE`: Database type (postgresql only)
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: PostgreSQL connection details

Optional:
- `BCRYPT_ROUNDS`: BCrypt hashing rounds (default: 12)
- `JWT_EXPIRES_IN`: Access token expiration (default: 7d)
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration (default: 30d)
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_AUDIENCE`: Auth0 configuration
- `AUTH0_AUTO_PROVISION`: Auto-provision Auth0 users (default: true)

### Testing

Run tests:
```bash
npm test                # Run all Jest tests
npm run test:coverage   # Run tests with coverage
npm run test:functions  # Run smoke tests for functions
```

### Local Development

```bash
# Start static site
npm run dev

# Start Netlify functions
npm run dev:functions

# Run health check
npm run health
```

---

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial API documentation
- All endpoints documented with request/response examples
- Authentication and RBAC documented
- Security considerations added

---

## Support

For issues or questions:
- GitHub: https://github.com/SmokeHound/joshburt.com.au
- Email: Contact repository owner


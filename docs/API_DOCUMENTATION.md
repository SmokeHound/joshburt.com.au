# API Documentation# API Documentation

Complete reference for all Netlify Function endpoints in joshburt.com.au.This document provides comprehensive documentation for all API endpoints in the joshburt.com.au application.

## Table of Contents## Table of Contents

- [Overview](#overview)- [Overview](#overview)

- [Authentication](#authentication)- [Authentication](#authentication)

- [Response Patterns](#response-patterns)- [Common Response Patterns](#common-response-patterns)

- [Error Codes](#error-codes)- [Error Handling](#error-handling)

- [Endpoints](#endpoints)- [Endpoints](#endpoints)
  - [Public Endpoints](#public-endpoints) - [Health & Status](#health--status)

  - [Authentication](#authentication-endpoints) - [Authentication & Users](#authentication--users)

  - [Users](#users) - [Products](#products)

  - [Products](#products) - [Orders](#orders)

  - [Orders](#orders) - [Consumables](#consumables)

  - [Settings](#settings) - [Inventory](#inventory)

  - [Audit Logs](#audit-logs) - [Settings](#settings)

  - [Notifications](#notifications) - [Audit Logs](#audit-logs)

---

## Overview## Overview

### Base URLAll API endpoints are implemented as Netlify serverless functions located at `/.netlify/functions/`.

| Environment | URL |### Base URL

|-------------|-----|- **Production**: `https://joshburt.com.au/.netlify/functions/`

| **Production** | `https://joshburt.netlify.app/.netlify/functions` |- **Development**: `http://localhost:8888/.netlify/functions/`

| **Local** | `http://localhost:8888/.netlify/functions` |

### Content Type

### Request FormatAll endpoints accept and return `application/json` unless otherwise specified.

- **Content-Type**: `application/json`### CORS

- **Authorization**: `Bearer <access_token>` (most endpoints)All endpoints support CORS with appropriate headers. OPTIONS requests return 204 status.

- **CORS**: Enabled with preflight support

---

### JavaScript Usage

## Authentication

````javascript

const FN_BASE = window.FN_BASE || '/.netlify/functions';Most endpoints require authentication via JWT (JSON Web Token) passed in the `Authorization` header:



// Authenticated request```

const response = await fetch(`${FN_BASE}/products`, {Authorization: Bearer <your-jwt-token>

  headers: {```

    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,

    'Content-Type': 'application/json'### Token Types

  }- **Access Token**: Short-lived token (7 days default) for API access

});- **Refresh Token**: Long-lived token (30 days default) for obtaining new access tokens



const data = await response.json();### Role-Based Access Control (RBAC)

````

The system supports three roles with hierarchical permissions:

---

1. **admin**: Full system access

## Authentication2. **manager**: Content management and user viewing

3. **user**: Basic access, read-only for most resources

### JWT Tokens

See `utils/rbac.js` for detailed permission definitions.

All authenticated endpoints require a JWT access token in the `Authorization` header:

---

```

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...## Common Response Patterns

```

### Success Response

### Token Lifecycle```json

{

| Token Type | Lifetime | Storage | Purpose | "data": { ... },

|------------|----------|---------|---------| "message": "Success message"

| **Access Token** | 7 days | `localStorage.accessToken` | API authentication |}

| **Refresh Token** | 30 days | HTTP-only cookie or DB | Renew access tokens |```

### Role-Based Access Control (RBAC)### Paginated Response

```json

| Role | Permissions |{

|------|-------------|  "data": [...],

| **mechanic** | Read products, create/read orders |  "pagination": {

| **manager** | mechanic + create/update products, view users |    "page": 1,

| **admin** | Full access including delete operations |    "limit": 10,

    "total": 100,

**Permission enforcement**: Via `requirePermission(event, resource, action)` in `utils/http.js`    "totalPages": 10

  }

---}

```

## Response Patterns

### Error Response

### Success Response```json

{

**Status**: `200 OK` "error": "Error message",

"details": { ... }

````json}

{```

  "data": { ... },

  "message": "Operation successful"---

}

```## Error Handling



### Paginated Response### HTTP Status Codes



**Status**: `200 OK`| Code | Meaning |

|------|---------|

```json| 200 | Success |

{| 201 | Created |

  "data": [...],| 204 | No Content (OPTIONS) |

  "pagination": {| 400 | Bad Request - Invalid input |

    "page": 1,| 401 | Unauthorized - Authentication required |

    "limit": 20,| 403 | Forbidden - Insufficient permissions |

    "total": 150,| 404 | Not Found |

    "totalPages": 8| 405 | Method Not Allowed |

  }| 409 | Conflict - Resource already exists |

}| 500 | Internal Server Error |

````

---

### Error Response

## Endpoints

**Status**: `400`/`401`/`403`/`404`/`500`

### Health & Status

```json

{#### GET /health

  "error": "Error message",Check service health and database connectivity.

  "details": "Additional context"

}**Authentication**: None required

```

**Response**: 200 OK

---```json

{

## Error Codes "status": "healthy",

"time": "2024-01-01T00:00:00.000Z",

| Status | Meaning | Common Causes | "uptimeSeconds": 12345,

|--------|---------|---------------| "db": {

| `400` | Bad Request | Invalid input, missing required fields | "ok": true,

| `401` | Unauthorized | Missing/invalid/expired token | "driver": "postgresql"

| `403` | Forbidden | Insufficient permissions for action | },

| `404` | Not Found | Resource doesn't exist | "version": "1.0.0",

| `409` | Conflict | Duplicate resource (e.g., email already exists) | "latencyMs": 5

| `500` | Internal Server Error | Database error, unexpected exception |}

````

---

#### GET /public-stats

## EndpointsGet anonymous aggregate statistics.



### Public Endpoints**Authentication**: None required



#### Health Check**Response**: 200 OK

```json

**GET** `/.netlify/functions/health`{

  "users": 100,

Check database connectivity and system health.  "orders": 250,

  "products": 50

**Auth**: None required}

````

**Response**: `200 OK`

```json---

{

  "status": "healthy",### Authentication & Users

  "database": "connected",

  "timestamp": "2025-11-11T10:30:00.000Z"#### POST /auth?action=register

}Register a new user account.

```

**Authentication**: None required

---

**Request Body**:

#### Public Configuration```json

{

**GET** `/.netlify/functions/public-config` "email": "user@example.com",

"password": "SecurePass123!",

Get public configuration (e.g., Auth0 status, feature flags). "name": "John Doe"

}

**Auth**: None required```

**Response**: `200 OK`**Password Requirements**:

`````json- Minimum 8 characters

{- At least one uppercase letter

  "auth0Enabled": true,- At least one lowercase letter

  "registrationEnabled": true,- At least one number

  "maintenanceMode": false- At least one special character (!@#$%^&*(),.?":{}|<>)

}

```**Response**: 201 Created

```json

---{

  "message": "Registered. Verify email.",

#### Public Stats  "userId": 123

}

**GET** `/.netlify/functions/public-stats````



Get public statistics (user count, product count, etc.).**Errors**:

- 400: Missing required fields or password does not meet requirements

**Auth**: None required- 409: User already exists with this email



**Response**: `200 OK`---

```json

{#### POST /auth?action=verify-email

  "totalUsers": 142,Verify email address with token sent during registration.

  "totalProducts": 87,

  "totalOrders": 523**Authentication**: None required

}

```**Query Parameters**:

- `token` (required): Email verification token

---

**Response**: 200 OK

### Authentication Endpoints```json

{

**Endpoint**: `/.netlify/functions/auth`  "message": "Email verified successfully"

}

Multi-action authentication endpoint. Use `?action={action}` query param or `{ action: "..." }` in request body.```



---**Errors**:

- 400: Invalid or expired verification token

#### Login

---

**POST** `/.netlify/functions/auth?action=login`

#### POST /auth?action=login

Authenticate user with email/password or Auth0 OAuth.Authenticate user and receive access tokens.



**Request Body**:**Authentication**: None required

```json

{**Request Body**:

  "email": "user@example.com",```json

  "password": "SecurePass123",{

  "totpCode": "123456"  // Optional, if 2FA enabled  "email": "user@example.com",

}  "password": "SecurePass123!"

```}

`````

**Response**: `200 OK`

````json**Response**: 200 OK

{```json

  "accessToken": "eyJhbG...",{

  "refreshToken": "dGVz...",  "accessToken": "eyJhbGc...",

  "user": {  "refreshToken": "eyJhbGc...",

    "id": 1,  "user": {

    "email": "user@example.com",    "id": 123,

    "name": "John Doe",    "email": "user@example.com",

    "role": "manager",    "name": "John Doe",

    "avatarUrl": "/assets/images/avatars/avatar1.svg"    "role": "user"

  }  }

}}

````

**Errors**:**Rate Limiting**: 5 attempts per 5 minutes per IP

- `401`: Invalid credentials

- `403`: 2FA required or account locked**Errors**:

- `429`: Too many login attempts- 400: Missing email or password

- 401: Invalid credentials

---- 403: Email not verified

- 429: Too many login attempts

#### Register

---

**POST** `/.netlify/functions/auth?action=register`

#### POST /auth?action=refresh

Create new user account.Refresh access token using refresh token.

**Request Body**:**Authentication**: Refresh token required

````json

{**Request Body**:

  "email": "newuser@example.com",```json

  "password": "SecurePass123",{

  "name": "Jane Smith"  "refreshToken": "eyJhbGc..."

}}

````

**Response**: `201 Created`**Response**: 200 OK

`json`json

{{

"accessToken": "eyJhbG...", "accessToken": "eyJhbGc...",

"refreshToken": "dGVz...", "refreshToken": "eyJhbGc..."

"user": {}

    "id": 2,```

    "email": "newuser@example.com",

    "name": "Jane Smith",**Note**: Implements token rotation - old refresh token is invalidated

    "role": "mechanic"

}---

}

`````#### POST /auth?action=logout

Invalidate refresh token.

---

**Authentication**: Required

#### Refresh Token

**Request Body**:

**POST** `/.netlify/functions/auth?action=refresh````json

{

Get new access token using refresh token.  "refreshToken": "eyJhbGc..."

}

**Request Body**:```

```json

{**Response**: 200 OK

  "refreshToken": "dGVz..."```json

}{

```  "message": "Logged out"

}

**Response**: `200 OK````

```json

{---

  "accessToken": "eyJhbG..."

}#### GET /auth?action=me

```Get current authenticated user profile.



---**Authentication**: Required



#### Get Current User**Response**: 200 OK

```json

**GET** `/.netlify/functions/auth?action=me`{

  "id": 123,

Get authenticated user's profile.  "email": "user@example.com",

  "name": "John Doe",

**Auth**: Required (Bearer token)  "role": "user",

  "email_verified": true,

**Response**: `200 OK`  "is_active": true,

```json  "created_at": "2024-01-01T00:00:00.000Z"

{}

  "id": 1,```

  "email": "user@example.com",

  "name": "John Doe",---

  "role": "manager",

  "avatarUrl": "/assets/images/avatars/avatar1.svg",#### POST /auth?action=forgot-password

  "totpEnabled": false,Request password reset email.

  "createdAt": "2025-01-15T08:30:00.000Z"

}**Authentication**: None required

`````

**Request Body**:

---```json

{

### Users "email": "user@example.com"

}

**Endpoint**: `/.netlify/functions/users````

---**Response**: 200 OK

```json

#### List Users{

  "message": "Password reset email sent"

**GET** `/.netlify/functions/users`}

```

Get all users (paginated).

---

**Auth**: Required (manager+)

#### POST /auth?action=reset-password

**Query Parameters**:Reset password using token from email.

- `page` (optional, default: 1)

- `limit` (optional, default: 20)**Authentication**: None required

- `role` (optional): Filter by role

**Request Body**:

**Response**: `200 OK````json

````json{

{  "token": "reset-token-here",

  "data": [  "newPassword": "NewSecurePass123!"

    {}

      "id": 1,```

      "email": "user@example.com",

      "name": "John Doe",**Response**: 200 OK

      "role": "manager",```json

      "avatarUrl": "/assets/images/avatars/avatar1.svg",{

      "createdAt": "2025-01-15T08:30:00.000Z"  "message": "Password reset successfully"

    }}

  ],```

  "pagination": {

    "page": 1,---

    "limit": 20,

    "total": 45,#### GET /users

    "totalPages": 3List users with pagination and filtering.

  }

}**Authentication**: Required (admin or manager role)

````

**Query Parameters**:

---- `page` (optional): Page number (default: 1)

- `limit` (optional): Results per page (default: 10, max: 100)

#### Create User- `search` (optional): Search by name or email

- `role` (optional): Filter by role (admin, manager, user)

**POST** `/.netlify/functions/users`

**Response**: 200 OK

Create new user (admin only).```json

{

**Auth**: Required (admin) "users": [

    {

**Request Body**: "id": 123,

`````json "email": "user@example.com",

{      "name": "John Doe",

  "email": "newuser@example.com",      "role": "user",

  "name": "Jane Smith",      "is_active": true,

  "password": "SecurePass123",      "created_at": "2024-01-01T00:00:00.000Z"

  "role": "mechanic"    }

}  ],

```  "pagination": {

    "page": 1,

**Response**: `201 Created`    "limit": 10,

```json    "total": 100

{  }

  "id": 2,}

  "email": "newuser@example.com",```

  "name": "Jane Smith",

  "role": "mechanic"---

}

```#### POST /users

Create a new user.

---

**Authentication**: Required (admin role only)

#### Update User

**Request Body**:

**PUT** `/.netlify/functions/users````json

{

Update user details.  "email": "newuser@example.com",

  "password": "SecurePass123!",

**Auth**: Required (manager+ or self)  "name": "Jane Doe",

  "role": "user"

**Request Body**:}

```json```

{

  "id": 2,**Response**: 201 Created

  "name": "Jane Smith Updated",```json

  "role": "manager"{

}  "message": "User created",

```  "userId": 124

}

**Response**: `200 OK````

```json

{---

  "message": "User updated successfully",

  "data": { ... }#### GET /users/:id

}Get specific user by ID.

`````

**Authentication**: Required (admin/manager for any user, users can view their own profile)

---

**Response**: 200 OK

### Products```json

{

**Endpoint**: `/.netlify/functions/products` "id": 123,

"email": "user@example.com",

Similar structure for `/consumables` and `/filters` endpoints. "name": "John Doe",

"role": "user",

--- "is_active": true,

"email_verified": true,

#### List Products "created_at": "2024-01-01T00:00:00.000Z"

}

**GET** `/.netlify/functions/products````

Get all products (paginated).---

**Auth**: Required#### PUT /users/:id

Update user information.

**Query Parameters**:

- `page` (optional, default: 1)**Authentication**: Required (admin for any user, users can update their own profile except role/is_active)

- `limit` (optional, default: 20)

- `category` (optional): Filter by category ID**Request Body**:

- `search` (optional): Full-text search```json

{

**Response**: `200 OK` "name": "John Updated",

`````json "email": "newemail@example.com",

{  "role": "manager",

  "data": [  "is_active": false

    {}

      "id": 1,```

      "name": "15W-40 Mineral Oil",

      "code": "OIL-15W40-MIN",**Response**: 200 OK

      "type": "oil",```json

      "viscosity": "15W-40",{

      "stockQuantity": 120,  "message": "User updated"

      "isActive": true}

    }```

  ],

  "pagination": { ... }---

}

```#### DELETE /users/:id

Delete a user.

---

**Authentication**: Required (admin role only)

### Orders

**Response**: 200 OK

**Endpoint**: `/.netlify/functions/orders````json

{

---  "message": "User deleted"

}

#### List Orders```



**GET** `/.netlify/functions/orders`**Errors**:

- 403: Cannot delete yourself

Get all orders (paginated).

---

**Auth**: Required

#### GET /users/stats/overview

**Query Parameters**:Get user statistics.

- `page`, `limit`: Pagination

- `status`: Filter by status (pending, confirmed, shipped, delivered, cancelled)**Authentication**: Required (admin or manager role)

- `userId`: Filter by user (own orders for non-admins)

**Response**: 200 OK

**Response**: `200 OK````json

```json{

{  "total": 100,

  "data": [  "active": 95,

    {  "byRole": {

      "id": 1,    "admin": 5,

      "userId": 1,    "manager": 10,

      "status": "confirmed",    "user": 85

      "trackingNumber": "TRACK-12345",  },

      "estimatedDelivery": "2025-11-15",  "recentSignups": 15

      "createdAt": "2025-11-10T10:00:00.000Z",}

      "items": [```

        {

          "productId": 1,---

          "productName": "15W-40 Mineral Oil",

          "quantity": 10,### Products

          "pricePerUnit": 8.50

        }#### GET /products

      ]List all products with optional filtering.

    }

  ],**Authentication**: Required

  "pagination": { ... }

}**Query Parameters**:

```- `type` (optional): Filter by product type



---**Response**: 200 OK

```json

#### Create Order{

  "products": [

**POST** `/.netlify/functions/orders`    {

      "id": 1,

Create new order.      "name": "Castrol EDGE 5W-30",

      "code": "CE-5W30",

**Auth**: Required      "type": "oil",

      "specs": "Fully synthetic",

**Request Body**:      "description": "Advanced engine oil",

```json      "image": "url-to-image",

{      "created_at": "2024-01-01T00:00:00.000Z"

  "items": [    }

    {  ]

      "productId": 1,}

      "quantity": 10```

    }

  ],---

  "priority": "normal"

}#### POST /products

```Create a new product.



**Response**: `201 Created`**Authentication**: Required (admin or manager role)

```json

{**Request Body**:

  "id": 2,```json

  "status": "pending",{

  "items": [ ... ],  "name": "Castrol EDGE 5W-30",

  "createdAt": "2025-11-11T14:30:00.000Z"  "code": "CE-5W30",

}  "type": "oil",

```  "specs": "Fully synthetic",

  "description": "Advanced engine oil",

---  "image": "url-to-image"

}

### Settings```



**Endpoint**: `/.netlify/functions/settings`**Response**: 201 Created

```json

---{

  "message": "Product created",

#### Get Settings  "productId": 1

}

**GET** `/.netlify/functions/settings````



Get all site settings.---



**Auth**: Required (manager+)#### PUT /products

Update an existing product.

**Response**: `200 OK`

```json**Authentication**: Required (admin or manager role)

{

  "siteTitle": "Josh Burt Workshop",**Request Body**:

  "theme": "dark",```json

  "primaryColor": "#3b82f6",{

  "maintenanceMode": false,  "id": 1,

  "enableRegistration": true,  "name": "Updated Product Name",

  "featureFlags": {  "code": "UP-123",

    "betaFeatures": false  "type": "oil",

  }  "specs": "Updated specs",

}  "description": "Updated description",

```  "image": "new-url"

}

---```



#### Update Settings**Response**: 200 OK

```json

**PUT** `/.netlify/functions/settings`{

  "message": "Product updated"

Update site settings (admin only).}

`````

**Auth**: Required (admin)

---

**Request Body**:

````json#### DELETE /products

{Delete a product.

  "siteTitle": "Updated Title",

  "maintenanceMode": true**Authentication**: Required (admin role only)

}

```**Request Body**:

```json

**Response**: `200 OK`{

```json  "id": 1

{}

  "message": "Settings updated successfully"```

}

```**Response**: 200 OK

```json

---{

  "message": "Product deleted"

### Audit Logs}

````

**Endpoint**: `/.netlify/functions/audit-logs`

---

---

### Orders

#### List Audit Logs

#### GET /orders

**GET** `/.netlify/functions/audit-logs`List orders with pagination.

Get audit trail (admin only).**Authentication**: Required (admin or manager role)

**Auth**: Required (admin)**Query Parameters**:

- `page` (optional): Page number

**Query Parameters**:- `limit` (optional): Results per page (default: 50)

- `page`, `limit`: Pagination

- `userId`: Filter by user**Response**: 200 OK

- `action`: Filter by action type```json

{

**Response**: `200 OK` "orders": [

````json {

{      "id": 1,

  "data": [      "requested_by": "John Doe",

    {      "status": "pending",

      "id": 1,      "created_at": "2024-01-01T00:00:00.000Z",

      "userId": 1,      "items": [

      "action": "user:update",        {

      "details": "Updated user role to manager",          "name": "Castrol EDGE 5W-30",

      "ipAddress": "192.168.1.1",          "code": "CE-5W30",

      "createdAt": "2025-11-11T10:00:00.000Z"          "quantity": 2

    }        }

  ],      ]

  "pagination": { ... }    }

}  ]

```}

````

---

---

### Notifications

#### POST /orders

**Endpoint**: `/.netlify/functions/notifications`Create a new order.

---**Authentication**: Required

#### List Notifications**Request Body**:

````json

**GET** `/.netlify/functions/notifications`{

  "items": [

Get user notifications.    {

      "name": "Castrol EDGE 5W-30",

**Auth**: Required      "code": "CE-5W30",

      "quantity": 2

**Query Parameters**:    }

- `unreadOnly` (optional): boolean  ],

  "requestedBy": "John Doe"

**Response**: `200 OK`}

```json```

{

  "data": [**Response**: 201 Created

    {```json

      "id": 1,{

      "userId": 1,  "orderId": 1

      "title": "Order Shipped",}

      "message": "Your order #123 has been shipped",```

      "type": "order",

      "isRead": false,---

      "createdAt": "2025-11-11T09:00:00.000Z"

    }#### PATCH /orders

  ]Update order status.

}

```**Authentication**: Required (admin or manager role)



---**Request Body**:

```json

## Testing Endpoints{

  "orderId": 1,

### Using curl  "status": "approved"

}

```bash```

# Health check

curl https://joshburt.netlify.app/.netlify/functions/health**Valid Statuses**: pending, approved, rejected, completed



# Login**Response**: 200 OK

curl -X POST https://joshburt.netlify.app/.netlify/functions/auth?action=login \```json

  -H "Content-Type: application/json" \{

  -d '{"email":"user@example.com","password":"password123"}'  "message": "Order updated"

}

# List products (authenticated)```

curl https://joshburt.netlify.app/.netlify/functions/products \

  -H "Authorization: Bearer YOUR_TOKEN"---

````

### Consumables

### Using JavaScript

#### GET /consumables

````javascriptList consumables with optional filtering.

// Login and store token

const login = async () => {**Authentication**: Required

  const response = await fetch('/.netlify/functions/auth?action=login', {

    method: 'POST',**Query Parameters**:

    headers: { 'Content-Type': 'application/json' },- `type` (optional): Filter by type

    body: JSON.stringify({- `category` (optional): Filter by category

      email: 'user@example.com',

      password: 'password123'**Response**: 200 OK

    })```json

  });{

    "consumables": [

  const { accessToken } = await response.json();    {

  localStorage.setItem('accessToken', accessToken);      "id": 1,

};      "name": "Oil Filter",

      "type": "filter",

// Fetch protected resource      "category": "engine",

const getProducts = async () => {      "code": "OF-123",

  const response = await fetch('/.netlify/functions/products', {      "description": "Engine oil filter"

    headers: {    }

      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`  ]

    }}

  });```



  return await response.json();---

};

```#### POST /consumables

Create a new consumable.

---

**Authentication**: Required (admin or manager role)

## Rate Limiting

**Request Body**:

**Login attempts**: Max 5 failed attempts per email per 15 minutes (tracked in `login_attempts` table).```json

{

---  "name": "Oil Filter",

  "type": "filter",

## Support  "category": "engine",

  "code": "OF-123",

- **Issues**: https://github.com/SmokeHound/joshburt.com.au/issues  "description": "Engine oil filter"

- **Documentation**: https://github.com/SmokeHound/joshburt.com.au/tree/main/docs}

````

---

**Response**: 201 Created

**Last Updated**: 2025-11-11 ```json

**Maintained By**: Development Team{

"message": "Consumable created",
"consumableId": 1
}

````

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
````

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
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`: PostgreSQL connection details

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

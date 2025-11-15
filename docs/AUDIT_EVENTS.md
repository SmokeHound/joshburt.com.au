# Audit Events Reference

Comprehensive list of all audit events tracked in joshburt.com.au.

## Event Categories

- [Authentication Events](#authentication-events)
- [User Management](#user-management)
- [Product Management](#product-management)
- [Order Management](#order-management)
- [Inventory Management](#inventory-management)
- [Settings Management](#settings-management)
- [System Events](#system-events)

---

## Authentication Events

### user:login

**Description**: Successful user login

**Logged Details**:

```json
{
  "email": "user@example.com",
  "method": "password",
  "2fa": true,
  "ipAddress": "192.168.1.1"
}
```

**Triggered By**: `/auth?action=login`

---

### user:login-failed

**Description**: Failed login attempt

**Logged Details**:

```json
{
  "email": "user@example.com",
  "reason": "invalid_password",
  "ipAddress": "192.168.1.1"
}
```

**Triggered By**: `/auth?action=login` (failed)

---

### user:logout

**Description**: User logout

**Logged Details**:

```json
{
  "email": "user@example.com"
}
```

**Triggered By**: `/auth?action=logout`

---

### user:register

**Description**: New user registration

**Logged Details**:

```json
{
  "email": "newuser@example.com",
  "role": "mechanic"
}
```

**Triggered By**: `/auth?action=register`

---

### user:password-reset

**Description**: Password reset completed

**Logged Details**:

```json
{
  "email": "user@example.com",
  "method": "email_link"
}
```

**Triggered By**: `/auth?action=reset-password`

---

### user:2fa-enable

**Description**: 2FA enabled for user

**Logged Details**:

```json
{
  "userId": 123,
  "email": "user@example.com"
}
```

**Triggered By**: `/auth?action=2fa-enable`

---

### user:2fa-disable

**Description**: 2FA disabled for user

**Logged Details**:

```json
{
  "userId": 123,
  "email": "user@example.com"
}
```

**Triggered By**: `/auth?action=2fa-disable`

---

## User Management

### user:create

**Description**: Admin creates new user

**Logged Details**:

```json
{
  "createdUserId": 456,
  "email": "newuser@example.com",
  "name": "New User",
  "role": "mechanic"
}
```

**Triggered By**: `POST /users`

**Permission**: admin only

---

### user:update

**Description**: User profile updated

**Logged Details**:

```json
{
  "userId": 123,
  "changedFields": ["name", "role"],
  "oldValues": { "name": "Old Name", "role": "mechanic" },
  "newValues": { "name": "New Name", "role": "manager" }
}
```

**Triggered By**: `PUT /users/:id`

**Permission**: self or admin

---

### user:delete

**Description**: User deleted

**Logged Details**:

```json
{
  "deletedUserId": 123,
  "email": "deleted@example.com",
  "role": "mechanic"
}
```

**Triggered By**: `DELETE /users/:id`

**Permission**: admin only

---

### user:avatar-update

**Description**: User avatar updated

**Logged Details**:

```json
{
  "userId": 123,
  "avatarType": "upload",
  "fileSize": 102400
}
```

**Triggered By**: `PUT /users/:id/avatar`

---

## Product Management

### product:create

**Description**: New product created

**Logged Details**:

```json
{
  "productId": 789,
  "name": "Castrol Edge 5W-30",
  "code": "CAS-EDG-5W30",
  "type": "engine_oil",
  "categoryId": 1
}
```

**Triggered By**: `POST /products`

**Permission**: manager or admin

---

### product:update

**Description**: Product updated

**Logged Details**:

```json
{
  "productId": 789,
  "changedFields": ["price", "stock_quantity"],
  "oldValues": { "price": 49.99, "stock_quantity": 10 },
  "newValues": { "price": 54.99, "stock_quantity": 15 }
}
```

**Triggered By**: `PUT /products/:id`

**Permission**: manager or admin

---

### product:delete

**Description**: Product deleted

**Logged Details**:

```json
{
  "productId": 789,
  "name": "Castrol Edge 5W-30",
  "code": "CAS-EDG-5W30"
}
```

**Triggered By**: `DELETE /products/:id`

**Permission**: admin only

---

## Order Management

### order:create

**Description**: New order created

**Logged Details**:

```json
{
  "orderId": 101,
  "userId": 123,
  "totalItems": 3,
  "priority": "normal"
}
```

**Triggered By**: `POST /orders`

---

### order:update

**Description**: Order updated

**Logged Details**:

```json
{
  "orderId": 101,
  "changedFields": ["status"],
  "oldStatus": "pending",
  "newStatus": "in_progress"
}
```

**Triggered By**: `PUT /orders/:id`

**Permission**: manager or admin

---

### order:status-change

**Description**: Order status changed (with history)

**Logged Details**:

```json
{
  "orderId": 101,
  "oldStatus": "pending",
  "newStatus": "completed",
  "changedBy": 1
}
```

**Triggered By**: `PUT /orders/:id` (status change)

**Note**: Also creates entry in `order_status_history` table

---

### order:delete

**Description**: Order cancelled/deleted

**Logged Details**:

```json
{
  "orderId": 101,
  "reason": "Customer request",
  "status": "cancelled"
}
```

**Triggered By**: `DELETE /orders/:id`

**Permission**: manager or admin

---

## Inventory Management

### inventory:update

**Description**: Stock level changed

**Logged Details**:

```json
{
  "itemType": "product",
  "itemId": 789,
  "oldQuantity": 10,
  "newQuantity": 15,
  "reason": "manual_adjustment"
}
```

**Triggered By**: `PUT /inventory`

**Permission**: manager or admin

---

### inventory:reorder

**Description**: Reorder point triggered

**Logged Details**:

```json
{
  "itemType": "product",
  "itemId": 789,
  "itemName": "Castrol Edge 5W-30",
  "currentStock": 3,
  "reorderPoint": 5
}
```

**Triggered By**: Automatic when stock < reorder_point

---

## Settings Management

### settings:update

**Description**: Site settings changed

**Logged Details**:

```json
{
  "changedSettings": ["maintenanceMode", "featureFlags.auth0Enabled"],
  "oldValues": { "maintenanceMode": false, "featureFlags.auth0Enabled": true },
  "newValues": { "maintenanceMode": true, "featureFlags.auth0Enabled": false }
}
```

**Triggered By**: `PUT /settings`

**Permission**: admin only

---

## System Events

### system:migration

**Description**: Database migration executed

**Logged Details**:

```json
{
  "migrationName": "002_add_order_status_tracking.sql",
  "status": "success",
  "executionTime": 1234
}
```

**Triggered By**: `scripts/run-migrations.js`

---

### system:backup

**Description**: Database backup completed

**Logged Details**:

```json
{
  "backupFile": "backup-20251111.dump",
  "size": 10485760,
  "method": "pg_dump"
}
```

**Triggered By**: Backup script

---

### system:error

**Description**: Critical system error

**Logged Details**:

```json
{
  "error": "Database connection failed",
  "code": "ECONNREFUSED",
  "function": "health"
}
```

**Triggered By**: Any function (automatic error logging)

---

## Event Severity Levels

| Severity     | Events                                        | Action Required  |
| ------------ | --------------------------------------------- | ---------------- |
| **INFO**     | login, logout, create, update                 | None             |
| **WARNING**  | failed login (3+ attempts), reorder triggered | Monitor          |
| **ERROR**    | delete, system error                          | Review           |
| **CRITICAL** | settings changed, migration, backup failed    | Immediate review |

---

## Query Examples

### Failed Logins (Last 24h)

```sql
SELECT
  details->>'email' as email,
  COUNT(*) as attempts,
  MAX(created_at) as last_attempt
FROM audit_logs
WHERE action = 'user:login-failed'
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY details->>'email'
HAVING COUNT(*) > 3
ORDER BY attempts DESC;
```

### User Activity Summary

```sql
SELECT
  u.name,
  COUNT(*) FILTER (WHERE al.action LIKE 'product:%') as product_actions,
  COUNT(*) FILTER (WHERE al.action LIKE 'order:%') as order_actions,
  COUNT(*) FILTER (WHERE al.action LIKE 'user:%') as user_actions
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.name
ORDER BY product_actions + order_actions + user_actions DESC;
```

### Recent Admin Changes

```sql
SELECT
  u.name as admin,
  al.action,
  al.details,
  al.created_at
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE u.role = 'admin'
AND al.action IN ('user:delete', 'settings:update', 'system:migration')
ORDER BY al.created_at DESC
LIMIT 50;
```

---

## Related Documentation

- [AUDIT_LOGGING.md](AUDIT_LOGGING.md) - Audit system overview
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API endpoint reference
- [DATABASE.md](DATABASE.md) - audit_logs table schema

---

**Last Updated**: 2025-11-11  
**Maintained By**: Development Team

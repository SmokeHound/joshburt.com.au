# Audit Logging Events

This document lists all audit events tracked by the system after the activity tracking enhancement.

## Authentication Events (`auth.*`)

| Action | Description | Details Captured |
|--------|-------------|------------------|
| `auth.register` | User registration | email, name |
| `auth.email_verified` | Email verification completed | token (first 8 chars) |
| `auth.login_success` | Successful user login | email |
| `auth.login_failed` | Failed login attempt | email, attempts |
| `auth.logout` | User logout | (empty details) |
| `auth.token_refresh` | Access token refreshed | (empty details) |
| `auth.password_reset_requested` | Password reset initiated | email |
| `auth.password_reset_completed` | Password reset completed | (empty details) |

## User Management Events (`user.*`)

| Action | Description | Details Captured |
|--------|-------------|------------------|
| `user.create` | Admin creates new user | targetUserId, email, name, role |
| `user.update` | User profile updated | targetUserId, name (if changed), role (if changed), is_active (if changed) |
| `user.delete` | User deleted by admin | targetUserId, email |

## Product Management Events (`product.*`)

| Action | Description | Details Captured |
|--------|-------------|------------------|
| `product.create` | New product added | id, code, type |
| `product.update` | Product details updated | id |
| `product.delete` | Product removed | id |

## Order Management Events (`order.*`)

| Action | Description | Details Captured |
|--------|-------------|------------------|
| `order.create` | New order created | orderId, requestedBy, priority, totalItems |
| `order.status_update` | Order status changed | orderId, status |

## Consumable Management Events (`consumable.*`)

| Action | Description | Details Captured |
|--------|-------------|------------------|
| `consumable.create` | New consumable added | id, name, code, type, category |
| `consumable.update` | Consumable details updated | id, name, code, type, category |
| `consumable.delete` | Consumable removed | id, name, code |

## Settings Events (`settings.*`)

| Action | Description | Details Captured |
|--------|-------------|------------------|
| `settings.update` | Application settings updated | size (data length) |

## Audit Log Fields

All audit log entries include the following standard fields:

- **id**: Unique identifier for the audit log entry
- **user_id**: ID of the user who performed the action (null for anonymous actions)
- **action**: The action performed (see tables above)
- **details**: JSON object with action-specific details
- **ip_address**: IP address of the requester
- **user_agent**: User agent string from the request
- **created_at**: Timestamp when the action occurred

## Enhanced Context (in details field)

The `details` field also includes enriched request context:

- **method**: HTTP method (GET, POST, PUT, DELETE, etc.)
- **path**: Request path
- **query**: Query string parameters
- **referrer**: HTTP referer header
- **origin**: HTTP origin header
- **requestId**: Netlify request ID (x-nf-request-id)

## Filtering and Search

The audit logs API supports filtering by:

- **userId**: Filter by user ID
- **action**: Filter by action type
- **method**: Filter by HTTP method
- **path**: Filter by request path
- **requestId**: Filter by request ID
- **startDate**: Filter by start date
- **endDate**: Filter by end date
- **q**: Free-text search across action, details, and user_id

## Export Formats

Audit logs can be exported in:

- **JSON**: Machine-readable format with full details
- **CSV**: Spreadsheet-compatible format

## Retention

Audit logs can be cleared:

- **All logs**: Clear all audit log entries
- **By age**: Clear logs older than specified days (olderThanDays parameter)

# Audit SystemAudit logging conventions

=========================

Comprehensive audit logging for compliance and security in joshburt.com.au.

Purpose

## Table of Contents-------

This document defines the in-repo conventions for client-side audit logging so UI components and log producers (including admin utilities) can reliably interoperate.

- [Overview](#overview)

- [Audit Events](#audit-events)Shared storage key

- [Implementation](#implementation)------------------

- [Querying Audit Logs](#querying-audit-logs)- `localStorage.auditLogs` — the canonical, shared in-browser audit log cache that UI pages read from. Entries should be an array of objects (most-recent first).

- [Retention Policy](#retention-policy)

Admin-only storage key

---

- `localStorage.adminAuditLogs` — optional admin-only store for richer admin telemetry. Admin loggers may continue to write here for separation, but should also mirror essential entries into `auditLogs` so dashboards and public UI can surface recent events.

## Overview

Events

**Purpose**: Track all administrative actions for compliance, security, and troubleshooting.------

- `auditLogUpdated` — dispatched when an entry is added to `localStorage.auditLogs`. UI components should listen for this event to refresh recent-activity lists.

**Storage**: `audit_logs` table in PostgreSQL Example: window.dispatchEvent(new CustomEvent('auditLogUpdated', { detail: entry }));

**Access**: Admin only via `audit-logs.html` or API- `adminAuditLog` — an admin-scoped event (dispatched by admin tools). Prefer mirroring admin entries into `auditLogs` and dispatching `auditLogUpdated` as well.

**Features**:Standard log shape

- Automatic logging via middleware------------------

- User ID, action, details, IP address, timestampProducers should aim to create a normalized entry so renderers can consume logs without fragile checks. Recommended fields:

- Search/filter by user, action, date range

- Export to CSV{

  id: string | number, // unique id (timestamp + random suffix ok)

--- timestamp: ISOString, // e.g. new Date().toISOString()

userId: string | number|null, // user identifier or null for system

## Audit Events action: string, // short action name, e.g. 'user_login', 'order_created'

details: object|null, // optional structured details

### User Actions ip: string // optional ip or empty string

}

| Event | Description | Logged Details |

|-------|-------------|----------------|Best practices

| `user:login` | User login | Email, IP address, 2FA status |--------------

| `user:logout` | User logout | Email |- Always write to `localStorage.auditLogs` (prepend new entries) and cap size (e.g., 1000) to avoid unbounded growth.

| `user:register` | New user registration | Email, role |- Dispatch `auditLogUpdated` with the same normalized entry so UI can react immediately.

| `user:create` | Admin creates user | Created user email, role |- If you write to `adminAuditLogs`, also mirror a normalized entry into `auditLogs` so dashboards show admin actions.

| `user:update` | User profile updated | Changed fields |- Wrap localStorage operations in try/catch — this is best-effort and must not throw at runtime.

| `user:delete` | User deleted | Deleted user email |

| `user:password-reset` | Password reset | Email |Example helper (recommended)

| `user:2fa-enable` | 2FA enabled | User ID |----------------------------

| `user:2fa-disable` | 2FA disabled | User ID |Use a small helper to standardize writes:

### Resource Actions```js

function logAudit(entry) {

| Event | Description | Logged Details | try {

|-------|-------------|----------------| const key = 'auditLogs';

| `product:create` | Product created | Product name, code | const existing = JSON.parse(localStorage.getItem(key) || '[]');

| `product:update` | Product updated | Product ID, changed fields | const normalized = {

| `product:delete` | Product deleted | Product name, code | id: entry.id || Date.now(),

| `order:create` | Order created | Order ID, user, total items | timestamp: entry.timestamp || new Date().toISOString(),

| `order:update` | Order status changed | Order ID, old status, new status | userId: entry.userId ?? null,

| `order:delete` | Order cancelled/deleted | Order ID, reason | action: entry.action || 'activity',

| `settings:update` | Site settings changed | Changed settings | details: entry.details || {},

      ip: entry.ip || ''

### Inventory Actions };

    existing.unshift(normalized);

| Event | Description | Logged Details | if (existing.length > 1000) existing.splice(1000);

|-------|-------------|----------------| localStorage.setItem(key, JSON.stringify(existing));

| `inventory:update` | Stock level changed | Item type/ID, old count, new count | try { window.dispatchEvent(new CustomEvent('auditLogUpdated', { detail: normalized })); } catch (e) {}

| `inventory:reorder` | Reorder point triggered | Item details, current stock | return normalized;

} catch (e) {

--- // best-effort logging - don't throw

    return null;

## Implementation }

}

### Automatic Logging```

**Utility**: `utils/audit.js`Adoption

---

```javascript- When implementing new loggers, call `logAudit()`or replicate its behavior (normalize, persist to`auditLogs`, dispatch `auditLogUpdated`).

const { pool } = require('../config/database');- For admin-only utilities, continue to write richer data to `adminAuditLogs`, but mirror an appropriate, trimmed entry into `auditLogs` so non-admin UI can surface it.

/\*\*Questions or improvements

- Log audit event------------------------

- @param {number} userId - User ID performing actionOpen an issue or PR if you want to change the shape, storage key, or event names. Keep changes backward-compatible where possible.

- @param {string} action - Action type (e.g., 'user:create')
- @param {string} details - Additional details (JSON string)
- @param {string} ipAddress - User IP address
  \*/
  const logAudit = async (userId, action, details, ipAddress) => {
  await pool.query(
  'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
  [userId, action, details, ipAddress]
  );
  };

module.exports = { logAudit };

````

### Usage in Functions

```javascript
// netlify/functions/users.js
const { logAudit } = require('../../utils/audit');

exports.handler = withHandler(async (event) => {
  const user = await requirePermission(event, 'users', 'create');

  const newUser = JSON.parse(event.body);

  // Create user in database
  const result = await pool.query(
    'INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING id',
    [newUser.email, newUser.name, newUser.role]
  );

  // Log audit event
  await logAudit(
    user.userId,
    'user:create',
    JSON.stringify({ email: newUser.email, role: newUser.role }),
    event.headers['x-forwarded-for'] || event.headers['client-ip']
  );

  return {
    statusCode: 201,
    body: JSON.stringify({ id: result.rows[0].id })
  };
});
````

---

## Querying Audit Logs

### Via API

**Endpoint**: `GET /.netlify/functions/audit-logs`

**Auth**: Admin only

**Query Parameters**:

- `page` (default: 1)
- `limit` (default: 50)
- `userId`: Filter by user ID
- `action`: Filter by action type
- `startDate`: Filter by date range (ISO 8601)
- `endDate`: Filter by date range (ISO 8601)

**Example**:

```bash
curl "https://joshburt.netlify.app/.netlify/functions/audit-logs?userId=1&action=user:update&startDate=2025-11-01" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response**:

```json
{
  "data": [
    {
      "id": 123,
      "userId": 1,
      "action": "user:update",
      "details": "{\"field\":\"role\",\"oldValue\":\"mechanic\",\"newValue\":\"manager\"}",
      "ipAddress": "192.168.1.1",
      "createdAt": "2025-11-11T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### Via SQL

```sql
-- Recent admin actions
SELECT
  u.name as user,
  al.action,
  al.details,
  al.ip_address,
  al.created_at
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE u.role = 'admin'
AND al.created_at > NOW() - INTERVAL '7 days'
ORDER BY al.created_at DESC;

-- Actions by user
SELECT action, COUNT(*) as count
FROM audit_logs
WHERE user_id = 1
GROUP BY action
ORDER BY count DESC;

-- Failed login attempts
SELECT
  details->>'email' as email,
  COUNT(*) as attempts,
  MAX(created_at) as last_attempt
FROM audit_logs
WHERE action = 'user:login-failed'
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY details->>'email'
HAVING COUNT(*) > 3;
```

---

## Retention Policy

### Current Policy

**Retain**: 1 year in primary table

**Archive**: Move to `audit_logs_archive` after 1 year

**Delete**: Archive logs older than 3 years (compliance permitting)

### Archival Process

```sql
-- Create archive table (one-time)
CREATE TABLE audit_logs_archive (LIKE audit_logs INCLUDING ALL);

-- Move old logs to archive (run monthly)
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
```

### Automated Cleanup Script

```bash
# scripts/archive-audit-logs.sh
#!/bin/bash

psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
BEGIN;

INSERT INTO audit_logs_archive
SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

COMMIT;
EOF

echo "Audit logs archived: $(date)"
```

**Schedule**: Run monthly via cron or GitHub Actions

---

## Export

### Via UI

**File**: `audit-logs.html`

**Button**: "Export to CSV"

**Implementation**:

```javascript
const exportAuditLogs = async () => {
  const logs = await fetch('/.netlify/functions/audit-logs?limit=10000', {
    headers: { Authorization: `Bearer ${accessToken}` }
  }).then(r => r.json());

  // Convert to CSV
  const csv = [
    ['ID', 'User', 'Action', 'Details', 'IP Address', 'Timestamp'],
    ...logs.data.map(log => [
      log.id,
      log.userId,
      log.action,
      log.details,
      log.ipAddress,
      log.createdAt
    ])
  ]
    .map(row => row.join(','))
    .join('\n');

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString()}.csv`;
  a.click();
};
```

---

## Compliance

### GDPR

- User deletions logged (audit trail preserved)
- User data exports include audit logs
- Logs pseudonymized if user deleted (userId retained, PII removed)

### Security

- Audit logs immutable (no updates, only inserts)
- Admin access only
- IP addresses logged for security incidents
- Automatic timestamp (database-generated)

---

## Support

- **UI**: `audit-logs.html` (admin only)
- **API**: See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) → Audit Logs section
- **Database**: See [DATABASE.md](DATABASE.md) → audit_logs table

---

**Last Updated**: 2025-11-11  
**Maintained By**: Development Team

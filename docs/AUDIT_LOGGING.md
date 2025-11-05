Audit logging conventions
=========================

Purpose
-------
This document defines the in-repo conventions for client-side audit logging so UI components and log producers (including admin utilities) can reliably interoperate.

Shared storage key
------------------
- `localStorage.auditLogs` — the canonical, shared in-browser audit log cache that UI pages read from. Entries should be an array of objects (most-recent first).

Admin-only storage key
----------------------
- `localStorage.adminAuditLogs` — optional admin-only store for richer admin telemetry. Admin loggers may continue to write here for separation, but should also mirror essential entries into `auditLogs` so dashboards and public UI can surface recent events.

Events
------
- `auditLogUpdated` — dispatched when an entry is added to `localStorage.auditLogs`. UI components should listen for this event to refresh recent-activity lists.
  Example: window.dispatchEvent(new CustomEvent('auditLogUpdated', { detail: entry }));

- `adminAuditLog` — an admin-scoped event (dispatched by admin tools). Prefer mirroring admin entries into `auditLogs` and dispatching `auditLogUpdated` as well.

Standard log shape
------------------
Producers should aim to create a normalized entry so renderers can consume logs without fragile checks. Recommended fields:

{
  id: string | number,           // unique id (timestamp + random suffix ok)
  timestamp: ISOString,          // e.g. new Date().toISOString()
  userId: string | number|null,  // user identifier or null for system
  action: string,                // short action name, e.g. 'user_login', 'order_created'
  details: object|null,          // optional structured details
  ip: string                     // optional ip or empty string
}

Best practices
--------------
- Always write to `localStorage.auditLogs` (prepend new entries) and cap size (e.g., 1000) to avoid unbounded growth.
- Dispatch `auditLogUpdated` with the same normalized entry so UI can react immediately.
- If you write to `adminAuditLogs`, also mirror a normalized entry into `auditLogs` so dashboards show admin actions.
- Wrap localStorage operations in try/catch — this is best-effort and must not throw at runtime.

Example helper (recommended)
----------------------------
Use a small helper to standardize writes:

```js
function logAudit(entry) {
  try {
    const key = 'auditLogs';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const normalized = {
      id: entry.id || Date.now(),
      timestamp: entry.timestamp || new Date().toISOString(),
      userId: entry.userId ?? null,
      action: entry.action || 'activity',
      details: entry.details || {},
      ip: entry.ip || ''
    };
    existing.unshift(normalized);
    if (existing.length > 1000) existing.splice(1000);
    localStorage.setItem(key, JSON.stringify(existing));
    try { window.dispatchEvent(new CustomEvent('auditLogUpdated', { detail: normalized })); } catch (e) {}
    return normalized;
  } catch (e) {
    // best-effort logging - don't throw
    return null;
  }
}
```

Adoption
--------
- When implementing new loggers, call `logAudit()` or replicate its behavior (normalize, persist to `auditLogs`, dispatch `auditLogUpdated`).
- For admin-only utilities, continue to write richer data to `adminAuditLogs`, but mirror an appropriate, trimmed entry into `auditLogs` so non-admin UI can surface it.

Questions or improvements
------------------------
Open an issue or PR if you want to change the shape, storage key, or event names. Keep changes backward-compatible where possible.

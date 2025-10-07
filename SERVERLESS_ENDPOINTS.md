# Serverless Endpoint Mapping (Migration from /api/* to Netlify Functions)

This document tracks the migration from legacy Express `/api/*` endpoints to Netlify Functions under `/.netlify/functions/*`.

| Legacy Endpoint | Netlify Function | Status | Notes |
|-----------------|------------------|--------|-------|
| /api/products   | /.netlify/functions/products | Active | CRUD implemented (GET filter by type, POST, PUT, DELETE) |
| /api/orders     | /.netlify/functions/orders | Active | CRUD implemented |
| /api/settings   | /.netlify/functions/settings | Active | Site/global settings |
| /api/audit-logs | /.netlify/functions/audit-logs | Active | Audit trail listing/creation |
| /api/consumables | /.netlify/functions/consumables | Active | Consumables CRUD |
| /api/consumable-categories | /.netlify/functions/consumable-categories | Active | Category CRUD |
| /api/inventory  | /.netlify/functions/inventory | Active | Inventory adjustments |
| /api/users      | /.netlify/functions/users | Active | Implemented (list, get, create, update, delete, stats) |
| /api/auth/register | /.netlify/functions/auth (action=register) | Active | Unified auth function (query/body action param) |
| /api/auth/login | /.netlify/functions/auth (action=login) | Active | Issues JWT + refresh token |
| /api/auth/logout | /.netlify/functions/auth (action=logout) | Active | Revokes refresh token |
| /api/auth/me    | /.netlify/functions/auth (action=me) | Active | Returns current user (Bearer token) |
| /api/auth/refresh | /.netlify/functions/auth (action=refresh) | Active | Refreshes tokens (stored hashed) |
| /api/auth/forgot-password | /.netlify/functions/auth (action=forgot-password) | Active | Always 200; email send if exists |
| /api/auth/reset-password | /.netlify/functions/auth (action=reset-password) | Active | Validates token; updates password |
| /api/auth/verify-email | /.netlify/functions/auth (action=verify-email) | Active | Email verification placeholder |
| /api/health     | /.netlify/functions/health | Active | Lightweight uptime + DB probe |

## Design Notes

1. Each function exports `handler(event, context)` and must set CORS headers consistently.
2. Auth & Users will reuse existing SQL patterns from former Express routes; adapt middleware logic inline (JWT verification, role checks).
3. For shared logic (JWT verify, role guards), a lightweight utility module will be added under `utils/auth-helpers.js` (planned) to avoid copying the old Express middleware directly.
4. Frontend fetch calls will be updated to use a helper: `const FN_BASE='/.netlify/functions';` then e.g. `fetch(
   `${FN_BASE}/products`)
`.
5. After migration, legacy `server.js` and `api/` directory will be removed along with `middleware/auth.js`.

## Security Considerations

* Ensure `JWT_SECRET` is defined in Netlify environment.
* Rate limiting previously handled by Express `express-rate-limit`; for functions we can implement a simple in-memory (per invocation cold start) fallback or rely on Netlify add-ons (future enhancement; out-of-scope for initial port).
* Refresh token storage: maintain current table `refresh_tokens` and hash tokens before storage.

## Migration Steps Checklist

- [x] Inventory existing functions
- [x] Map legacy endpoints
- [x] Implement `users` function
- [x] Implement `auth` function
- [x] Implement `health` function
- [x] Update all frontend references (frontend now uses FN_BASE constant)
- [x] Remove legacy Express files (server.js, api/ directory, oauth middleware) — removed
- [x] Final grep verification (only intentional references in service worker comments / docs)

## Deferred / Nice-to-Have (Updated)

Completed enhancements:
* Central CORS helper module (implemented in `utils/http.js`)
* Shared response utility & auth helpers (`utils/http.js` json/error/requireAuth)
* Basic in-memory login rate limiting (added to `auth` function; per-container, 5 attempts / 5 min)

Still deferred for future hardening:
* Durable / global rate limiting (KV/Redis style) beyond single container memory
* Structured audit for auth failures (currently only success + generic error logging)
* Move refresh token pruning to scheduled/background function (currently script + CI)

---
Document maintained during migration; remove once fully stabilized and docs updated.

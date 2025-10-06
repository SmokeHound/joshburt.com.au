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
| /api/users      | /.netlify/functions/users | Pending | To be implemented (list, get, create, update, delete, stats) |
| /api/auth/register | /.netlify/functions/auth (method=register) | Pending | Combine auth flows into single function switch |
| /api/auth/login | /.netlify/functions/auth (method=login) | Pending | JWT issuance |
| /api/auth/logout | /.netlify/functions/auth (method=logout) | Pending | Refresh token revocation |
| /api/auth/me    | /.netlify/functions/auth (method=me) | Pending | Return current user (requires Bearer token) |
| /api/auth/refresh | /.netlify/functions/auth (method=refresh) | Pending | Token refresh (validate stored refresh) |
| /api/auth/forgot-password | /.netlify/functions/auth (method=forgot-password) | Pending | Always 200; send email if user exists |
| /api/auth/reset-password | /.netlify/functions/auth (method=reset-password) | Pending | Validate token; update password |
| /api/auth/verify-email | /.netlify/functions/auth (method=verify-email) | Pending | Verify email token |
| /api/health     | /.netlify/functions/health | Optional | Can implement lightweight function for uptime checks |

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
- [ ] Implement `users` function
- [ ] Implement `auth` function
- [ ] (Optional) Implement `health` function
- [ ] Update all frontend references
- [ ] Remove legacy Express files
- [ ] Final grep verification

## Deferred / Nice-to-Have

* Central CORS helper module
* Shared response utility (success/error wrappers)
* Function-level rate limiting (KV or Deno Edge adapter)

---
Document maintained during migration; remove once fully stabilized and docs updated.

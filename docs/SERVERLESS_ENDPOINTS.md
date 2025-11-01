# Serverless API Endpoints

This document lists all Netlify Functions (serverless API) and their behaviors. All functions now use the shared utilities in `utils/fn.js` for consistent CORS/OPTIONS handling and JSON responses.

## Conventions
- CORS/OPTIONS: handled via `withHandler` + `utils/http.corsHeaders`.
- Response helpers: `ok(data, status?)`, `error(status, message, extra?)`.
- Body parsing: `parseBody(event)` (safe JSON parse, returns `{}` on invalid JSON).
- Pagination: `getPagination(qs, { page, limit })` returns `{ page, limit, offset }`.

## Endpoints

- GET /.netlify/functions/health
  - Returns service status and DB probe info.
  - 200: `{ status, time, uptimeSeconds, db: { ok, driver }, version, latencyMs }`

- GET /.netlify/functions/public-stats
  - Anonymous aggregate counts: `{ users, orders, products }`.
  - Ignores missing tables gracefully.

- GET /.netlify/functions/public-config
  - Returns limited client-safe configuration values. Current shape:
    `{ auth0: { domain, clientId, audience } }`
  - Used by login/register pages to auto-enable OAuth buttons when configured.

- GET/POST/PATCH /.netlify/functions/orders
  - GET: Last 50 orders plus items.
  - POST: Create new order `{ items: [{ name, code, quantity }], requestedBy? }` → `{ orderId }`.
  - PATCH: Update status `{ orderId, status: 'approved'|'rejected' }`.

- GET/POST/PUT/DELETE /.netlify/functions/products
  - GET: List products; optional `?type=...` filter.
  - POST: Create `{ name, code, type, specs?, description?, image? }`.
  - PUT: Update `{ id, name, code, type, specs?, description?, image? }`.
  - DELETE: Delete `{ id }`.

- GET/POST/PUT/DELETE /.netlify/functions/consumables
  - GET: Optional `?type=...`, `?category=...` filters.
  - POST: Create `{ name, type, category, code?, description? }`.
  - PUT: Update `{ id, name, type, category, code?, description? }`.
  - DELETE: Delete `{ id }`.

- GET /.netlify/functions/consumable-categories
  - Returns distinct categories from `consumables`.

- GET /.netlify/functions/inventory
  - Returns raw rows from `inventory` (PostgreSQL). Uses `NEON_DATABASE_URL`.

- GET/PUT /.netlify/functions/settings
  - GET: Returns JSON string stored in single-row table `settings` (id=1).
  - PUT: Upserts request body to `settings.data`.

- GET/POST/DELETE /.netlify/functions/audit-logs
  - GET: Supports filters `userId`, `action`, `startDate`, `endDate`, free-text `q`.
    - Pagination via `page` and `limit` → `{ data, pagination }` or raw array when absent.
    - `format=csv` returns CSV with headers.
  - POST: Create entry `{ action, userId?, details?, ip_address?, user_agent? }`.
  - DELETE: `?olderThanDays=N` to prune old logs; otherwise deletes all.

- CRUD + management /.netlify/functions/users
  - Auth required, role checks enforced.
  - GET (collection): `?page&limit&search&role` returns `{ users, pagination }`.
  - POST (collection): Admin only, create user `{ email, password, name, role? }`.
  - GET (/:id): Manager/Admin read user.
  - PUT (/:id): Self or Admin update; only Admin can modify `role`, `is_active`.
  - DELETE (/:id): Admin only; prevents self-delete.
  - Stats: `.../users/stats/overview` returns aggregates for admins/managers.

- Multi-action /.netlify/functions/auth
  - `action=register|verify-email|login|refresh|logout|forgot-password|reset-password|me` via query or JSON body.
  - Returns tokens on `login` and `refresh`. Uses refresh-token rotation.
  - When `AUTH0_DOMAIN` is set, Auth0 JWTs are accepted and users are auto-provisioned by default unless `AUTH0_AUTO_PROVISION=false`.

## Notes
- Database access via `config/database.js` with PostgreSQL support.
- Most endpoints automatically connect as needed; connection calls are idempotent.
 - Errors are normalized with `{ error: message }`.

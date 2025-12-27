# joshburt.com.au - Copilot Development Guide

**Production-ready serverless web application** with PostgreSQL database, JWT authentication, and comprehensive admin features.

## 🎯 Quick Reference

### Technology Stack

- **Frontend**: Static HTML, TailwindCSS v4, Vanilla JavaScript
- **Backend**: Netlify Functions (Node.js serverless)
- **Database**: PostgreSQL (Neon or compatible)
- **Auth**: JWT tokens + optional OAuth
- **Deployment**: Netlify (primary) + FTP mirror (optional)

### Project Status

✅ **Production-ready** - No dead code, debug logic, or unused variables  
✅ **Fully serverless** - All APIs via Netlify Functions  
✅ **Database-driven** - All settings, users, products, orders in PostgreSQL

---

## 🚀 Development Workflow

### Local Development Setup

```bash
# Install dependencies
npm install

# Option 1: Static development only (no backend)
npm run dev
# Serves on http://localhost:8000

# Option 2: Full-stack development (static + serverless)
npm run dev:functions
# Serves on http://localhost:8888 with functions at /.netlify/functions/*

# Option 3: Both (recommended for full testing)
# Terminal 1: npm run dev
# Terminal 2: npm run dev:functions
```

### Environment Variables Required

Create `.env` file in project root:

```env
# Database (required for all functions)
DB_HOST=your-db-host.neon.tech
DB_PORT=5432
DB_USER=your-username
DB_PASS=your-password
DB_NAME=your-database

# Auth (required)
JWT_SECRET=your-secret-key-min-32-chars

# Email (optional - for password reset)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-password

# Schema management (optional)
APPLY_SCHEMA_ON_START=0  # Set to 1 to auto-apply database-schema.sql on startup
```

### Testing & Validation

```bash
# Run all tests (Jest + smoke tests)
npm run test:all

# Run only Jest tests
npm test

# Run function smoke tests
npm run test:functions

# Lint code
npm run lint

# Complete validation (lint + build + test)
npm run validate

# Database health check
npm run health
```

---

## 📁 Repository Structure

```
joshburt.com.au/
├── index.html                      # Landing page
├── login.html, register.html       # Authentication
├── administration.html             # Admin dashboard
├── users.html                      # User management
├── settings.html                   # Site settings
├── analytics.html                  # Analytics dashboard
├── audit-logs.html                 # Audit log viewer
├── oil-products.html               # Product catalog
├── oil-products-mgmt.html          # Product admin
├── consumables.html                # Consumables catalog
├── consumables-mgmt.html           # Consumables admin
├── filters.html                    # Filters catalog
├── filters-mgmt.html               # Filters admin
├── orders-review.html              # Order management
├── notifications.html              # User notifications
├── profile.html                    # User profile
│
├── assets/
│   ├── css/styles.css              # Compiled TailwindCSS
│   ├── js/
│   │   ├── init-shared.js          # App initialization
│   │   ├── auth.js                 # Auth utilities
│   │   ├── audit-ui.js             # Audit log UI
│   │   ├── profile.js              # Profile page logic
│   │   └── ...
│   └── images/
│       └── avatars/                # User avatar presets
│
├── netlify/functions/              # Serverless API
│   ├── auth.js                     # Multi-action auth endpoint
│   ├── users.js                    # User CRUD + avatar upload
│   ├── products.js                 # Product catalog
│   ├── orders.js                   # Order management
│   ├── consumables.js              # Consumables catalog
│   ├── filters.js                  # Filters catalog
│   ├── audit-logs.js               # Audit logging
│   ├── inventory.js                # Stock management
│   ├── settings.js                 # Site settings API
│   ├── notifications.js            # User notifications
│   ├── notification-preferences.js # Notification settings
│   ├── avatar-initials.js          # Dynamic avatar generation
│   ├── health.js                   # Database health check
│   ├── public-config.js            # Public config (Auth0 status)
│   └── public-stats.js             # Public statistics
│
├── config/
│   └── database.js                 # PostgreSQL connection pool
│
├── utils/
│   ├── fn.js                       # Function helpers (withHandler, error)
│   ├── http.js                     # Auth middleware (requirePermission)
│   ├── audit.js                    # Audit logging helper
│   ├── password.js                 # Password hashing/validation
│   ├── rbac.js                     # Role-based access control
│   └── email.js                    # Email utilities
│
├── migrations/                     # Database migrations
│   ├── 001_add_product_categories.sql
│   ├── 002_add_order_status_tracking.sql
│   ├── 003_add_notification_system.sql
│   └── 004_add_filters.sql
│
├── scripts/
│   ├── run-migrations.js           # Migration runner
│   ├── health-check.js             # Function health test
│   └── prune-refresh-tokens.js     # Token cleanup
│
├── tests/
│   ├── functions/                  # Function smoke tests
│   ├── unit/                       # Jest unit tests
│   └── integration/                # Jest integration tests
│
├── docs/                           # Comprehensive documentation
│   ├── ARCHITECTURE.md
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   └── ...
│
├── database-schema.sql             # Master schema file
├── netlify.toml                    # Netlify config
├── package.json                    # Dependencies + scripts
└── tailwind.config.js              # TailwindCSS v4 config
```

---

## 🔌 API Endpoints

All serverless functions are available at `/.netlify/functions/<name>`.

### Authentication (`/auth`)

Multi-action endpoint using `?action=<action>` or `{ action: "..." }` in body:

- **login** - Email/password or Auth0 OAuth login
- **register** - Create new user account
- **refresh** - Refresh JWT access token
- **logout** - Invalidate refresh token
- **me** - Get current user info
- **forgot-password** - Send password reset email
- **reset-password** - Reset password with token
- **verify-email** - Verify email with token
- **2fa-setup** - Generate TOTP secret + QR code
- **2fa-enable** - Enable 2FA with TOTP code
- **2fa-disable** - Disable 2FA

### Resource Endpoints

| Endpoint                    | Methods                | Description              |
| --------------------------- | ---------------------- | ------------------------ |
| `/users`                    | GET, POST, PUT, DELETE | User management          |
| `/users/:id/avatar`         | PUT                    | Upload/update avatar     |
| `/products`                 | GET, POST, PUT, DELETE | Oil products catalog     |
| `/orders`                   | GET, POST, PUT, DELETE | Order management         |
| `/consumables`              | GET, POST, PUT, DELETE | Consumables catalog      |
| `/filters`                  | GET, POST, PUT, DELETE | Filters/parts catalog    |
| `/audit-logs`               | GET, POST, DELETE      | Audit log management     |
| `/inventory`                | GET, PUT               | Stock level management   |
| `/settings`                 | GET, PUT               | Site-wide settings       |
| `/notifications`            | GET, POST, PUT, DELETE | User notifications       |
| `/notification-preferences` | GET, PUT               | Notification settings    |
| `/avatar-initials`          | GET                    | Generate initials avatar |
| `/health`                   | GET                    | Database health check    |
| `/public-config`            | GET                    | Public config (no auth)  |
| `/public-stats`             | GET                    | Public stats (no auth)   |

### Permission Matrix

| Role         | Read                | Create              | Update              | Delete |
| ------------ | ------------------- | ------------------- | ------------------- | ------ |
| **mechanic** | ✅ Products, Orders | ✅ Orders          | ❌                  | ❌     |
| **manager**  | ✅ All              | ✅ Products, Users | ✅ Products, Orders | ❌     |
| **admin**    | ✅ All              | ✅ All             | ✅ All              | ✅ All |

Permissions enforced via `requirePermission(event, resource, action)` in `utils/http.js`.

---

## 💾 Database Schema

### Core Tables

- **users** - User accounts (email, password_hash, role, avatar_url, totp_secret, etc.)
- **products** - Oil products (name, code, type, specs, category_id, stock_quantity)
- **product_categories** - Product categories (hierarchical with parent_id)
- **product_variants** - Product variants (size, color, SKU)
- **product_images** - Product images (multiple per product)
- **consumables** - Workshop consumables (name, code, type, category, soh)
- **filters** - Filter/parts catalog (name, code, type, stock_quantity)
- **orders** - Order headers (status, priority, tracking_number)
- **order_items** - Order line items
- **order_status_history** - Order status audit trail
- **inventory** - Stock tracking (item_type, item_id, stock_count)
- **audit_logs** - System audit trail (user_id, action, details, ip_address)
- **refresh_tokens** - JWT refresh tokens (hashed)
- **login_attempts** - Rate limiting tracker
- **settings** - Site-wide settings (JSON in `data` field)
- **notifications** - User notifications
- **notification_preferences** - User notification settings

### Migrations

Managed via `scripts/run-migrations.js`:

```bash
# Dry run (show pending migrations)
node scripts/run-migrations.js --dry-run

# Apply all pending migrations
node scripts/run-migrations.js
```

Migration tracking in `schema_migrations` table ensures idempotency.

---

## 🎨 Frontend Patterns

### UI Primitives

All UI components use standardized primitives with token-driven styling:

#### Buttons
```html
<!-- Primary action button -->
<button class="ui-btn ui-btn-primary">Save Changes</button>

<!-- Secondary action button -->
<button class="ui-btn ui-btn-secondary">Cancel</button>

<!-- Danger/destructive action -->
<button class="ui-btn ui-btn-danger">Delete</button>

<!-- Accent button -->
<button class="ui-btn ui-btn-accent">Special Action</button>

<!-- Warning button -->
<button class="ui-btn ui-btn-warning">Warning Action</button>

<!-- Outline button -->
<button class="ui-btn ui-btn-outline">More Options</button>

<!-- Size variants -->
<button class="ui-btn ui-btn-primary ui-btn-sm">Small</button>
<button class="ui-btn ui-btn-primary ui-btn-lg">Large</button>
```

#### Cards
```html
<!-- Base card -->
<div class="ui-card">Content</div>

<!-- Themed cards -->
<div class="ui-card ui-card-primary">Primary themed</div>
<div class="ui-card ui-card-secondary">Secondary themed</div>
<div class="ui-card ui-card-accent">Accent themed</div>

<!-- Flat card (no hover effects) -->
<div class="ui-card ui-card-flat">Static card</div>
```

#### Modals
```html
<div class="ui-modal-backdrop hidden">
  <div class="ui-modal-panel">
    <div class="ui-modal-header"><h2>Title</h2></div>
    <div class="ui-modal-body">Content</div>
    <div class="ui-modal-footer">
      <button class="ui-btn ui-btn-primary">OK</button>
    </div>
  </div>
</div>
```

#### Links
```html
<!-- Base link -->
<a href="#" class="ui-link">Link</a>

<!-- Variants -->
<a href="#" class="ui-link ui-link-primary">Primary Link</a>
<a href="#" class="ui-link ui-link-secondary">Secondary Link</a>
<a href="#" class="ui-link ui-link-muted">Muted Link</a>

<!-- Navigation link -->
<a href="#" class="ui-link ui-link-nav">Nav Item</a>
```

#### Design Tokens

All styling uses CSS custom properties defined in `src/styles.css`:

- **Colors**: `--token-color-primary`, `--token-color-secondary`, etc.
- **Spacing**: `--token-spacing-xs` through `--token-spacing-2xl`
- **Shadows**: `--token-shadow-sm` through `--token-shadow-xl`
- **Glows**: `--token-shadow-glow-primary`, etc.

See `docs/UI_PRIMITIVES.md` for complete documentation.

### Shared Components

Include these HTML fragments in your pages:

```html
<!-- Navigation sidebar -->
<div id="main-nav"></div>
<script src="/shared-nav.html"></script>

<!-- Theme manager (dark/light/system/neon/ocean/high-contrast) -->
<script src="/shared-theme.html"></script>

<!-- TailwindCSS config + common utilities -->
<script src="/shared-config.html"></script>

<!-- Modals (confirmation, info, error) -->
<script src="/shared-modals.html"></script>

<!-- Notifications toast -->
<script src="/shared-notifications.html"></script>
```

### Theme System

Global `window.Theme` API:

```javascript
// Apply saved theme on page load (called automatically)
window.Theme.applyFromStorage();

// Set theme preset
window.Theme.setTheme('dark'); // dark, light, system, neon, ocean, high-contrast

// Custom colors
window.Theme.setPalette({
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#8b5cf6'
});

// Get active theme
const { id, mode, colors } = window.Theme.getActiveTheme();
```

### API Calls

All pages use `window.FN_BASE` (defaults to `/.netlify/functions`):

```javascript
const FN_BASE = window.FN_BASE || '/.netlify/functions';

// Authenticated request
const response = await fetch(`${FN_BASE}/products`, {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
  }
});

// Multi-action auth call
await fetch(`${FN_BASE}/auth?action=login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

---

## 🧪 Testing

### Function Tests (Node.js smoke tests)

```bash
# Run all function tests
npm run test:functions

# Individual tests
node tests/functions/auth_me_smoke.test.js
node tests/functions/orders_products_smoke.test.js
node tests/functions/auth_errors.test.js
node tests/functions/handlers.test.js
```

### Jest Tests

```bash
# All Jest tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage
```

---

## 🚢 Deployment

### Netlify (Primary)

Auto-deploys on push to `main`:

- Static files → Netlify CDN
- Functions → Netlify serverless runtime
- Environment variables configured in Netlify dashboard

### FTP Mirror (Optional)

GitHub Actions workflow (`.github/workflows/main.yml`) deploys to FTP server on push.  
Credentials stored in GitHub Secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`.

---

## 📋 Common Tasks

### Add New Page

1. Create HTML file in root (e.g., `my-page.html`)
2. Include shared components (nav, theme, config)
3. Add navigation link in `shared-nav.html`
4. Test locally with `npm run dev`

### Add New Function

1. Create file in `netlify/functions/` (e.g., `my-function.js`)
2. Use `withHandler` wrapper from `utils/fn.js`
3. Add permission checks with `requirePermission` from `utils/http.js`
4. Test with `netlify dev` then call `/.netlify/functions/my-function`

### Database Changes

1. Create migration in `migrations/` (e.g., `005_add_my_table.sql`)
2. Update `database-schema.sql` to match
3. Run migration: `node scripts/run-migrations.js`
4. Test with `npm run health`

---

## 🔍 Debugging

### Check Function Logs

```bash
# Netlify CLI
netlify dev
# Then call functions and view console output

# Production logs (Netlify dashboard)
# Navigate to: Netlify Dashboard > Functions > Select function > Logs
```

### Database Connectivity

```bash
# Health check
npm run health

# Or manually
curl http://localhost:8888/.netlify/functions/health
```

### Frontend Errors

Global error tracker captures all errors:

```javascript
// View errors in browser console
ErrorTracker.getErrorLog();

// Export errors
ErrorTracker.exportErrorLog();

// Clear errors
ErrorTracker.clearErrorLog();
```

---

## ⚠️ Important Notes

1. **Always validate changes** with `npm run validate` before committing
2. **Version bump required** - After completing any changes, run the appropriate version script:
   - `npm run version:patch` - Bug fixes and minor changes
   - `npm run version:minor` - New features (backward compatible)
   - `npm run version:major` - Breaking changes
3. **Never commit** `.env` files or database credentials
4. **Test locally** with `netlify dev` before deploying
5. **Review audit logs** in `audit-logs.html` after admin actions
6. **Run migrations** on staging before production
7. **Use feature flags** in `settings.html` to toggle experimental features

---

## 📚 Documentation

See `/docs` directory for comprehensive guides:

- **ARCHITECTURE.md** - System design and patterns
- **API_DOCUMENTATION.md** - Complete API reference
- **DATABASE.md** - Schema details and queries
- **DEPLOYMENT.md** - Deployment procedures
- **AUTHENTICATION.md** - Auth flows and security

Full documentation index: `DOCS_INDEX.md`

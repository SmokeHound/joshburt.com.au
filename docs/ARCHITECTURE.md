# System Architecture# System Architecture



Comprehensive overview of the joshburt.com.au serverless application architecture.This document provides a comprehensive overview of the joshburt.com.au application architecture.



## Table of Contents## Table of Contents

- [System Overview](#system-overview)

- [Overview](#overview)- [Architecture Diagram](#architecture-diagram)

- [Architecture Diagram](#architecture-diagram)- [Component Details](#component-details)

- [Frontend Layer](#frontend-layer)- [Data Flow](#data-flow)

- [Backend Layer](#backend-layer)- [Security Architecture](#security-architecture)

- [Database Layer](#database-layer)- [Deployment Architecture](#deployment-architecture)

- [Security Architecture](#security-architecture)

- [Deployment Architecture](#deployment-architecture)## System Overview

- [Data Flow](#data-flow)

The joshburt.com.au application is a modern, serverless web application built on:

---- **Frontend**: Static HTML/CSS/JavaScript with TailwindCSS

- **Backend**: Netlify Serverless Functions (Node.js)

## Overview- **Database**: PostgreSQL (Neon)

- **Hosting**: Netlify (primary), FTP mirror (secondary)

### System Type- **CI/CD**: GitHub Actions



**Serverless full-stack web application** with static frontend and serverless backend.### Key Characteristics

- **Serverless Architecture**: No dedicated server, scales automatically

### Technology Stack- **PostgreSQL Database**: Production-ready database with connection pooling

- **Progressive Enhancement**: Works without JavaScript, enhanced with it

| Layer | Technology |- **Mobile-First**: Responsive design for all screen sizes

|-------|------------|

| **Frontend** | Static HTML, Vanilla JavaScript (ES6+), TailwindCSS v4 |## Architecture Diagram

| **Backend** | Netlify Functions (Node.js 18+) |

| **Database** | PostgreSQL 14+ (Neon serverless) |```

| **Hosting** | Netlify CDN (primary), FTP mirror (optional) |┌─────────────────────────────────────────────────────────────────────┐

| **CI/CD** | GitHub Actions |│                           USER BROWSER                               │

| **Auth** | JWT + optional Auth0 OAuth |│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │

│  │  Static HTML │  │  JavaScript  │  │  Service Worker (PWA)    │  │

### Key Characteristics│  │  + CSS       │  │  (ES6+)      │  │  (Offline Caching)       │  │

│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │

- **Zero Server Management**: Fully serverless, auto-scaling│         │                 │                       │                  │

- **Progressive Enhancement**: Works without JavaScript, enhanced with it└─────────┼─────────────────┼───────────────────────┼──────────────────┘

- **Mobile-First**: Responsive design, all screen sizes          │                 │                       │

- **Production-Ready**: No debug code, comprehensive error handling          │                 │                       │

- **Audit Trail**: Complete action logging for compliance          ▼                 ▼                       ▼

┌─────────────────────────────────────────────────────────────────────┐

---│                         NETLIFY CDN                                  │

│  ┌─────────────────────────────────────────────────────────────┐   │

## Architecture Diagram│  │  Edge Caching (Static Assets)                               │   │

│  │  - HTML, CSS, JavaScript, Images                            │   │

```│  │  - Cache-Control: max-age=31536000 (1 year)                │   │

┌─────────────────────────────────────────────────────────────────────┐│  └─────────────────────────────────────────────────────────────┘   │

│                        USER BROWSER                                  │└─────────────────────────────────────────────────────────────────────┘

│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │          │

│  │  Static HTML │  │  JavaScript  │  │  Service Worker (PWA)    │  │          │

│  │  + TailwindCSS│ │  (Vanilla)   │  │  (Offline Caching)       │  │          ▼

│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │┌─────────────────────────────────────────────────────────────────────┐

│         │                 │                       │                  ││                    NETLIFY FUNCTIONS (Serverless)                    │

└─────────┼─────────────────┼───────────────────────┼──────────────────┘│                                                                       │

          │                 │                       ││  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │

          ▼                 ▼                       ▼│  │  auth.js     │  │  users.js    │  │  products.js             │  │

┌─────────────────────────────────────────────────────────────────────┐│  │  - Login     │  │  - CRUD      │  │  - List/Create           │  │

│                        NETLIFY CDN                                   ││  │  - Register  │  │  - Roles     │  │  - Categories            │  │

│  ┌──────────────────────────────────────────────────────────────┐  ││  │  - JWT       │  │  - Stats     │  │                          │  │

│  │  Static Asset Delivery                                       │  ││  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │

│  │  - HTML, CSS, JavaScript, Images                             │  ││         │                 │                       │                  │

│  │  - Edge caching (Cache-Control: max-age=31536000)           │  ││  ┌──────┴─────────────────┴───────────────────────┴──────────────┐  │

│  │  - Gzip/Brotli compression                                   │  ││  │                  Shared Utilities                              │  │

│  └──────────────────────────────────────────────────────────────┘  ││  │  - database.js (DB abstraction)                               │  │

└─────────────────────────────┬───────────────────────────────────────┘│  │  - auth-middleware.js (JWT verification)                      │  │

                              ││  │  - metrics-collector.js (Monitoring)                          │  │

                              ▼│  │  - log-aggregator.js (Logging)                                │  │

┌─────────────────────────────────────────────────────────────────────┐│  └────────────────────────────────┬──────────────────────────────┘  │

│                   NETLIFY FUNCTIONS (Serverless)                     │└───────────────────────────────────┼──────────────────────────────────┘

│                                                                       │                                    │

│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐   │                                    │

│  │  auth.js       │  │  users.js      │  │  products.js        │   │                                    ▼

│  │  (multi-action)│  │  (CRUD+avatar) │  │  (catalog)          │   │┌─────────────────────────────────────────────────────────────────────┐

│  └────────┬───────┘  └────────┬───────┘  └──────────┬──────────┘   ││                        DATABASE LAYER                                │

│           │                   │                      │               ││                                                                       │

│  ┌────────┴───────────────────┴──────────────────────┴───────────┐  ││  ┌────────────────────────────┐                                      │

│  │                     Shared Utilities                           │  ││  │  PostgreSQL (Neon)         │                                      │

│  │  - fn.js: withHandler wrapper, error formatting              │  ││  │  - Production database     │                                      │

│  │  - http.js: requirePermission middleware                      │  ││  │  - Connection pooling      │                                      │

│  │  - rbac.js: Role-based access control                        │  ││  │  - Managed backups         │                                      │

│  │  - audit.js: Audit logging helper                            │  ││  └────────────────────────────┘                                      │

│  │  - password.js: bcrypt hashing                               │  ││                                                                       │

│  └────────────────────────────┬──────────────────────────────────┘  ││  Schema Tables:                                                       │

└───────────────────────────────┼──────────────────────────────────────┘│  - users, products, orders, consumables                              │

                                ││  - refresh_tokens, audit_logs, schema_migrations                    │

                                ▼│  - settings, notifications, notification_preferences                │

┌─────────────────────────────────────────────────────────────────────┐└─────────────────────────────────────────────────────────────────────┘

│                      DATABASE LAYER                                  │          │

│                                                                       │          │

│  ┌────────────────────────────────────────────────────────────┐     │          ▼

│  │  PostgreSQL (Neon Serverless)                              │     │┌─────────────────────────────────────────────────────────────────────┐

│  │  - Connection pooling (max 20 connections)                │     ││                      MONITORING & LOGGING                            │

│  │  - Auto-scaling compute                                    │     ││                                                                       │

│  │  - Automatic backups (7-day point-in-time recovery)       │     ││  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │

│  └────────────────────────────────────────────────────────────┘     ││  │  Metrics         │  │  Logs            │  │  Reports         │  │

│                                                                       ││  │  - Request rate  │  │  - Aggregated    │  │  - Weekly        │  │

│  Schema Tables:                                                       ││  │  - Error rate    │  │  - Searchable    │  │  - Performance   │  │

│  - users, products, product_categories, product_variants             ││  │  - Response time │  │  - Rotating      │  │  - Automated     │  │

│  - orders, order_items, order_status_history                        ││  └──────────────────┘  └──────────────────┘  └──────────────────┘  │

│  - consumables, filters, inventory                                   │└─────────────────────────────────────────────────────────────────────┘

│  - settings (JSONB), audit_logs                                     │          │

│  - notifications, notification_preferences                           │          │

│  - refresh_tokens, login_attempts                                   │          ▼

└─────────────────────────────────────────────────────────────────────┘┌─────────────────────────────────────────────────────────────────────┐

          ││                         CI/CD PIPELINE                               │

          ▼│                                                                       │

┌─────────────────────────────────────────────────────────────────────┐│  ┌──────────────────────────────────────────────────────────────┐   │

│                   MONITORING & LOGGING                               ││  │  GitHub Actions                                              │   │

│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  ││  │                                                              │   │

│  │  Netlify     │  │  Audit Logs  │  │  Error Tracking          │  ││  │  1. On Push:                                                │   │

│  │  Analytics   │  │  (Database)  │  │  (Frontend JS)           │  ││  │     - Lint (ESLint, HTMLHint)                              │   │

│  └──────────────┘  └──────────────┘  └──────────────────────────┘  ││  │     - Test (Jest)                                          │   │

└─────────────────────────────────────────────────────────────────────┘│  │     - Build (Tailwind CSS)                                 │   │

```│  │     - Migrate (Database dry-run)                           │   │

│  │     - Deploy (FTP + Netlify)                               │   │

---│  │                                                              │   │

│  │  2. Nightly (2 AM UTC):                                     │   │

## Frontend Layer│  │     - Security audit                                        │   │

│  │     - Token cleanup                                         │   │

### Static Files│  │     - Dependency check                                      │   │

│  │                                                              │   │

**Location**: Repository root (HTML files) + `assets/` directory│  │  3. Weekly (Monday 9 AM):                                   │   │

│  │     - Performance reports                                   │   │

**Structure**:│  │     - Metrics analysis                                      │   │

```│  │                                                              │   │

index.html                    # Landing page│  └──────────────────────────────────────────────────────────────┘   │

login.html, register.html     # Authentication└─────────────────────────────────────────────────────────────────────┘

administration.html           # Admin dashboard```

users.html, settings.html     # Admin management

oil-products.html             # Product catalog## Component Details

orders-review.html            # Order management

profile.html, notifications.html  # User features### Frontend Layer



assets/#### Static Assets

├── css/styles.css            # Compiled TailwindCSS- **HTML Pages**: Templated pages with shared components

├── js/- **CSS**: TailwindCSS v4 with custom theme system

│   ├── init-shared.js        # App initialization- **JavaScript**: Vanilla ES6+ modules, no framework dependencies

│   ├── auth.js               # Auth utilities- **Service Worker**: Progressive Web App with offline caching

│   ├── audit-ui.js           # Audit log UI

│   └── ...#### Key Features

└── images/- Multi-theme support (dark, light, system, custom)

    └── avatars/              # User avatar presets- Responsive design (mobile-first)

```- Accessibility compliant (WCAG 2.1 AA)

- Progressive enhancement

### Shared Components

### Backend Layer

**System**: HTML injection via JavaScript

#### Serverless Functions

```htmlLocated in `.netlify/functions/`:

<!-- Include in all pages -->

<div id="shared-nav-container"></div>1. **Authentication** (`auth.js`)

<script src="/shared-nav.html"></script>   - Register, login, logout, refresh token

<script src="/shared-theme.html"></script>   - JWT-based authentication

<script src="/shared-config.html"></script>   - Password reset, email verification

<script src="/shared-modals.html"></script>   - Auth0 OAuth integration (optional)

<script src="/shared-notifications.html"></script>

```2. **Users** (`users.js`)

   - CRUD operations for user management

**Components**:   - Role-based access control (RBAC)

- `shared-nav.html`: Sidebar navigation with role-based visibility   - User statistics and analytics

- `shared-theme.html`: Theme manager (dark/light/neon/ocean/high-contrast)

- `shared-config.html`: TailwindCSS config + utilities3. **Products** (`products.js`, `consumables.js`)

- `shared-modals.html`: Confirmation/info/error dialogs   - Product catalog management

- `shared-notifications.html`: Toast notification system   - Categories and inventory

   - Order processing

### Theme System

4. **Orders** (`orders.js`)

**Global API**: `window.Theme`   - Order creation and tracking

   - Status management

```javascript   - Order history

// Apply saved theme

window.Theme.applyFromStorage();5. **Audit Logs** (`audit-logs.js`)

   - Activity tracking

// Set theme preset   - Security monitoring

window.Theme.setTheme('dark');   - Compliance logging



// Custom colors6. **Monitoring** (`health.js`, `metrics.js`)

window.Theme.setPalette({   - Health checks

  primary: '#3b82f6',   - Performance metrics

  secondary: '#10b981',   - System status

  accent: '#8b5cf6'

});#### Shared Utilities

Located in `utils/` and `config/`:

// Get active theme

const { id, mode, colors } = window.Theme.getActiveTheme();- **database.js**: Database abstraction layer

```- **auth-middleware.js**: JWT verification

- **metrics-collector.js**: Custom metrics collection

**Presets**: dark, light, system, neon, ocean, high-contrast- **log-aggregator.js**: Centralized logging

- **rbac.js**: Role-based access control

### Progressive Web App (PWA)- **rate-limit.js**: Request rate limiting



**Service Worker**: `sw.js`### Database Layer



```javascript#### Schema Design

// Cache static assets for offline access- **Normalized schema** with proper indexes

self.addEventListener('fetch', (event) => {- **Audit trail** for all critical operations

  // Cache-first strategy for assets- **Soft deletes** where appropriate

  // Network-first for API calls- **Migration tracking** via `schema_migrations` table

});

```#### Database Types

1. **PostgreSQL (Production)**

**Manifest**: `manifest.json` (installable app metadata)   - Hosted on Neon

   - Connection pooling

---   - Automatic backups

   - High availability

## Backend Layer

### Monitoring & Logging

### Netlify Functions

#### Metrics Collection

**Location**: `netlify/functions/`- Request/response metrics

- Error tracking

**Runtime**: Node.js 18+ (AWS Lambda under the hood)- Performance monitoring

- Database query metrics

#### Function Pattern

#### Log Aggregation

All functions use `withHandler` wrapper for consistent error handling:- Centralized logging

- Log rotation (daily files)

```javascript- Searchable logs

// netlify/functions/example.js- Log cleanup (30-day retention)

const { withHandler, error } = require('../../utils/fn');

#### Reporting

exports.handler = withHandler(async (event) => {- Weekly performance reports

  // Permission check- Automated analysis

  const user = await requirePermission(event, 'resource', 'read');- Recommendations based on metrics

  

  // Business logic## Data Flow

  const data = await pool.query('SELECT * FROM table');

  ### User Authentication Flow

  // Return success response

  return {```

    statusCode: 200,┌─────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐

    body: JSON.stringify({ data: data.rows })│ Browser │         │  CDN     │         │ auth.js  │         │ Database │

  };└────┬────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘

});     │                   │                    │                     │

```     │ POST /auth?action=login                │                     │

     ├──────────────────>│                    │                     │

#### Available Functions     │                   │ Forward request    │                     │

     │                   ├───────────────────>│                     │

| Function | Purpose | Auth |     │                   │                    │ Query user          │

|----------|---------|------|     │                   │                    ├────────────────────>│

| `auth.js` | Multi-action auth (login, register, refresh, etc.) | Mixed |     │                   │                    │ User data           │

| `users.js` | User CRUD + avatar upload | Manager+ |     │                   │                    │<────────────────────┤

| `products.js` | Product catalog management | All users (RBAC) |     │                   │                    │ Verify password     │

| `orders.js` | Order creation and management | All users |     │                   │                    │ Generate JWT        │

| `consumables.js` | Consumables catalog | All users (RBAC) |     │                   │                    │ Store refresh token │

| `filters.js` | Filters/parts catalog | All users (RBAC) |     │                   │                    ├────────────────────>│

| `audit-logs.js` | Audit trail access | Admin only |     │                   │                    │ Token stored        │

| `inventory.js` | Stock level management | Manager+ |     │                   │                    │<────────────────────┤

| `settings.js` | Site configuration | Manager+ (admin for updates) |     │                   │ JWT + refresh      │                     │

| `notifications.js` | User notifications | Self or admin |     │                   │<───────────────────┤                     │

| `notification-preferences.js` | Notification settings | Self |     │ 200 OK + tokens   │                    │                     │

| `health.js` | Database health check | Public |     │<──────────────────┤                    │                     │

| `public-config.js` | Public config (Auth0 status) | Public |     │ Store in memory   │                    │                     │

| `public-stats.js` | Public statistics | Public |     │                   │                    │                     │

| `avatar-initials.js` | Generate initials avatar | Public |```



### Middleware & Utilities### API Request Flow (Authenticated)



#### utils/fn.js```

┌─────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐

Error handling wrapper for all functions:│ Browser │         │  CDN     │         │Function  │         │ Database │

└────┬────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘

```javascript     │                   │                    │                     │

const withHandler = (handler) => async (event) => {     │ GET /users (with JWT)                  │                     │

  try {     ├──────────────────>│                    │                     │

    return await handler(event);     │                   │ Forward + JWT      │                     │

  } catch (err) {     │                   ├───────────────────>│                     │

    return error(500, err.message);     │                   │                    │ Verify JWT          │

  }     │                   │                    │ Check permissions   │

};     │                   │                    │ Query database      │

     │                   │                    ├────────────────────>│

const error = (statusCode, message, details) => ({     │                   │                    │ Results             │

  statusCode,     │                   │                    │<────────────────────┤

  body: JSON.stringify({ error: message, details })     │                   │                    │ Log metrics         │

});     │                   │                    │ Log audit trail     │

```     │                   │ JSON response      │                     │

     │                   │<───────────────────┤                     │

#### utils/http.js     │ 200 OK + data     │                    │                     │

     │<──────────────────┤                    │                     │

Authentication and authorization middleware:     │                   │                    │                     │

```

```javascript

const requirePermission = async (event, resource, action) => {### Database Migration Flow

  // Extract JWT from Authorization header

  const token = event.headers.authorization?.replace('Bearer ', '');```

  ┌───────────┐         ┌──────────┐         ┌──────────┐

  // Verify JWT│  CI/CD    │         │Migration │         │ Database │

  const decoded = jwt.verify(token, process.env.JWT_SECRET);│  Pipeline │         │  Script  │         │          │

  └─────┬─────┘         └────┬─────┘         └────┬─────┘

  // Check RBAC permissions      │                    │                     │

  if (!hasPermission(decoded.role, resource, action)) {      │ Run migrations     │                     │

    throw new Error('Forbidden');      ├───────────────────>│                     │

  }      │                    │ Connect to DB       │

        │                    ├────────────────────>│

  return decoded;      │                    │ Connected           │

};      │                    │<────────────────────┤

```      │                    │ Check migrations table

      │                    ├────────────────────>│

#### utils/rbac.js      │                    │ Applied migrations  │

      │                    │<────────────────────┤

Role-based access control logic:      │                    │ Read migration files│

      │                    │ Compare with DB     │

```javascript      │                    │ Apply new migrations│

const permissions = {      │                    ├────────────────────>│

  mechanic: {      │                    │ Success             │

    products: ['read'],      │                    │<────────────────────┤

    orders: ['read', 'create']      │                    │ Record migration    │

  },      │                    ├────────────────────>│

  manager: {      │ Migration complete │                     │

    products: ['read', 'create', 'update'],      │<───────────────────┤                     │

    users: ['read'],      │                    │                     │

    orders: ['read', 'create', 'update']```

  },

  admin: {## Security Architecture

    '*': ['*']  // All permissions

  }### Authentication & Authorization

};

```

const hasPermission = (role, resource, action) => {┌────────────────────────────────────────────────────────────┐

  // Check if role has permission│                    Security Layers                         │

  // Supports wildcard and hierarchical roles│                                                            │

};│  Layer 1: HTTPS (Netlify CDN)                             │

```│  ├─ TLS 1.3                                               │

│  └─ Automatic certificate management                      │

#### utils/audit.js│                                                            │

│  Layer 2: JWT Authentication                              │

Audit logging helper:│  ├─ Short-lived access tokens (7 days)                   │

│  ├─ Long-lived refresh tokens (30 days)                  │

```javascript│  ├─ Token rotation on refresh                            │

const logAudit = async (userId, action, details, ipAddress) => {│  └─ Secure token storage (memory only)                   │

  await pool.query(│                                                            │

    'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',│  Layer 3: Role-Based Access Control (RBAC)               │

    [userId, action, details, ipAddress]│  ├─ Roles: admin, manager, staff, user                   │

  );│  ├─ Permissions per resource                             │

};│  └─ Middleware enforcement                               │

```│                                                            │

│  Layer 4: Rate Limiting                                   │

---│  ├─ Per-endpoint limits                                  │

│  ├─ IP-based tracking                                    │

## Database Layer│  └─ Progressive blocking                                 │

│                                                            │

### Connection Management│  Layer 5: Input Validation                                │

│  ├─ Schema validation                                    │

**Configuration**: `config/database.js`│  ├─ SQL injection prevention                             │

│  └─ XSS protection                                       │

```javascript│                                                            │

const { Pool } = require('pg');│  Layer 6: Audit Logging                                   │

│  ├─ All sensitive operations logged                      │

const pool = new Pool({│  ├─ Searchable audit trail                              │

  host: process.env.DB_HOST,│  └─ Compliance ready                                     │

  port: process.env.DB_PORT || 5432,└────────────────────────────────────────────────────────────┘

  user: process.env.DB_USER,```

  password: process.env.DB_PASSWORD,

  database: process.env.DB_NAME,### Data Security

  ssl: { rejectUnauthorized: false },

  max: 20,                      // Max connections- **Passwords**: Bcrypt hashed (12 rounds)

  idleTimeoutMillis: 30000,     // Close idle connections- **Tokens**: JWT signed with secret key

  connectionTimeoutMillis: 5000 // Connection timeout- **Sensitive Data**: Environment variables (never in code)

});- **Database**: Parameterized queries (SQL injection prevention)

- **API Keys**: Server-side only, never exposed to client

module.exports = { pool };

```## Deployment Architecture



### Schema Management### Primary Deployment (Netlify)



**Master Schema**: `database-schema.sql` (single source of truth)```

┌─────────────────────────────────────────────────────────────┐

**Migrations**: Sequential SQL files in `migrations/`│                    GitHub Repository                         │

- `001_add_product_categories.sql`│                    (Source Code)                             │

- `002_add_order_status_tracking.sql`└────────────────────────┬────────────────────────────────────┘

- `003_add_notification_system.sql`                         │

- `004_add_filters.sql`                         │ Push to main branch

                         ▼

**Migration Tracking**: `schema_migrations` table ensures idempotent execution┌─────────────────────────────────────────────────────────────┐

│                    GitHub Actions                            │

**Runner**: `scripts/run-migrations.js`│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │

│  │  Lint      │  │  Test      │  │  Build              │   │

```bash│  │  - ESLint  │  │  - Jest    │  │  - Tailwind CSS     │   │

# Dry run│  │  - HTML    │  │  - Smoke   │  │  - Migrations check │   │

node scripts/run-migrations.js --dry-run│  └─────┬──────┘  └─────┬──────┘  └──────────┬──────────┘   │

│        │               │                     │               │

# Apply pending migrations│        └───────────────┴─────────────────────┘               │

npm run migrate│                        │                                     │

```│                        ▼                                     │

│              ┌──────────────────┐                           │

---│              │  Deploy (if OK)  │                           │

│              └────────┬─────────┘                           │

## Security Architecture└───────────────────────┼──────────────────────────────────────┘

                        │

### Authentication                        ├────────────────┬─────────────────────┐

                        │                │                     │

**Primary**: JWT (JSON Web Tokens)                        ▼                ▼                     ▼

              ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐

**Flow**:              │   Netlify    │  │  FTP Server  │  │  Run Migrations  │

1. User submits credentials → `/auth?action=login`              │   (Primary)  │  │  (Mirror)    │  │  (Production DB) │

2. Backend validates → generates access token (7 days) + refresh token (30 days)              └──────────────┘  └──────────────┘  └──────────────────┘

3. Client stores access token in `localStorage.accessToken````

4. Client includes token in `Authorization: Bearer <token>` header

5. Backend verifies JWT on each request### Rollback Strategy

6. Client uses refresh token to get new access token before expiry

1. **Automatic Detection**: CI/CD fails if tests/build fails

**Optional**: Auth0 OAuth for social login2. **Manual Revert**: Git revert or reset

3. **Database Rollback**: Forward-fixing migrations only

### Authorization4. **Notification**: GitHub Actions summary + alerts



**RBAC System**: Three roles with hierarchical permissions## Performance Optimizations



| Role | Level | Permissions |### Frontend

|------|-------|-------------|- Static asset caching (1 year)

| **mechanic** | 1 | Read products, create/read own orders |- Lazy loading images

| **manager** | 2 | mechanic + create/update products, view all users |- Service worker caching

| **admin** | 3 | Full access including delete operations |- Minified CSS/JS



**Enforcement**: `requirePermission(event, resource, action)` middleware### Backend

- Connection pooling (PostgreSQL)

### Password Security- Query optimization with indexes

- Rate limiting to prevent abuse

**Hashing**: bcrypt with 12 rounds (via `utils/password.js`)- Efficient data serialization



```javascript### Database

const bcrypt = require('bcryptjs');- 20+ indexes on frequently queried fields

- Query result caching where appropriate

const hashPassword = async (password) => {- Regular maintenance (token pruning)

  return await bcrypt.hash(password, 12);

};### Monitoring

- Real-time metrics collection

const verifyPassword = async (password, hash) => {- Weekly performance reports

  return await bcrypt.compare(password, hash);- Alert thresholds for critical metrics

};

```## Scalability Considerations



**Validation**: Minimum 8 characters, complexity requirements enforced client + server### Current Architecture

- **Serverless**: Auto-scales with traffic

### 2FA (TOTP)- **CDN**: Global edge distribution

- **Database**: Managed service with auto-scaling

**Implementation**: TOTP (Time-based One-Time Password) via `speakeasy` library

### Future Improvements

**Flow**:- Redis caching layer for hot data

1. User requests setup → `/auth?action=2fa-setup`- Read replicas for database

2. Backend generates secret, returns QR code- GraphQL API for flexible queries

3. User scans QR with authenticator app- Event-driven architecture with message queues

4. User submits TOTP code → `/auth?action=2fa-enable`

5. Backend verifies code, enables 2FA (`totp_enabled = TRUE`)## Disaster Recovery

6. Subsequent logins require TOTP code

### Backup Strategy

### Rate Limiting- **Database**: Automated daily backups (Neon)

- **Code**: Git repository (GitHub)

**Login Attempts**: Max 5 failed attempts per email per 15 minutes- **Configuration**: Environment variables (encrypted)



**Tracking**: `login_attempts` table### Recovery Time Objectives

- **RTO**: < 1 hour for critical issues

```sql- **RPO**: < 24 hours for data loss

SELECT COUNT(*) FROM login_attempts

WHERE email = $1 AND attempt_time > NOW() - INTERVAL '15 minutes';### Incident Response

```1. Detect issue (monitoring alerts)

2. Assess impact (check logs/metrics)

**Lockout**: Return `429 Too Many Requests` if limit exceeded3. Execute rollback (documented procedures)

4. Verify recovery (smoke tests)

### SQL Injection Prevention5. Post-mortem (document lessons learned)



**Parameterized Queries**: All database queries use parameterized statements---



```javascript**Document Version**: 1.0.0  

// ✅ Safe**Last Updated**: 2025-10-31  

await pool.query('SELECT * FROM users WHERE email = $1', [email]);**Maintained By**: Development Team


// ❌ Never do this
await pool.query(`SELECT * FROM users WHERE email = '${email}'`);
```

---

## Deployment Architecture

### Netlify Deployment

**Trigger**: Push to `main` branch

**Build Process**:
1. Install dependencies: `npm install`
2. Build CSS: `npm run build:css`
3. Run tests: `npm run test`
4. Deploy static files → Netlify CDN
5. Deploy functions → Netlify Functions runtime

**Configuration**: `netlify.toml`

```toml
[build]
  command = "npm run build:css"
  publish = "."
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### FTP Mirror (Optional)

**Trigger**: Push to `main` branch (GitHub Actions)

**Workflow**: `.github/workflows/main.yml`

```yaml
name: Deploy via FTP
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to FTP
        uses: SamKirkland/FTP-Deploy-Action@4.0.0
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
```

**Note**: FTP mirror serves static files only (no serverless functions)

### Environment Variables

**Netlify Dashboard**: Settings → Environment Variables

**Required**:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`

**Optional**:
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_AUDIENCE`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`

---

## Data Flow

### User Login Flow

```
1. User submits email + password → frontend form
2. JavaScript POST to /.netlify/functions/auth?action=login
3. Backend validates credentials (bcrypt comparison)
4. Backend checks 2FA status
5. Backend generates JWT access + refresh tokens
6. Backend returns tokens + user object
7. Frontend stores access token in localStorage
8. Frontend redirects to dashboard
9. Audit log entry created (user:login)
```

### Product Catalog Query Flow

```
1. User visits oil-products.html
2. JavaScript GET to /.netlify/functions/products
3. Backend verifies JWT from Authorization header
4. Backend queries database with filters/pagination
5. Database returns products (with full-text search if query param)
6. Backend formats response with pagination metadata
7. Frontend renders product cards
8. User interactions (search, filter) trigger new API calls
```

### Order Creation Flow

```
1. User adds items to cart (frontend state)
2. User submits order → POST /.netlify/functions/orders
3. Backend verifies JWT
4. Backend validates inventory availability
5. Backend creates order record (status: pending)
6. Backend creates order_items records
7. Backend updates inventory table (stock_count -= quantity)
8. Backend creates audit log entry (order:create)
9. Backend creates notification for user (order confirmed)
10. Backend returns order ID + details
11. Frontend displays confirmation
```

---

## Performance Optimizations

### Frontend

- **Asset Caching**: 1-year cache for CSS/JS/images
- **Minification**: TailwindCSS purge (80% smaller CSS)
- **Lazy Loading**: Images load on scroll
- **Service Worker**: Offline asset caching

### Backend

- **Connection Pooling**: Reuse database connections (max 20)
- **Query Optimization**: Indexed columns, EXPLAIN ANALYZE for slow queries
- **Serverless Cold Start**: Minimal dependencies, fast imports

### Database

- **Indexes**: 20+ indexes on frequently queried columns
- **Full-Text Search**: PostgreSQL GIN indexes for products/filters
- **Partitioning**: Order tables partitioned by date (future optimization)

**Metrics**:
- Page load: <2s (was 3.5s)
- API response: <100ms p95 (was 500ms)
- Lighthouse score: 95/100

---

## Monitoring

### Health Checks

**Endpoint**: `/.netlify/functions/health`

**Checks**:
- Database connectivity
- Connection pool status
- System timestamp

**Monitoring**: Netlify uptime monitoring (alerts on failures)

### Audit Logs

**Location**: `audit_logs` table (database)

**UI**: `audit-logs.html` (admin only)

**Search/Export**: Filter by user, action, date range

**Retention**: Archive logs older than 1 year

### Error Tracking

**Frontend**: Global error handler in `assets/js/error-tracker.js`

```javascript
window.ErrorTracker = {
  log: [],
  capture: (error) => {
    // Store error details
    // Send to backend (future: external service)
  }
};
```

**Backend**: Function wrapper logs all errors to Netlify logs

---

## Scalability

### Current Limits

- **Database**: Neon serverless scales automatically (no connection limit)
- **Functions**: Netlify Functions scale automatically (1000 concurrent executions)
- **CDN**: Netlify CDN unlimited bandwidth

### Future Scaling Strategies

1. **Database Read Replicas**: For heavy read workloads
2. **Redis Caching**: Cache frequent queries (products, settings)
3. **Background Jobs**: Queue system for async tasks (emails, reports)
4. **CDN Assets**: Move images to dedicated CDN (Cloudinary, imgix)

---

## Support

- **Architecture Diagrams**: Mermaid diagrams in code comments
- **Code Documentation**: JSDoc comments in all utilities
- **API Docs**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Database Schema**: [DATABASE.md](DATABASE.md)

---

**Last Updated**: 2025-11-11  
**Maintained By**: Development Team

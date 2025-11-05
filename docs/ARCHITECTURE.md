# System Architecture

This document provides a comprehensive overview of the joshburt.com.au application architecture.

## Table of Contents
- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Component Details](#component-details)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)

## System Overview

The joshburt.com.au application is a modern, serverless web application built on:
- **Frontend**: Static HTML/CSS/JavaScript with TailwindCSS
- **Backend**: Netlify Serverless Functions (Node.js)
- **Database**: PostgreSQL (Neon)
- **Hosting**: Netlify (primary), FTP mirror (secondary)
- **CI/CD**: GitHub Actions

### Key Characteristics
- **Serverless Architecture**: No dedicated server, scales automatically
- **PostgreSQL Database**: Production-ready database with connection pooling
- **Progressive Enhancement**: Works without JavaScript, enhanced with it
- **Mobile-First**: Responsive design for all screen sizes

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Static HTML │  │  JavaScript  │  │  Service Worker (PWA)    │  │
│  │  + CSS       │  │  (ES6+)      │  │  (Offline Caching)       │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │
│         │                 │                       │                  │
└─────────┼─────────────────┼───────────────────────┼──────────────────┘
          │                 │                       │
          │                 │                       │
          ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         NETLIFY CDN                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Edge Caching (Static Assets)                               │   │
│  │  - HTML, CSS, JavaScript, Images                            │   │
│  │  - Cache-Control: max-age=31536000 (1 year)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          │
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NETLIFY FUNCTIONS (Serverless)                    │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  auth.js     │  │  users.js    │  │  products.js             │  │
│  │  - Login     │  │  - CRUD      │  │  - List/Create           │  │
│  │  - Register  │  │  - Roles     │  │  - Categories            │  │
│  │  - JWT       │  │  - Stats     │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │
│         │                 │                       │                  │
│  ┌──────┴─────────────────┴───────────────────────┴──────────────┐  │
│  │                  Shared Utilities                              │  │
│  │  - database.js (DB abstraction)                               │  │
│  │  - auth-middleware.js (JWT verification)                      │  │
│  │  - metrics-collector.js (Monitoring)                          │  │
│  │  - log-aggregator.js (Logging)                                │  │
│  └────────────────────────────────┬──────────────────────────────┘  │
└───────────────────────────────────┼──────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                                │
│                                                                       │
│  ┌────────────────────────────┐                                      │
│  │  PostgreSQL (Neon)         │                                      │
│  │  - Production database     │                                      │
│  │  - Connection pooling      │                                      │
│  │  - Managed backups         │                                      │
│  └────────────────────────────┘                                      │
│                                                                       │
│  Schema Tables:                                                       │
│  - users, products, orders, consumables                              │
│  - refresh_tokens, audit_logs, schema_migrations                    │
│  - settings, notifications, notification_preferences                │
└─────────────────────────────────────────────────────────────────────┘
          │
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      MONITORING & LOGGING                            │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Metrics         │  │  Logs            │  │  Reports         │  │
│  │  - Request rate  │  │  - Aggregated    │  │  - Weekly        │  │
│  │  - Error rate    │  │  - Searchable    │  │  - Performance   │  │
│  │  - Response time │  │  - Rotating      │  │  - Automated     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
          │
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CI/CD PIPELINE                               │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  GitHub Actions                                              │   │
│  │                                                              │   │
│  │  1. On Push:                                                │   │
│  │     - Lint (ESLint, HTMLHint)                              │   │
│  │     - Test (Jest)                                          │   │
│  │     - Build (Tailwind CSS)                                 │   │
│  │     - Migrate (Database dry-run)                           │   │
│  │     - Deploy (FTP + Netlify)                               │   │
│  │                                                              │   │
│  │  2. Nightly (2 AM UTC):                                     │   │
│  │     - Security audit                                        │   │
│  │     - Token cleanup                                         │   │
│  │     - Dependency check                                      │   │
│  │                                                              │   │
│  │  3. Weekly (Monday 9 AM):                                   │   │
│  │     - Performance reports                                   │   │
│  │     - Metrics analysis                                      │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend Layer

#### Static Assets
- **HTML Pages**: Templated pages with shared components
- **CSS**: TailwindCSS v4 with custom theme system
- **JavaScript**: Vanilla ES6+ modules, no framework dependencies
- **Service Worker**: Progressive Web App with offline caching

#### Key Features
- Multi-theme support (dark, light, system, custom)
- Responsive design (mobile-first)
- Accessibility compliant (WCAG 2.1 AA)
- Progressive enhancement

### Backend Layer

#### Serverless Functions
Located in `/netlify/functions/`:

1. **Authentication** (`auth.js`)
   - Register, login, logout, refresh token
   - JWT-based authentication
   - Password reset, email verification
   - Auth0 OAuth integration (optional)

2. **Users** (`users.js`)
   - CRUD operations for user management
   - Role-based access control (RBAC)
   - User statistics and analytics

3. **Products** (`products.js`, `consumables.js`)
   - Product catalog management
   - Categories and inventory
   - Order processing

4. **Orders** (`orders.js`)
   - Order creation and tracking
   - Status management
   - Order history

5. **Audit Logs** (`audit-logs.js`)
   - Activity tracking
   - Security monitoring
   - Compliance logging

6. **Monitoring** (`health.js`, `metrics.js`)
   - Health checks
   - Performance metrics
   - System status

#### Shared Utilities
Located in `utils/` and `config/`:

- **database.js**: Database abstraction layer
- **auth-middleware.js**: JWT verification
- **metrics-collector.js**: Custom metrics collection
- **log-aggregator.js**: Centralized logging
- **rbac.js**: Role-based access control
- **rate-limit.js**: Request rate limiting

### Database Layer

#### Schema Design
- **Normalized schema** with proper indexes
- **Audit trail** for all critical operations
- **Soft deletes** where appropriate
- **Migration tracking** via `schema_migrations` table

#### Database Types
1. **PostgreSQL (Production)**
   - Hosted on Neon
   - Connection pooling
   - Automatic backups
   - High availability

### Monitoring & Logging

#### Metrics Collection
- Request/response metrics
- Error tracking
- Performance monitoring
- Database query metrics

#### Log Aggregation
- Centralized logging
- Log rotation (daily files)
- Searchable logs
- Log cleanup (30-day retention)

#### Reporting
- Weekly performance reports
- Automated analysis
- Recommendations based on metrics

## Data Flow

### User Authentication Flow

```
┌─────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ Browser │         │  CDN     │         │ auth.js  │         │ Database │
└────┬────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                   │                    │                     │
     │ POST /auth?action=login                │                     │
     ├──────────────────>│                    │                     │
     │                   │ Forward request    │                     │
     │                   ├───────────────────>│                     │
     │                   │                    │ Query user          │
     │                   │                    ├────────────────────>│
     │                   │                    │ User data           │
     │                   │                    │<────────────────────┤
     │                   │                    │ Verify password     │
     │                   │                    │ Generate JWT        │
     │                   │                    │ Store refresh token │
     │                   │                    ├────────────────────>│
     │                   │                    │ Token stored        │
     │                   │                    │<────────────────────┤
     │                   │ JWT + refresh      │                     │
     │                   │<───────────────────┤                     │
     │ 200 OK + tokens   │                    │                     │
     │<──────────────────┤                    │                     │
     │ Store in memory   │                    │                     │
     │                   │                    │                     │
```

### API Request Flow (Authenticated)

```
┌─────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ Browser │         │  CDN     │         │Function  │         │ Database │
└────┬────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                   │                    │                     │
     │ GET /users (with JWT)                  │                     │
     ├──────────────────>│                    │                     │
     │                   │ Forward + JWT      │                     │
     │                   ├───────────────────>│                     │
     │                   │                    │ Verify JWT          │
     │                   │                    │ Check permissions   │
     │                   │                    │ Query database      │
     │                   │                    ├────────────────────>│
     │                   │                    │ Results             │
     │                   │                    │<────────────────────┤
     │                   │                    │ Log metrics         │
     │                   │                    │ Log audit trail     │
     │                   │ JSON response      │                     │
     │                   │<───────────────────┤                     │
     │ 200 OK + data     │                    │                     │
     │<──────────────────┤                    │                     │
     │                   │                    │                     │
```

### Database Migration Flow

```
┌───────────┐         ┌──────────┐         ┌──────────┐
│  CI/CD    │         │Migration │         │ Database │
│  Pipeline │         │  Script  │         │          │
└─────┬─────┘         └────┬─────┘         └────┬─────┘
      │                    │                     │
      │ Run migrations     │                     │
      ├───────────────────>│                     │
      │                    │ Connect to DB       │
      │                    ├────────────────────>│
      │                    │ Connected           │
      │                    │<────────────────────┤
      │                    │ Check migrations table
      │                    ├────────────────────>│
      │                    │ Applied migrations  │
      │                    │<────────────────────┤
      │                    │ Read migration files│
      │                    │ Compare with DB     │
      │                    │ Apply new migrations│
      │                    ├────────────────────>│
      │                    │ Success             │
      │                    │<────────────────────┤
      │                    │ Record migration    │
      │                    ├────────────────────>│
      │ Migration complete │                     │
      │<───────────────────┤                     │
      │                    │                     │
```

## Security Architecture

### Authentication & Authorization

```
┌────────────────────────────────────────────────────────────┐
│                    Security Layers                         │
│                                                            │
│  Layer 1: HTTPS (Netlify CDN)                             │
│  ├─ TLS 1.3                                               │
│  └─ Automatic certificate management                      │
│                                                            │
│  Layer 2: JWT Authentication                              │
│  ├─ Short-lived access tokens (7 days)                   │
│  ├─ Long-lived refresh tokens (30 days)                  │
│  ├─ Token rotation on refresh                            │
│  └─ Secure token storage (memory only)                   │
│                                                            │
│  Layer 3: Role-Based Access Control (RBAC)               │
│  ├─ Roles: admin, manager, staff, user                   │
│  ├─ Permissions per resource                             │
│  └─ Middleware enforcement                               │
│                                                            │
│  Layer 4: Rate Limiting                                   │
│  ├─ Per-endpoint limits                                  │
│  ├─ IP-based tracking                                    │
│  └─ Progressive blocking                                 │
│                                                            │
│  Layer 5: Input Validation                                │
│  ├─ Schema validation                                    │
│  ├─ SQL injection prevention                             │
│  └─ XSS protection                                       │
│                                                            │
│  Layer 6: Audit Logging                                   │
│  ├─ All sensitive operations logged                      │
│  ├─ Searchable audit trail                              │
│  └─ Compliance ready                                     │
└────────────────────────────────────────────────────────────┘
```

### Data Security

- **Passwords**: Bcrypt hashed (12 rounds)
- **Tokens**: JWT signed with secret key
- **Sensitive Data**: Environment variables (never in code)
- **Database**: Parameterized queries (SQL injection prevention)
- **API Keys**: Server-side only, never exposed to client

## Deployment Architecture

### Primary Deployment (Netlify)

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│                    (Source Code)                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Push to main branch
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions                            │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │  Lint      │  │  Test      │  │  Build              │   │
│  │  - ESLint  │  │  - Jest    │  │  - Tailwind CSS     │   │
│  │  - HTML    │  │  - Smoke   │  │  - Migrations check │   │
│  └─────┬──────┘  └─────┬──────┘  └──────────┬──────────┘   │
│        │               │                     │               │
│        └───────────────┴─────────────────────┘               │
│                        │                                     │
│                        ▼                                     │
│              ┌──────────────────┐                           │
│              │  Deploy (if OK)  │                           │
│              └────────┬─────────┘                           │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ├────────────────┬─────────────────────┐
                        │                │                     │
                        ▼                ▼                     ▼
              ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
              │   Netlify    │  │  FTP Server  │  │  Run Migrations  │
              │   (Primary)  │  │  (Mirror)    │  │  (Production DB) │
              └──────────────┘  └──────────────┘  └──────────────────┘
```

### Rollback Strategy

1. **Automatic Detection**: CI/CD fails if tests/build fails
2. **Manual Revert**: Git revert or reset
3. **Database Rollback**: Forward-fixing migrations only
4. **Notification**: GitHub Actions summary + alerts

## Performance Optimizations

### Frontend
- Static asset caching (1 year)
- Lazy loading images
- Service worker caching
- Minified CSS/JS

### Backend
- Connection pooling (PostgreSQL)
- Query optimization with indexes
- Rate limiting to prevent abuse
- Efficient data serialization

### Database
- 20+ indexes on frequently queried fields
- Query result caching where appropriate
- Regular maintenance (token pruning)

### Monitoring
- Real-time metrics collection
- Weekly performance reports
- Alert thresholds for critical metrics

## Scalability Considerations

### Current Architecture
- **Serverless**: Auto-scales with traffic
- **CDN**: Global edge distribution
- **Database**: Managed service with auto-scaling

### Future Improvements
- Redis caching layer for hot data
- Read replicas for database
- GraphQL API for flexible queries
- Event-driven architecture with message queues

## Disaster Recovery

### Backup Strategy
- **Database**: Automated daily backups (Neon)
- **Code**: Git repository (GitHub)
- **Configuration**: Environment variables (encrypted)

### Recovery Time Objectives
- **RTO**: < 1 hour for critical issues
- **RPO**: < 24 hours for data loss

### Incident Response
1. Detect issue (monitoring alerts)
2. Assess impact (check logs/metrics)
3. Execute rollback (documented procedures)
4. Verify recovery (smoke tests)
5. Post-mortem (document lessons learned)

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-10-31  
**Maintained By**: Development Team

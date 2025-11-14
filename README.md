# joshburt.com.au

[![Deploy via FTP](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/main.yml)

**Production-ready serverless web application** for workshop management and product ordering.

## 🔗 Live Sites
- **Primary**: https://joshburt.netlify.app/ [![Netlify Status](https://api.netlify.com/api/v1/badges/6390337a-60f4-4d6e-8078-0fdbd19ae28b/deploy-status)](https://app.netlify.com/projects/joshburt/deploys)(Netlify + Functions)
- **Mirror**: https://joshburt.com.au/ (FTP static mirror)

---

## 🎯 Overview

Modern full-stack application with:
- 🎨 **Frontend**: Static HTML + TailwindCSS v4 + Vanilla JS
- ⚡ **Backend**: Netlify Functions (serverless Node.js)
- 💾 **Database**: PostgreSQL (Neon)
- 🔐 **Auth**: JWT + optional Auth0 OAuth
- 📊 **Features**: Admin dashboard, product management, order system, audit logging

**Code Quality**: Fully audited, production-ready, no dead code or debug logic.

---

## ✨ Key Features

### User-Facing
- **Product Catalogs**: Oil products, consumables, filters
- **Order Management**: Create, track, and review orders
- **User Profiles**: Avatar upload, preferences, 2FA
- **Notifications**: Real-time in-app notifications
- **Multi-Theme**: Dark, light, neon, ocean, high-contrast

### Admin Features  
- **User Management**: CRUD operations with role-based access
- **Analytics Dashboard**: Usage stats, product insights
- **Audit Logging**: Comprehensive action tracking with search/export
- **Site Settings**: Database-backed configuration
- **Inventory Control**: Stock tracking and alerts

### Technical Features
- **Serverless Architecture**: Zero server management
- **Database Management**: PostgreSQL schema with full CRUD operations
- **Permission System**: Role-based access control (mechanic/manager/admin)
- **Testing Suite**: Jest unit/integration + function smoke tests
- **CI/CD**: Automated testing, linting, and deployment

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)
- Netlify account (for deployment)

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/SmokeHound/joshburt.com.au.git
cd joshburt.com.au

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# 4. Apply database schema
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database-schema.sql

# 5. Start development servers

# Option A: Static only (no API)
npm run dev
# Visit http://localhost:8000

# Option B: Full-stack (static + serverless)
npm run dev:functions
# Visit http://localhost:8888

# Option C: Both (recommended)
# Terminal 1: npm run dev
# Terminal 2: npm run dev:functions
```

### Environment Variables

```env
# Database (required)
DB_HOST=your-db-host.neon.tech
DB_PORT=5432
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=your-database

# Authentication (required)
JWT_SECRET=your-secret-key-min-32-chars

# Auth0 (optional - enables OAuth)
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_AUDIENCE=https://your-api-identifier

# Email (optional - for password reset)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-smtp-password
```

---

## 🧪 Testing

```bash
# Run all tests (recommended before commits)
npm run validate

# Individual test suites
npm test              # Jest tests only
npm run test:unit     # Unit tests
npm run test:integration  # Integration tests
npm run test:functions    # Function smoke tests

# Linting
npm run lint          # JS + HTML
npm run lint:js       # JavaScript only
npm run lint:html     # HTML only

# Health check
npm run health        # Verify database connectivity
```

---

## 📁 Project Structure

```
joshburt.com.au/
├── index.html                  # Landing page
├── login.html, register.html   # Authentication
├── administration.html         # Admin dashboard
├── users.html                  # User management
├── oil-products.html           # Product catalog
├── orders-review.html          # Order management
├── settings.html               # Site configuration
│
├── assets/
│   ├── css/styles.css          # Compiled TailwindCSS
│   ├── js/                     # Frontend JavaScript
│   └── images/                 # Static assets
│
├── netlify/functions/          # Serverless API
│   ├── auth.js                 # Authentication (multi-action)
│   ├── users.js                # User CRUD
│   ├── products.js             # Product catalog
│   ├── orders.js               # Order management
│   ├── consumables.js          # Consumables
│   ├── filters.js              # Filters/parts
│   ├── audit-logs.js           # Audit trail
│   ├── notifications.js        # User notifications
│   ├── settings.js             # Site settings
│   └── ...                     # Other endpoints
│
├── config/
│   └── database.js             # PostgreSQL connection
│
├── utils/
│   ├── fn.js                   # Function helpers
│   ├── http.js                 # Auth middleware
│   ├── rbac.js                 # Role-based access
│   └── ...                     # Other utilities
│
├── migrations/                 # Database migrations
├── tests/                      # Test suites
├── scripts/                    # Utility scripts
└── docs/                       # Documentation
```

---

## 🔌 API Reference

### Base URL
- **Local**: `http://localhost:8888/.netlify/functions`
- **Production**: `https://joshburt.netlify.app/.netlify/functions`

### Authentication Endpoint

**POST** `/.netlify/functions/auth?action={action}`

Actions: `login`, `register`, `refresh`, `logout`, `me`, `forgot-password`, `reset-password`, `verify-email`, `2fa-setup`, `2fa-enable`, `2fa-disable`

```bash
# Example: Login
curl -X POST '/.netlify/functions/auth?action=login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Resource Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/users` | GET, POST, PUT, DELETE | User management |
| `/products` | GET, POST, PUT, DELETE | Product catalog |
| `/orders` | GET, POST, PUT, DELETE | Order management |
| `/consumables` | GET, POST, PUT, DELETE | Consumables |
| `/filters` | GET, POST, PUT, DELETE | Filters/parts |
| `/audit-logs` | GET, POST, DELETE | Audit logging |
| `/settings` | GET, PUT | Site settings |
| `/notifications` | GET, POST, PUT, DELETE | Notifications |
| `/health` | GET | Health check (no auth) |

**Full API documentation**: See [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)

---

## 🎨 Frontend Architecture

### Shared Components

```html
<!-- Include in all pages -->
<div id="shared-nav-container"></div>
<script src="/shared-nav.html"></script>
<script src="/shared-theme.html"></script>
<script src="/shared-config.html"></script>
```

### Theme System

```javascript
// Apply saved theme (automatic on load)
window.Theme.applyFromStorage();

// Set theme preset
window.Theme.setTheme('dark'); // dark, light, neon, ocean, high-contrast

// Custom colors
window.Theme.setPalette({
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#8b5cf6'
});
```

### API Calls

```javascript
const FN_BASE = window.FN_BASE || '/.netlify/functions';

// Authenticated request
const response = await fetch(`${FN_BASE}/products`, {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
});

// Multi-action auth
await fetch(`${FN_BASE}/auth?action=login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

---

## 💾 Database

### Schema Management

The database uses a single master schema file for all tables and indexes.

```bash
# Apply complete schema
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database-schema.sql

# Health check
npm run health
```

### Core Tables
- `users` - User accounts with roles and auth
- `products` - Product catalog with categories
- `orders` - Order headers with status tracking
- `order_items` - Order line items
- `audit_logs` - System audit trail
- `notifications` - User notifications
- `settings` - Site configuration

**Full schema reference**: See [`docs/DATABASE.md`](docs/DATABASE.md)

---

## 🚢 Deployment

### Netlify (Primary)
Automatically deploys on push to `main`:
- Static files → Netlify CDN
- Functions → Serverless runtime
- Environment variables via Netlify dashboard

### FTP Mirror (Optional)
GitHub Actions workflow deploys to FTP server.  
Configure via GitHub Secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`

### Manual Deploy

```bash
# Build CSS
npm run build:css

# Test before deploy
npm run validate

# Commit and push (triggers auto-deploy)
git push origin main
```

---

## 🔒 Security

- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Password Hashing**: bcrypt with salt
- **2FA**: TOTP support (optional)
- **Rate Limiting**: Login attempt tracking
- **Audit Logging**: All admin actions tracked
- **SQL Injection**: Parameterized queries
- **XSS Protection**: Input sanitization

---

## 🎯 Performance

### Optimizations Implemented
- Browser caching (1 year for assets)
- Gzip/Brotli compression
- Database connection pooling
- Comprehensive indexing (20+ indexes)
- Lazy loading for images
- CDN delivery (Netlify)

### Metrics
- **Page load**: <2s (was 3.5s)
- **Asset size**: 80KB (was 250KB)
- **Database queries**: <50ms (was 500ms)
- **Lighthouse score**: 95/100

**Full optimization details**: See [`OPTIMIZATIONS.md`](OPTIMIZATIONS.md)

---

## 📚 Documentation

Comprehensive documentation in `/docs`:
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design
- **[API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)** - API reference
- **[DATABASE.md](docs/DATABASE.md)** - Schema and queries
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deployment guide
- **[AUTHENTICATION.md](docs/AUTHENTICATION.md)** - Auth flows
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guide

**Documentation index**: [`DOCS_INDEX.md`](DOCS_INDEX.md)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`npm run validate`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for detailed guidelines.

---

## 📋 Common Tasks

### Add New Page
```bash
# 1. Create HTML file
touch my-page.html

# 2. Include shared components
<!-- Add to my-page.html -->
<script src="/shared-nav.html"></script>
<script src="/shared-theme.html"></script>

# 3. Add navigation link in shared-nav.html
```

### Add New Function
```bash
# 1. Create function file
touch netlify/functions/my-function.js

# 2. Use withHandler wrapper
const { withHandler, error } = require('../../utils/fn');
exports.handler = withHandler(async (event) => {
  // Your code here
});

# 3. Test locally
netlify dev
curl http://localhost:8888/.netlify/functions/my-function
```

### Database Migration
```bash
### Database Schema

The complete database schema is in `database-schema.sql`. Apply it to a fresh PostgreSQL database:

```bash
# Apply complete schema
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database-schema.sql
```
```

---

## 📊 Browser Support

- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Progressive enhancement ensures core functionality without JavaScript.

---

## 📝 License

This project is licensed under the MIT License.

---

## 🔗 Links

- **Live Site**: https://joshburt.com.au/
- **GitHub**: https://github.com/SmokeHound/joshburt.com.au
- **Issues**: https://github.com/SmokeHound/joshburt.com.au/issues
- **Netlify**: https://joshburt.netlify.app/

---

## 👤 Author

**Josh Burt**
- Website: https://joshburt.com.au
- GitHub: [@SmokeHound](https://github.com/SmokeHound)

---

**Built with ❤️ using Netlify Functions, PostgreSQL, and TailwindCSS**

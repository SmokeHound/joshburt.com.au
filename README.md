# Josh Burt - Website with Server-Side Authentication

[![🚀 Deploy website via FTP on push.](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/main.yml)

# Links to site
- https://joshburt.netlify.app/
- https://joshburt.com.au/
- https://joshburt-com-au.onrender.com/

## Overview
This is a modern, production-ready website for joshburt.com.au featuring a modular component architecture, comprehensive testing, responsive design with dark/light mode support, admin dashboard functionality, and a dynamic Castrol oil product ordering system. The codebase is now 100% serverless (Netlify Functions) and has been fully audited for dead code, unused variables, and debug logic.

## ✨ Features
- **Modular Components**: Reusable shared components for navigation, theming, and configuration
- **Responsive Design**: Mobile-first approach with TailwindCSS v4
- **Feature Flags**: Toggleable features (Beta Features, New Dashboard, Advanced Reports) - see [FEATURE_FLAGS.md](FEATURE_FLAGS.md)
- **Testing Suite**: Unit and integration tests with Jest
- **CI/CD Pipeline**: Automated testing, linting, and deployment
- **Admin Dashboard**: User management, analytics, and site settings (fully database-driven)
- **Oil Ordering System**: Dynamic Castrol product ordering (API-driven, CSV export)
- **API Backend**: Serverless-only (Netlify Functions) with PostgreSQL / SQLite abstraction
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA attributes

## ⚙️ Site Settings (Database-Backed)

All site settings are now stored in the database and managed via the admin dashboard. Settings are loaded and saved via the `/settings` API endpoint and changes are fully audit-logged.

### Settings Fields

-- **Branding & Contact**
	- `siteTitle`, `siteDescription`, `logoUrl`, `faviconUrl`, `contactEmail`
- **Theme**
This is a modern, production-ready website for joshburt.com.au featuring a modular component architecture, comprehensive testing, responsive design, admin dashboard functionality, and a dynamic Castrol oil product ordering system. The backend has been fully migrated to Netlify Functions (serverless). 
- **Feature Toggles**
	- `maintenanceMode`, `enableRegistration`, `enableGuestCheckout`
- **API Backend**: Netlify Functions (serverless) with PostgreSQL / SQLite abstraction
	- `smtpHost`, `smtpPort`, `smtpUser`, `smtpPassword`
- **Custom Code**
### Component / Serverless Structure
- **`shared-nav.html`**: Navigation sidebar with menu toggle, user profile, and navigation links
- **`shared-theme.html`**: Centralized ThemeManager - handles multi-theme support, color palettes, and system theme detection
- **`shared-config.html`**: TailwindCSS configuration and common styles
- **`netlify/functions/*`**: Serverless backend for products, orders, users, authentication, audit logs, inventory, consumables

**Theming**: Centralized ThemeManager provides multi-theme support (dark, light, system, neon, ocean, high-contrast) with custom color palettes. All theme settings are stored in the database and synchronized across tabs. See the ThemeManager API section below for details.

### Feature Flags

Three feature flags are available in the settings page to enable/disable premium features:

- **Beta Features**: Experimental features including AI-Powered Insights, Predictive Analytics, and Advanced Automation (visible in Admin Dashboard)
- **New Dashboard**: Enhanced dashboard experience with improved UI and customizable widgets (links from Admin Dashboard)
- **Advanced Reports**: Premium analytics features including Customer Lifetime Value, Churn Rate, and comprehensive report generation (visible in Analytics page)

Features are dynamically shown/hidden based on flag status. Changes take effect immediately after saving settings. See [FEATURE_FLAGS.md](FEATURE_FLAGS.md) for detailed documentation.

Demo page available at `feature-flags-demo.html` for testing.

### ThemeManager API

The centralized ThemeManager (loaded from `shared-theme.html`) provides a consistent theming system across all pages:

**Available Theme Presets:**
- `dark` - Default dark theme with blue/green/purple palette
- `light` - Light theme with same palette
- `system` - Automatically follows OS dark/light preference
- `neon` - Dark theme with cyan/neon green/magenta palette
- `ocean` - Dark theme with ocean blue palette
- `high-contrast` - Dark theme with maximum contrast colors

**JavaScript API (window.Theme):**
```javascript
// Apply theme from localStorage (called automatically on page load)
window.Theme.applyFromStorage();

// Set a theme preset
window.Theme.setTheme('neon'); // persists to localStorage by default
window.Theme.setTheme('ocean', false); // don't persist

// Set custom color palette
window.Theme.setPalette({
  primary: '#ff0000',
  secondary: '#00ff00',
  accent: '#0000ff'
});

// Get current active theme
const active = window.Theme.getActiveTheme();
// Returns: { id: 'dark', resolvedId: 'dark', mode: 'dark', colors: {...} }

// Get available presets
const presets = window.Theme.getPresets();
// Returns: ['dark', 'light', 'high-contrast', 'neon', 'ocean']
```

**Events:**
- ThemeManager listens for `siteSettingsUpdated` custom event (dispatched by settings.html after save)
- Automatically synchronizes theme changes across browser tabs via storage events
- Responds to OS theme changes when theme is set to 'system'

**Backward Compatibility:**
- Honors existing `localStorage('siteSettings')` theme and color settings
- Supports legacy `localStorage('theme')` key
- Existing inline color application scripts work alongside ThemeManager (idempotent)

### Audit Logging (Enhanced)

The audit log system now supports:

- Server-side pagination (`page`, `pageSize`) with legacy `limit` fallback
- Free-text search (`q`) across `action`, `details`, and `user_id`
- Filtering by `action`, `userId`, `startDate`, `endDate`
- CSV export (`format=csv`) and JSON export (default)
- Bulk deletion via `DELETE /.netlify/functions/audit-logs` with optional `olderThanDays=N`
- Lazy-loaded modular UI (`assets/js/audit-ui.js`) mounted only when `#audit-log-root` exists

Example:
```bash
curl '/.netlify/functions/audit-logs?page=1&pageSize=50&q=settings'
curl '/.netlify/functions/audit-logs?action=user_login&format=csv' -o login-events.csv
curl -X DELETE '/.netlify/functions/audit-logs?olderThanDays=90'
```

UI Features:
- Debounced search input
- Adjustable page size (10/25/50/100)
- Export buttons (JSON / CSV)
- Clear button (with confirmation)

See `DATABASE.md` for full parameter reference.
## 🏗️ Architecture

### Development Server Options

```bash
# Static-only development (HTML/CSS/JS)
npm run dev
# Or: python3 -m http.server 8000
# Visit http://localhost:8000

# Netlify Functions local dev (for API endpoints)
npm run dev:functions
# Visit http://localhost:8888

# Health check (verify functions are running)
npm run health

# For full-stack development:
# Terminal 1: npm run dev
# Terminal 2: npm run dev:functions
```
- **`shared-config.html`**: TailwindCSS configuration and common styles
- **`API/Netlify Functions`**: Dynamic backend for products, orders, users, and authentication
### Automated Deployment
- **Netlify**: Deploys static assets + functions (primary runtime)
- **FTP Deployment**: Still available for static mirror (optional)

Serverless endpoints are accessible at:

```
/.netlify/functions/auth
/.netlify/functions/users
/.netlify/functions/orders
/.netlify/functions/products
/.netlify/functions/audit-logs
/.netlify/functions/inventory
/.netlify/functions/consumables
/.netlify/functions/consumable-categories
/.netlify/functions/public-config
```

Auth actions use a query/body `action` parameter, e.g. `/.netlify/functions/auth?action=login`.
When `AUTH0_DOMAIN` is set, Auth0 RS256 JWTs are accepted and users are auto-provisioned by default unless `AUTH0_AUTO_PROVISION=false`.
- **`consumables.html`**: Consumables order request page (for workshop staff)
- **`consumables-mgmt.html`**: Consumables product list management (admin/staff CRUD)
- Secure serverless endpoints (JWT auth, audit logging)

## 🚀 Quick Start
- Dynamic features require serverless environment (Netlify Functions). Static mirrors will show UI but API calls fail.

### Development Setup
```bash
# Clone the repository
git clone https://github.com/SmokeHound/joshburt.com.au.git
cd joshburt.com.au

# Install dependencies
npm install

# Start static development server
python3 -m http.server 8000
# Or use: npx http-server . -p 8000
# Visit http://localhost:8000
```

### Testing
```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run linting (JS + HTML)
npm run lint

# Run complete validation (lint + build + tests)
npm run validate
```

### Version Management

Semantic versioning scripts for releasing new versions:

```bash
# Patch version (1.0.0 -> 1.0.1) - Bug fixes
npm run version:patch

# Minor version (1.0.0 -> 1.1.0) - New features, backward compatible
npm run version:minor

# Major version (1.0.0 -> 2.0.0) - Breaking changes
npm run version:major
```

These commands automatically:
- Update `package.json` version
- Create a git commit with the new version
- Create a git tag (e.g., `v1.1.0`)

After versioning, push the tag to GitHub:
```bash
git push origin --tags
```

**Note for Windows**: HTML linting uses `htmlhint .` to scan all HTML files recursively. On older versions or restricted environments, you may need to use `htmlhint "**/*.html"` instead.

## 🧪 Testing Infrastructure

### Unit Tests
- Navigation component functionality
- Theme switching logic
- Form interactions and validation
- User authentication flows
- Component rendering and behavior

### Integration Tests
- Cross-component and API interactions
- HTML structure validation
- Accessibility compliance
- Navigation flow testing

### Test Coverage
- **Components**: Shared navigation, theme toggle, configuration
- **Pages**: Home page, login/logout, admin, oil ordering
- **API**: Products, orders, users, authentication endpoints

## 🎨 Design System

### Page Header Utility

All main pages use a standardized `.page-header` utility class for consistent sticky headers:

```html
<header class="page-header card border">
  <h1>Page Title</h1>
  <!-- header content -->
</header>
```

The `.page-header` utility provides:
- Sticky positioning (stays at top on scroll)
- Proper z-index layering (z-40)
- Consistent padding, rounded corners, shadow
- Light/dark theme-aware backgrounds with frosted glass effect
- Safari-compatible backdrop blur

Defined in: `shared-config.html`

### Text Utilities

Consistent typography utilities for secondary text:

```html
<!-- Subtitle text under headers -->
<p class="subtitle">Brief description or context</p>

<!-- Muted text for less emphasis -->
<span class="muted">Additional information</span>

<!-- Description text blocks -->
<p class="description">Longer explanatory text with proper spacing</p>
```

**Available utilities**:
- `.subtitle` / `.text-subtitle` - Small gray text for subtitles (0.875rem)
- `.muted` / `.text-muted` - Muted text for secondary information
- `.description` / `.text-description` - Description blocks with proper line-height

All utilities adapt to light/dark themes automatically.

### Widget Background Variations

Background color variants for visual separation:

- `.widget-primary` - Blue-tinted background (light: sky-100, dark: blue with transparency)
- `.widget-secondary` - Green-tinted background (light: emerald-100, dark: green with transparency)
- `.widget-accent` - Purple-tinted background (light: violet-100, dark: purple with transparency)

Use with `.card` for best results:
```html
<div class="card widget-primary rounded-lg shadow-md p-6">
  <!-- Primary widget content -->
</div>
```

Defined in: `shared-config.html`

### Accessibility Features

- **Skip to Content Link**: Global skip link injected on every page (keyboard accessible, auto-positions on focus)
- **Main Landmark**: Auto-assigns `id="main"` to the first `<main>` element if missing
- **ARIA Attributes**: Proper labeling on interactive elements
- **Keyboard Navigation**: Full keyboard support for navigation and modals
- **Focus Indicators**: Enhanced focus states for all interactive elements

### Performance Features

- **Resource Preloading**: Critical CSS preloaded for faster initial render
- **DNS Prefetch**: Font CDN connections prefetched
- **Lazy Loading**: Images and non-critical resources loaded on demand
- **Error Tracking**: Global error handler captures and logs client-side errors
  - View errors: `ErrorTracker.getErrorLog()`
  - Export errors: `ErrorTracker.exportErrorLog()`
  - Clear errors: `ErrorTracker.clearErrorLog()`

**Error Tracker** (`assets/js/error-tracker.js`):
- Automatically captures JavaScript errors and promise rejections
- Tracks network errors (5xx responses)
- Stores last 100 errors in localStorage for debugging
- Shows user-friendly notifications for critical errors
- Development-friendly console logging

### Colors
- **Primary**: `#3b82f6` (Blue)
- **Secondary**: `#10b981` (Green)
- **Accent**: `#8b5cf6` (Purple)

### Typography
- **Font Family**: Inter, system-ui, -apple-system, sans-serif
- **Responsive scaling**: Tailwind's built-in typography scale

### Responsive Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔧 Development Workflow

### Code Quality
- **HTML Linting**: HTMLHint with TailwindCSS-friendly rules
- **JavaScript Linting**: ESLint with modern standards
- **Automated Testing**: Jest with JSDOM environment
- **CI/CD**: GitHub Actions with automated deployment
- **No dead code or debug logic**: Codebase is regularly audited for production readiness

### Component Guidelines
1. Use semantic HTML structure
2. Include proper ARIA attributes
3. Follow TailwindCSS utility-first approach
4. Write corresponding unit tests
5. Update integration tests as needed

## 🚢 Deployment

### Automated Deployment
- **GitHub Actions**: Runs tests and linting on every push
- **FTP Deployment**: Automatic deployment to production server

### Manual Testing Checklist
- [ ] Homepage loads with navigation and cards
- [ ] Login/logout functionality works
- [ ] Theme toggle and all settings fields persist via database
- [ ] Mobile navigation toggles correctly
- [ ] Oil ordering system displays products from API
- [ ] Admin dashboard and user management work via API
- [ ] All pages are accessible and responsive

## 🔒 Security & Performance

### Security Features
- Client-side validation with HTML5 constraints
- Database-backed settings and session management
- Secure API endpoints (authentication, rate limiting, audit logging)
- FTP credentials stored in GitHub Secrets

### Performance Optimizations

**Comprehensive optimizations implemented** - see [OPTIMIZATIONS.md](OPTIMIZATIONS.md) for full details.

#### Asset Optimization
- **Browser Caching**: Long-term caching (1 year) for static assets, short-term (1 hour) for HTML
- **Compression**: Automatic Gzip/Brotli compression via Netlify CDN
- **Resource Preloading**: Critical CSS and DNS prefetch for faster initial render
- **Lazy Loading**: Images and non-critical resources loaded on demand

#### API & Backend
- **Field Selection**: APIs return only required fields (no over-fetching)
- **Connection Pooling**: PostgreSQL connection pooling for serverless functions
- **SQLite Fallback**: Read-only operations fall back to SQLite for resilience
- **Cold Start Optimization**: Lightweight function bundles (~200-800ms cold start)

#### Database
- **Comprehensive Indexing**: 20+ indexes on frequently queried fields
  - Products: type, code, created_at
  - Orders: status, created_by, created_at
  - Users: email, role, is_active
  - Audit logs: composite indexes for complex queries
- **Query Performance**: 90% faster queries with proper indexing
- **Automated Maintenance**: Nightly token cleanup prevents table bloat

#### CI/CD
- **Node Modules Caching**: 60% faster build times (5min → 2min)
- **Build Validation**: Lint, build, test before every deployment
- **Build Summaries**: Clear logs in GitHub Actions UI
- **Semantic Versioning**: Built-in version bump scripts

#### Measured Impact
- Page load time: **48% faster** (3.5s → 1.8s)
- Asset transfer size: **68% reduction** (250KB → 80KB)
- Database queries: **90% faster** (500ms → 50ms)
- CI/CD build time: **60% faster** (5min → 2min)
- Lighthouse Performance: **95/100** (previously 75/100)

See [OPTIMIZATIONS.md](OPTIMIZATIONS.md) for complete documentation.

## 📊 Browser Support

### Supported Browsers
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Progressive Enhancement
- Core functionality works without JavaScript
- Enhanced features require modern browser capabilities
- Responsive design adapts to all screen sizes


## 🤝 Contributing
We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:
- Development setup and workflow
- Code style and standards
- Testing requirements
- Pull request process

### Quick Contribution Steps
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass: `npm run validate`
5. Submit a pull request

## 📈 Maintenance

### Regular Tasks
- Monitor CI/CD pipeline health
- Update dependencies as needed
- Review and merge pull requests
- Monitor site performance and uptime
- Audit codebase for dead code, debug logic, and unused variables

### Component Updates
- All styling handled by TailwindCSS utilities
- Shared components require updates across all pages
- Test coverage ensures stability during changes

### Token & Session Hygiene
Refresh (persistent) authentication tokens are stored (hashed) in the database and expire automatically. A maintenance script is included to proactively prune any already-expired refresh tokens so the table remains small and efficient:

Run manually:
```
node scripts/prune-refresh-tokens.js
```

What it does:
- Scans the `refresh_tokens` (or equivalent) table for expired entries
- Removes them in batches (works across PostgreSQL, SQLite)
- Outputs a summary count of deleted rows

Recommended cadence:
- Ad-hoc (local dev) after heavy auth testing
- Nightly via a scheduled GitHub Actions workflow (add a `schedule:` cron trigger to `.github/workflows/ci.yml` if desired)

### Serverless Function Tests
Lightweight smoke & error tests (plain Node scripts) live under `tests/functions/` and are executed in CI:
- `auth_me_smoke.test.js` – login + /me + users listing
- `orders_products_smoke.test.js` – products list, create order, list orders
- `auth_errors.test.js` – invalid password, missing token, forged token cases
- `handlers.test.js` – direct in-process invocation of function handlers (no HTTP layer) for fast feedback

Run locally (ensure dependencies installed first):
```
node tests/functions/auth_me_smoke.test.js
node tests/functions/orders_products_smoke.test.js
node tests/functions/auth_errors.test.js
node tests/functions/handlers.test.js
```

### CI Workflow
`/.github/workflows/ci.yml` performs:
1. Dependency install & CSS build
2. Direct handler tests (fast feedback without Netlify dev)
3. Starts Netlify dev (serverless runtime)
4. Executes smoke & error HTTP tests
5. Runs the refresh token prune script

Extending CI:
- Add coverage (nyc) by wrapping the handler test step
- Add a `schedule:` block for nightly hygiene (token prune, dependency audit)
- Include `npm audit --production` or `npx depcheck` for additional safety

### Environment Variables Checklist
Ensure the following are defined in Netlify (or locally in `.env`) for full functionality:
- `DB_TYPE` (postgres | sqlite)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (if not sqlite)
- `JWT_SECRET` (required for auth)
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_AUDIENCE` (optional; enables OAuth; buttons auto-enable via `/.netlify/functions/public-config`)
- Optional: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` (email flows)

### Operational Tips
- If switching database engines, clear or migrate the existing schema before first request so automatic table creation runs cleanly.
- Use SQLite locally for quickest iteration, then confirm against PostgreSQL in CI or a staging branch.
- Re-run the prune script after bulk auth / load testing to keep token tables lean.

## 🐛 Known Limitations

### Development Environment
- CDN resources may be blocked in restricted environments
- Placeholder images may not load if external requests are blocked
- API/serverless/database features require supported environment and credentials

### Production Environment
- Full functionality available with CDN access
- All features work as intended
- Performance is optimized for production use

## 📝 License

This project is licensed under the MIT License - see the repository for full license text.

## 🔗 Links

- **Live Site**: https://joshburt.com.au/
- **GitHub Repository**: https://github.com/SmokeHound/joshburt.com.au
- **Issues**: Report bugs and request features via GitHub Issues

---

For detailed development information, see [CONTRIBUTING.md](CONTRIBUTING.md), [DATABASE.md](DATABASE.md), and component documentation in `shared-*.html` files.

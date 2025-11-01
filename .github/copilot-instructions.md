
# joshburt.com.au - Dynamic Website & API

This site includes static HTML pages plus a serverless backend (Netlify Functions) only:
- Responsive design with dark/light mode support
- Admin dashboard and user management
- Castrol oil product ordering system
 - **Dynamic backend**: Netlify serverless functions with PostgreSQL database integration (legacy Express removed)
**Codebase is fully audited and production-ready (no dead code, debug logic, or unused variables)**

Always reference these instructions first. Fallback to search or bash commands only when you encounter unexpected information that does not match the info here.


## Working Effectively

### Bootstrap and Run the Website
- **Static site**: `python3 -m http.server 8000` (HTML/CSS/JS only)
- **Serverless backend**:
  - Set DB env vars (DB_TYPE, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT as needed)
  - Use `netlify dev` (optional) to run functions locally (`/.netlify/functions/*`)
   - Test database connectivity: run `netlify dev` and call `/.netlify/functions/health`


### Build and Deploy Information
- **Static files**: No build required
- **Backend/API**: Requires Node.js dependencies (run `npm install`)
- **Database**: PostgreSQL (e.g. Neon) - see config/database.js for credentials
- **Deployment**: GitHub Actions for FTP and Netlify; API/serverless functions deploy automatically


### Test Website & API Functionality
- **Static pages**: Load via local server
- **Serverless endpoints (replace legacy /api)**:
   - Products: `/.netlify/functions/products`
   - Orders: `/.netlify/functions/orders`
   - Users: `/.netlify/functions/users`
   - Auth (multi-action): `/.netlify/functions/auth?action=login|register|refresh|logout|me|forgot-password|reset-password|verify-email`
   - Audit Logs: `/.netlify/functions/audit-logs`
   - Inventory: `/.netlify/functions/inventory`
   - Consumables: `/.netlify/functions/consumables`
   - Categories: `/.netlify/functions/consumable-categories`
- **Database**: use the health function locally
- **Local Functions**: `netlify dev` (optional)


## Validation

### Manual Testing Requirements
ALWAYS manually validate changes by running through these complete end-to-end scenarios:

1. **Homepage Functionality Test** (static):
   - As before

2. **Oil Ordering System Test** (dynamic):
   - Navigate to oil-products.html and test product API (`/.netlify/functions/products`)
   - Add product, view, and order via serverless endpoints

3. **Admin Dashboard & User Management**:
   - Test user CRUD via `/.netlify/functions/users`
   - Test auth actions via `/.netlify/functions/auth?action=...`

4. **Orders API Test**:
   - Submit and list orders via `/.netlify/functions/orders`

5. **Database Test**:
   - Start local functions with `netlify dev` and call `/.netlify/functions/health` to verify database connectivity and required tables


### Known Limitations
- **CDN resources blocked**: Styling may be limited in restricted environments
- **Image loading blocked**: Placeholder images may not display
- **Database connection**: Requires valid credentials and network access
- **API/serverless**: Only works in supported environments (Netlify, Node.js)


## Deployment

### GitHub Actions Workflows
Two deployment workflows are configured:
1. **FTP Deployment** (`.github/workflows/main.yml`): Deploys static and backend files to joshburt.com.au via FTP on any push
2. **Netlify Functions**: Deploys serverless API endpoints automatically

**Build steps:**
- Static: No build required
- Backend/API: Run `npm install` before deploy


## Common Tasks

### Repository Structure
```
/home/runner/work/joshburt.com.au/joshburt.com.au/
├── .github/
│   └── workflows/
│       └── main.yml      # FTP deployment
├── docs/                 # All technical documentation
│   ├── archive/         # Historical phase documentation
│   ├── ARCHITECTURE.md
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE.md
│   └── ...              # See DOCS_INDEX.md for complete list
├── index.html           # Main homepage
├── oil-products.html    # Castrol oil ordering system
├── administration.html  # Administration dashboard
├── analytics.html       # Analytics page
├── settings.html        # Settings configuration
├── users.html           # User management
├── login.html           # Login page
├── .netlify/functions/  # Serverless API endpoints (products.js, orders.js, users.js, auth.js, etc.)
├── config/database.js   # Database abstraction (PostgreSQL, SQLite)
├── migrations/          # Database migration files
├── DOCS_INDEX.md        # Documentation index (see this first!)
└── README.md            # Basic project info
```


### Key Files Reference
- **index.html**: Main website template
- **oil-products.html**: Castrol product ordering (uses API)
- **.netlify/functions/**: Serverless API endpoints (products, orders, users, auth, consumables, categories, audit logs, inventory, settings, health)
- **config/database.js**: Database abstraction
- **docs/**: All technical documentation (see DOCS_INDEX.md)
- **migrations/**: Database schema migrations


### Development Notes
- Static pages use TailwindCSS v4.1 and unified navigation
- Backend/API uses Netlify Functions only (Node.js runtime)
- Database: PostgreSQL (e.g. Neon), SQLite supported
- Run `npm install` for backend dependencies
- FTP credentials stored in GitHub Secrets for deployment


### Quick Commands Reference
```bash
# Start static development server
python3 -m http.server 8000

# (Legacy Express removed – no standalone API server to start)

# Test database (PostgreSQL/SQLite)
# Start Netlify dev then call health
netlify dev
curl http://localhost:8888/.netlify/functions/health

# Install backend dependencies
npm install

# Check website responds
curl -s -o /dev/null -w "HTTP response: %{time_total}s\n" http://localhost:8000/

# Count total HTML pages
ls -1 *.html | wc -l  # Returns: 7

# Stop server (if running in background)
pkill -f "python3 -m http.server"
```


### File Contents Reference
```bash
# README.md contents
cat README.md
# Returns basic project info with website status badge

# Main navigation structure (from index.html)
grep -A10 "<nav>" index.html
# Shows sidebar navigation with Home, Admin, User Management, Analytics, Settings, Logout
```


## Error Handling
- If CDN resources fail to load, website remains functional but may have styling issues
- If database connection fails, check credentials and network access
- API/serverless errors: check logs and endpoint responses
- No debug logic or dead code in production
- Static files: no runtime errors beyond JavaScript console warnings for blocked CDNs
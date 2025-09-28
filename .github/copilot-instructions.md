
# joshburt.com.au - Dynamic Website & API

This site now includes both static HTML pages and dynamic backend functionality:
- Responsive design with dark/light mode support
- Admin dashboard and user management
- Castrol oil product ordering system
- **Dynamic backend**: Netlify serverless functions, Express API endpoints, and MySQL/PostgreSQL/SQLite database integration
**Codebase is fully audited and production-ready (no dead code, debug logic, or unused variables)**

Always reference these instructions first. Fallback to search or bash commands only when you encounter unexpected information that does not match the info here.


## Working Effectively

### Bootstrap and Run the Website
- **Static site**: Start local HTTP server as before
   - `python3 -m http.server 8000`
- **Dynamic backend**:
   - Set environment variables for MySQL/PostgreSQL/SQLite (DB_TYPE, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT)
   - Start API server: `node api/server.js` (if present)
   - Netlify functions auto-deploy on push
   - Test database: `node test-mysql-init.js`


### Build and Deploy Information
- **Static files**: No build required
- **Backend/API**: Requires Node.js dependencies (run `npm install`)
- **Database**: MySQL (default), PostgreSQL (e.g. Neon), or SQLite (see config/database.js for credentials)
- **Deployment**: GitHub Actions for FTP and Netlify; API/serverless functions deploy automatically


### Test Website & API Functionality
- **Static pages**: As before
- **API endpoints**:
   - Products: `/api/products` (GET, POST)
   - Orders: `/api/orders` (GET, POST)
   - Users: `/api/users` (GET, POST, PUT, DELETE)
   - Auth: `/api/auth` (register, login, OAuth)
- **Database**: Test with `node test-mysql-init.js`
- **Netlify functions**: Test via deployed endpoints or local Netlify dev


## Validation

### Manual Testing Requirements
ALWAYS manually validate changes by running through these complete end-to-end scenarios:

1. **Homepage Functionality Test** (static):
   - As before

2. **Oil Ordering System Test** (dynamic):
   - Navigate to oil.html and test product API (`/api/products`)
   - Add product, view, and order via API

3. **Admin Dashboard & User Management**:
   - Test user CRUD via `/api/users`
   - Test login, registration, and OAuth via `/api/auth`

4. **Orders API Test**:
   - Submit and list orders via `/api/orders`

5. **Database Test**:
   - Run `node test-mysql-init.js` to verify database connection and table creation


### Known Limitations
- **CDN resources blocked**: Styling may be limited in restricted environments
- **Image loading blocked**: Placeholder images may not display
- **MySQL connection**: Requires valid credentials and network access
- **API/serverless**: Only works in supported environments (Netlify, Node.js)


## Deployment

### GitHub Actions Workflows
Two deployment workflows are configured:
1. **GitHub Pages** (`.github/workflows/static.yml`): Deploys static site on push to main
2. **FTP Deployment** (`.github/workflows/main.yml`): Deploys static and backend files to joshburt.com.au via FTP on any push
3. **Netlify Functions**: Deploys serverless API endpoints automatically

**Build steps:**
- Static: No build required
- Backend/API: Run `npm install` before deploy


## Common Tasks

### Repository Structure
```
/home/runner/work/joshburt.com.au/joshburt.com.au/
├── .github/
│   └── workflows/
│       ├── main.yml      # FTP deployment
│       └── static.yml    # GitHub Pages deployment
├── index.html           # Main homepage
├── oil.html             # Castrol oil ordering system
├── admin.html           # Admin dashboard
├── analytics.html       # Analytics page
├── settings.html        # Settings configuration
├── users.html           # User management
├── login.html           # Login page
├── netlify/functions/   # Serverless API endpoints (products.js, orders.js, etc.)
├── api/                 # Express API endpoints (users.js, auth.js, oauth.js)
├── config/database.js   # Database abstraction (MySQL, PostgreSQL, SQLite)
├── test-mysql-init.js   # MySQL test script
└── README.md            # Basic project info
```


### Key Files Reference
- **index.html**: Main website template
- **oil.html**: Castrol product ordering (uses API)
- **netlify/functions/**: Serverless API endpoints (products.js, orders.js)
- **api/**: Express API endpoints (users.js, auth.js, oauth.js)
- **config/database.js**: Database abstraction
- **test-mysql-init.js**: MySQL test script


### Development Notes
- Static pages use TailwindCSS and unified navigation
- Backend/API uses Node.js, Express, Netlify functions
- Database: MySQL (default), PostgreSQL (e.g. Neon), SQLite supported
- Run `npm install` for backend dependencies
- FTP credentials stored in GitHub Secrets for deployment


### Quick Commands Reference
```bash
# Start static development server
python3 -m http.server 8000

# Start API server (if present)
node api/server.js

# Test database (MySQL/PostgreSQL/SQLite)
node test-mysql-init.js

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
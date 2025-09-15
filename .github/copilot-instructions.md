# joshburt.com.au - Static Website

This is a static HTML website for joshburt.com.au featuring a responsive design with dark/light mode support, admin dashboard functionality, and a specialized Castrol oil product ordering system.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Run the Website
- **CRITICAL**: ALWAYS start server with adequate timeout - NEVER CANCEL server commands
- Start a local HTTP server: `cd /home/runner/work/joshburt.com.au/joshburt.com.au && python3 -m http.server 8000`
  - Server starts immediately (< 1 second)
  - Website accessible at http://localhost:8000
  - NEVER CANCEL: Server runs indefinitely until manually stopped - set timeout to 300+ seconds
  - Stop server when done: `pkill -f "python3 -m http.server"`

### Build and Deploy Information
- **No build process required** - this is a pure static website
- **No dependencies to install** - uses CDN resources only
- **No compilation needed** - HTML/CSS/JS files used directly
- **Deployment time**: Instant via GitHub Actions (< 30 seconds for FTP upload)

### Test Website Functionality  
- **Response time**: ~0.004 seconds per page load (measured)
- **Main website**: Navigate to http://localhost:8000/ 
- **Oil ordering system**: Navigate to http://localhost:8000/oil.html
- **Admin dashboard**: Navigate to http://localhost:8000/admin.html
- **All 7 pages load instantly** with static content
- **Test command**: `curl -s -o /dev/null -w "HTTP response: %{time_total}s\n" http://localhost:8000/`

## Validation

### Manual Testing Requirements
ALWAYS manually validate changes by running through these complete end-to-end scenarios:

1. **Homepage Functionality Test**:
   - Start HTTP server: `python3 -m http.server 8000`
   - Navigate to http://localhost:8000
   - Verify sidebar navigation works (click Home, Admin, User Management, Analytics, Settings links)
   - Test dark/light mode toggle button - button text should change from "Toggle Light Mode" to "Toggle Dark Mode"
   - Test mobile menu toggle (hamburger button in mobile view)
   - Click Login button - verify modal opens with Email and Password fields
   - Click Close button - verify modal closes
   - Confirm all 3 sample cards display correctly (Card 1, Card 2, Card 3)

2. **Oil Ordering System Test** (Critical Feature):
   - Navigate to http://localhost:8000/oil.html
   - **NOTE**: Due to CDN blocking, products may not load and you'll see "Loading products..." permanently
   - **This is expected behavior in restricted environments**
   - Verify page structure loads with "Castrol Products" heading and "Your Order" sidebar
   - Order summary shows "Total Items: 0" and disabled "Submit Order" button
   - **In production environment**: Products would load, allowing add to cart and CSV export functionality

3. **Admin Dashboard Test**:
   - Navigate to http://localhost:8000/admin.html
   - Verify admin dashboard loads with "Welcome, Admin!" message
   - Test navigation to User Management - click "Manage Users" button
   - On users.html page, verify user table displays with sample data (Josh Burt, Jane Doe)
   - Verify "Add New User" form displays with Name, Email, Role fields
   - Test "Toggle Dark Mode" button functionality across pages

### Known Limitations in Sandboxed Environments
- **CDN resources blocked**: TailwindCSS and Bootstrap CDN resources are blocked, causing:
  - Limited styling on pages (functional but not fully styled)
  - JavaScript errors for `tailwind` and `bootstrap` objects
  - Oil ordering system products don't load (requires Bootstrap)
- **Image loading blocked**: Placeholder images from via.placeholder.com won't display
- **Core functionality remains intact**: All navigation, forms, and basic interactions work
- **Production deployment works perfectly**: These issues only occur in restricted dev environments

## Deployment

### GitHub Actions Workflows
Two deployment workflows are configured:
1. **GitHub Pages** (`.github/workflows/static.yml`): Deploys to GitHub Pages on push to main
2. **FTP Deployment** (`.github/workflows/main.yml`): Deploys to joshburt.com.au via FTP on any push

No build steps required - files deploy as-is from repository root.

## Common Tasks

### Repository Structure
```
/home/runner/work/joshburt.com.au/joshburt.com.au/
├── .github/
│   └── workflows/
│       ├── main.yml      # FTP deployment
│       └── static.yml    # GitHub Pages deployment
├── index.html           # Main homepage with responsive template
├── oil.html             # Castrol oil ordering system (key feature)
├── admin.html           # Admin dashboard
├── analytics.html       # Analytics page
├── settings.html        # Settings configuration
├── users.html           # User management
├── login.html           # Login page

└── README.md           # Basic project info
```

### Key Files Reference
- **index.html**: Main website template with TailwindCSS, responsive design, login system
- **oil.html**: Specialized Castrol product ordering with Bootstrap, CSV export functionality  

### Development Notes
- All pages now use consistent TailwindCSS styling with inline styles
- All pages use unified navigation and theme toggle implementations
- No linting, testing, or build tools configured - pure static website
- FTP credentials stored in GitHub Secrets for deployment

### Quick Commands Reference
```bash
# Start development server
cd /home/runner/work/joshburt.com.au/joshburt.com.au
python3 -m http.server 8000

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
- No server-side dependencies means no database or API connection issues
- Static files mean no runtime errors beyond JavaScript console warnings for blocked CDNs
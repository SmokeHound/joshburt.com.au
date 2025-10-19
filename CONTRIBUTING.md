# Contributing to joshburt.com.au

Welcome to the joshburt.com.au project! This is a dynamic website and API with a modular component structure, comprehensive testing, and a fully audited, production-ready codebase (no dead code, debug logic, or unused variables).

## Development Setup

### Prerequisites
- Node.js 18 or higher
- Python 3 (for local development server)
- Git

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/SmokeHound/joshburt.com.au.git
   cd joshburt.com.au
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run serve
   ```
   This starts a Python HTTP server on port 8000. Visit http://localhost:8000

## Project Structure

```
├── index.html              # Main homepage
├── administration.html     # Administration dashboard
├── users.html              # User management
├── analytics.html          # Analytics page
├── settings.html           # Settings configuration
├── oil.html                # Oil ordering system
├── consumables.html        # Consumables order request (for staff)
├── consumables-mgmt.html   # Consumables product list management (admin/staff CRUD)
├── login.html              # Login page
├── shared-nav.html         # Shared navigation component
├── shared-theme.html       # Centralized ThemeManager (multi-theme support)
├── shared-config.html      # Shared configuration
├── tests/                  # Test directory
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── utils/             # Test utilities
├── package.json           # Node.js dependencies and scripts
└── .github/workflows/     # CI/CD configuration
```

## Development Workflow

## Theme System

The site uses a centralized ThemeManager (in `shared-theme.html`) that provides:

- **Multiple Theme Presets**: dark, light, system (auto-detect), neon, ocean, high-contrast
- **Custom Color Palettes**: Users can override primary/secondary/accent colors
- **System Theme Detection**: Automatically follows OS dark/light preference when set to 'system'
- **Cross-Tab Synchronization**: Theme changes sync across browser tabs
- **Event-Driven Updates**: Responds to settings changes via custom events

When working with themes:
1. **Use the ThemeManager API**: Access via `window.Theme` for programmatic theme changes
2. **Don't add inline color scripts**: ThemeManager handles this centrally and idempotently
3. **Test all theme presets**: Ensure your UI works with dark, light, and high-contrast themes
4. **Update theme tests**: If adding new theme features, add corresponding tests in `tests/unit/shared-theme.test.js`

See README.md for complete ThemeManager API documentation.

## Settings System

- All site settings are now stored in the database (see `DATABASE.md` for schema).
- The settings UI (`settings.html`) must be updated for any new or changed settings fields.
- All changes to settings are audit-logged automatically via the frontend.
- When adding new settings fields:
   1. Update the settings form in `settings.html`.
   2. Update the JS logic to load/save the new field.
   3. Document the new field in `README.md` and `DATABASE.md`.
   4. Ensure audit logging covers the new field.
   5. If theme-related, dispatch `siteSettingsUpdated` event so ThemeManager can respond

### 1. Code Style and Standards
- Uses TailwindCSS for styling
- Follows semantic HTML structure
- JavaScript uses ES6+ features
- All code must pass linting checks
- No dead code, unused variables, or debug logic (e.g. `console.log`) allowed in PRs

### 2. Testing Requirements
Before submitting any changes:

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run linting
npm run lint

# Run complete validation
npm run validate
```
All tests and linting must pass. Test files must not contain dead code or debug logic.

### 3. Component Structure
The website uses a modular component approach:
- **shared-nav.html**: Navigation sidebar with menu toggle, user profile, and theme toggle
- **shared-theme.html**: Theme switching functionality (dark/light mode)
- **shared-config.html**: TailwindCSS configuration and common styles

### 4. Adding New Features

#### Adding a New Page
1. Create the HTML file in the root directory
2. Include shared components:
   ```html
   <!-- Load shared navigation component -->
   <div id="shared-navigation"></div>
   <script>
       fetch('shared-nav.html')
           .then(response => response.text())
           .then(html => {
               document.getElementById('shared-navigation').innerHTML = html;
           });
   </script>
   ```
3. Add the new page link to `shared-nav.html`
4. Write tests for the new functionality

#### Adding New Components
1. Create the component HTML file (e.g., `shared-component.html`)
2. Write unit tests in `tests/unit/`
3. Add integration tests if needed
4. Update documentation

### 5. Testing Guidelines

#### Unit Tests
Located in `tests/unit/`, test individual components:
- Navigation functionality
- Theme switching
- Form interactions
- User authentication flows

#### Integration Tests
Located in `tests/integration/`, test cross-component functionality:
- Navigation between pages
- Component loading and interaction
- HTML validation
- Accessibility compliance

#### Test Utilities
Use the helper functions in `tests/utils/dom-helpers.js`:
```javascript
const { loadHTMLFile, simulateClick, waitFor } = require('../utils/dom-helpers');
```

### 6. Code Quality Checks

#### HTML Linting
Uses HTMLHint with TailwindCSS-friendly configuration:
```bash
npm run lint
```

#### JavaScript Linting
Uses ESLint for JavaScript code quality:
```bash
eslint --ext .js *.html
```

#### Codebase Audit
All code (including tests) is regularly audited for dead code, unused variables, and debug logic. PRs introducing such code will not be accepted.

## Submitting Changes

### Pull Request Process
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes following the guidelines above
4. Run tests and linting: `npm run validate`
5. Commit with clear messages: `git commit -m "Add: new feature description"`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Create a Pull Request

### Commit Message Format
Use clear, descriptive commit messages:
- `Add: new feature or functionality`
- `Fix: bug fix or correction`
- `Update: improvements to existing features`
- `Test: add or modify tests`
- `Docs: documentation changes`

### Code Review Checklist
- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] HTML is valid and semantic
- [ ] Accessibility attributes are present
- [ ] Components are properly modularized
- [ ] No dead code, unused variables, or debug logic present
- [ ] Documentation is updated if needed

## Continuous Integration

The project uses GitHub Actions for:
- **Automated Testing**: Runs on every push and PR
- **Code Quality**: Linting and validation
- **Deployment**: Automatic deployment to production on main branch

### CI Pipeline
1. Install dependencies
2. Run linting checks
3. Execute test suite
4. Deploy to FTP server (on success)

## Browser Support

The website supports:
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Accessibility

We strive for WCAG 2.1 AA compliance:
- Semantic HTML structure
- Proper ARIA attributes
- Keyboard navigation support
- Color contrast compliance
- Screen reader compatibility

## Performance Guidelines

- Minimize HTTP requests
- Use CDN resources efficiently
- Optimize images and assets
- Maintain fast load times (< 2 seconds)

## Questions and Support

For questions about contributing:
1. Check existing issues and documentation
2. Create a GitHub issue for bugs or feature requests
3. Join discussions in pull requests

Thank you for contributing to joshburt.com.au! Help us keep the codebase clean, maintainable, and production-ready.
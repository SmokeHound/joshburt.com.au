# Contributing to joshburt.com.au

Welcome to the joshburt.com.au project! This is a static website with a modular component structure and comprehensive testing.

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
├── admin.html              # Admin dashboard
├── users.html              # User management
├── analytics.html          # Analytics page
├── settings.html           # Settings configuration
├── oil.html                # Oil ordering system
├── login.html              # Login page
├── shared-nav.html         # Shared navigation component
├── shared-theme.html       # Shared theme functionality
├── shared-config.html      # Shared configuration
├── tests/                  # Test directory
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── utils/             # Test utilities
├── package.json           # Node.js dependencies and scripts
└── .github/workflows/     # CI/CD configuration
```

## Development Workflow

### 1. Code Style and Standards
- Uses TailwindCSS for styling
- Follows semantic HTML structure
- JavaScript uses ES6+ features
- All code must pass linting checks

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

Thank you for contributing to joshburt.com.au!
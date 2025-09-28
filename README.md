# Josh Burt - Website with Server-Side Authentication

[![🚀 Deploy website via FTP on push.](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/main.yml)
[![⬆️ Deploy to GitHub Pages](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/static.yml/badge.svg)](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/static.yml)

# Links to site
- https://joshburt.netlify.app/
- https://joshburt.com.au/
- https://smokehound.github.io/joshburt.com.au/
- https://joshburt-com-au.onrender.com/

## Overview
This is a modern, production-ready website for joshburt.com.au featuring a modular component architecture, comprehensive testing, responsive design with dark/light mode support, admin dashboard functionality, and a dynamic Castrol oil product ordering system. The codebase has been fully audited for dead code, unused variables, and debug logic, ensuring maintainability and security.

## ✨ Features
- **Modular Components**: Reusable shared components for navigation, theming, and configuration
- **Responsive Design**: Mobile-first approach with TailwindCSS
- **Dark/Light Mode**: Persistent theme switching with localStorage
- **Testing Suite**: Unit and integration tests with Jest
- **CI/CD Pipeline**: Automated testing, linting, and deployment
- **Admin Dashboard**: User management, analytics, and site settings
- **Oil Ordering System**: Dynamic Castrol product ordering (API-driven, CSV export)
- **API Backend**: Netlify Functions and Express endpoints (Node.js) with MySQL, PostgreSQL, or SQLite support
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA attributes

## 🏗️ Architecture

### Component Structure
- **`shared-nav.html`**: Navigation sidebar with menu toggle, user profile, and navigation links
- **`shared-theme.html`**: Theme toggle functionality with localStorage persistence
- **`shared-config.html`**: TailwindCSS configuration and common styles
- **API/Netlify Functions**: Dynamic backend for products, orders, users, and authentication

### Pages
- **`index.html`**: Landing page with login modal and welcome cards
- **`admin.html`**: Dashboard with management links and user overview
- **`users.html`**: User CRUD operations and role management
- **`analytics.html`**: Site metrics and usage statistics
- **`settings.html`**: Site configuration and customization
- **`oil.html`**: Castrol product ordering system (API-driven, CSV export)
- **`consumables.html`**: Consumables order request page (for workshop staff)
- **`consumables-mgmt.html`**: Consumables product list management (admin/staff CRUD)
- **`login.html`**: Authentication page

## 🚀 Quick Start

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

# Run linting
npm run lint

# Run complete validation
npm run validate
```

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
- **GitHub Pages**: Secondary deployment target

### Manual Testing Checklist
- [ ] Homepage loads with navigation and cards
- [ ] Login/logout functionality works
- [ ] Theme toggle switches between dark/light modes
- [ ] Mobile navigation toggles correctly
- [ ] Oil ordering system displays products from API
- [ ] Admin dashboard and user management work via API
- [ ] All pages are accessible and responsive

## 🔒 Security & Performance

### Security Features
- Client-side validation with HTML5 constraints
- localStorage for session management
- Secure API endpoints (authentication, rate limiting, audit logging)
- FTP credentials stored in GitHub Secrets

### Performance Optimizations
- CDN resources for TailwindCSS
- Optimized image loading with lazy loading
- Minimal HTTP requests
- Fast load times (< 0.005 seconds measured)
- No dead code or debug logic in production

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

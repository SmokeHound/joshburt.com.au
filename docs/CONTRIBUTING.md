# Contributing Guide

Guidelines for contributing to joshburt.com.au.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

---

## Getting Started

### Prerequisites

- Node.js 18+
- Git
- PostgreSQL access (or use Neon free tier)
- Code editor (VS Code recommended)

### Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/joshburt.com.au.git
cd joshburt.com.au

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Run migrations
npm run migrate

# Start development server
npm run dev:functions
```

---

## Development Workflow

### Branch Strategy

- `main`: Production branch (protected)
- `feature/*`: New features
- `fix/*`: Bug fixes
- `docs/*`: Documentation updates

### Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ... code changes ...

# Run validation
npm run validate

# Commit with descriptive message
git commit -m "feat: Add product filtering by category"

# Push to your fork
git push origin feature/my-feature

# Open Pull Request
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples**:

```
feat(products): Add full-text search with PostgreSQL
fix(auth): Resolve JWT expiration edge case
docs(api): Update authentication endpoint examples
```

---

## Code Standards

### JavaScript

**Style Guide**: ESLint configuration in `eslint.config.js`

**Key Rules**:

- Use `const`/`let`, never `var`
- Arrow functions preferred
- Async/await over callbacks
- Descriptive variable names
- JSDoc comments for functions

**Example**:

```javascript
/**
 * Fetch products with optional filters
 * @param {Object} filters - Filter criteria
 * @param {number} filters.page - Page number
 * @param {number} filters.limit - Items per page
 * @returns {Promise<Object>} Products and pagination
 */
const getProducts = async (filters = {}) => {
  const { page = 1, limit = 20 } = filters;

  const result = await pool.query('SELECT * FROM products LIMIT $1 OFFSET $2', [
    limit,
    (page - 1) * limit
  ]);

  return {
    data: result.rows,
    pagination: { page, limit, total: result.rowCount }
  };
};
```

### HTML

**Standards**:

- Semantic HTML5 elements
- Accessibility attributes (ARIA)
- No inline styles (use TailwindCSS classes)
- Include shared components

### CSS

**Framework**: TailwindCSS v4

**Custom Styles**: Add to `src/styles.css` only when Tailwind classes insufficient

**Build**: `npm run build:css`

### Database

**Queries**:

- Always use parameterized queries (`$1`, `$2`)
- Create indexes for frequent lookups
- Use transactions for multi-step operations

**Migrations**:

- Sequential numbering (`005_add_feature.sql`)
- Idempotent (`CREATE TABLE IF NOT EXISTS`)
- Update `database-schema.sql` to match

---

## Testing Requirements

### Before Submitting PR

```bash
# Run full validation suite
npm run validate
```

This runs:

1. **Linting**: `npm run lint`
2. **Tests**: `npm run test:all`
3. **Build**: `npm run build:css`

### Writing Tests

**Unit Tests** (`tests/unit/`):

```javascript
// tests/unit/my-feature.test.js
const { myFunction } = require('../../utils/my-feature');

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

**Function Tests** (`tests/functions/`):

```javascript
// tests/functions/my-function.test.js
const handler = require('../../netlify/functions/my-function').handler;

describe('my-function', () => {
  it('should return 200 OK', async () => {
    const event = {
      httpMethod: 'GET',
      headers: { authorization: 'Bearer token' }
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
  });
});
```

### Test Coverage

**Minimum**: 70% code coverage for new functions

**Check**: `npm run test:coverage`

---

## Pull Request Process

### Before Submitting

1. ✅ Tests pass (`npm run test:all`)
2. ✅ Linting clean (`npm run lint`)
3. ✅ No console.log or debug code
4. ✅ Documentation updated (if API changes)
5. ✅ Migration created (if schema changes)

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing

- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] No regressions introduced

## Screenshots (if UI changes)

[Add screenshots]

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests pass locally
```

### Review Process

1. Automated checks run (GitHub Actions)
2. Code review by maintainer
3. Address feedback
4. Approval → Merge to `main`
5. Auto-deploy to production (Netlify)

---

## Issue Reporting

### Bug Reports

**Template**:

```markdown
## Bug Description

Clear description of the bug

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior

What should happen

## Actual Behavior

What actually happens

## Environment

- Browser: Chrome 120
- OS: Windows 11
- Node.js: 18.17.0

## Screenshots

[If applicable]

## Additional Context

Any other relevant info
```

### Feature Requests

**Template**:

```markdown
## Feature Description

Clear description of proposed feature

## Use Case

Why is this feature needed?

## Proposed Implementation

How might this be implemented?

## Alternatives Considered

Other approaches you've thought about
```

---

## Code of Conduct

### Our Standards

- **Be respectful**: Treat everyone with respect
- **Be constructive**: Provide helpful feedback
- **Be inclusive**: Welcome contributors of all backgrounds
- **Be professional**: Maintain professional communication

### Unacceptable Behavior

- Harassment, discrimination, or offensive language
- Personal attacks or trolling
- Publishing private information
- Spam or off-topic content

### Enforcement

Issues violating code of conduct will be addressed by project maintainers.

---

## Questions?

- **GitHub Discussions**: https://github.com/SmokeHound/joshburt.com.au/discussions
- **Issues**: https://github.com/SmokeHound/joshburt.com.au/issues

---

**Thank you for contributing!**

**Last Updated**: 2025-11-11  
**Maintained By**: Development Team

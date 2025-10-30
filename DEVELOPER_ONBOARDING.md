# Developer Onboarding Guide

Welcome to the joshburt.com.au development team! This guide will help you get set up and productive quickly.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Common Tasks](#common-tasks)
8. [Resources](#resources)

## Prerequisites

### Required Software

- **Node.js** v22+ ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **Code Editor** (VS Code recommended with extensions)
- **PostgreSQL Client** (optional, for database access)

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### Accounts Needed

- **GitHub**: For code access
- **Netlify**: For deployment (request access from team)
- **Neon**: For database access (optional for local dev)
- **Sentry**: For error tracking (optional)

## Getting Started

### Day 1: Setup

#### 1. Clone the Repository

```bash
# Clone via SSH (recommended)
git clone git@github.com:SmokeHound/joshburt.com.au.git

# Or via HTTPS
git clone https://github.com/SmokeHound/joshburt.com.au.git

cd joshburt.com.au
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Set Up Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values
# Minimum required for local development:
# - JWT_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
# - DB_TYPE=sqlite (for local development)
```

#### 4. Initialize Database

```bash
# For SQLite (local development)
# Database will be created automatically on first run

# For PostgreSQL (optional)
# 1. Get connection string from team
# 2. Update .env with NEON_DATABASE_URL
# 3. Run migrations
node scripts/run-migrations.js
```

#### 5. Start Development Server

```bash
# Terminal 1: Static file server
npm run dev

# Terminal 2: Serverless functions (optional)
npm run dev:functions
```

#### 6. Verify Setup

```bash
# Run tests
npm test

# Run linting
npm run lint

# Check health
curl http://localhost:8888/.netlify/functions/health
```

### Day 2-3: Explore Codebase

#### Repository Structure

```
joshburt.com.au/
├── .github/              # GitHub Actions workflows
├── .netlify/functions/   # Serverless API endpoints
├── assets/               # Static assets (images, CSS, JS)
├── config/               # Configuration files
├── docs/                 # Documentation
├── migrations/           # Database migrations
├── scripts/              # Utility scripts
├── tests/                # Test files
├── utils/                # Shared utilities
├── *.html               # Static pages
└── package.json         # Dependencies and scripts
```

#### Key Files to Review

1. **README.md**: Project overview
2. **CONTRIBUTING.md**: Contribution guidelines
3. **API_DOCUMENTATION.md**: API reference
4. **ARCHITECTURE.md**: System architecture
5. **DATABASE.md**: Database schema

#### Test Login Credentials (Dev Only)

```
Email: test@example.com
Password: password

Admin Email: admin@joshburt.com.au
Password: admin123!
```

⚠️ **Never use these in production!**

### Week 1: First Tasks

#### Suggested Learning Path

1. **Day 1**: Setup and explore UI
   - Browse all HTML pages
   - Test user registration and login
   - Try placing an order

2. **Day 2**: Review API code
   - Read `.netlify/functions/auth.js`
   - Understand authentication flow
   - Review database queries

3. **Day 3**: Make a small change
   - Fix a typo in documentation
   - Add a comment to clarify code
   - Update a test case

4. **Day 4**: Write a test
   - Add a unit test for a utility function
   - Run test suite and ensure it passes

5. **Day 5**: Fix a bug
   - Pick a small issue from GitHub
   - Create a branch, fix, and open PR

## Development Workflow

### Branch Strategy

```
main (production)
  ├── staging (pre-production)
  └── feature/* (your work)
```

### Creating a Feature Branch

```bash
# Update main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit, push
git add .
git commit -m "feat: add feature description"
git push origin feature/your-feature-name
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve bug in authentication
docs: update API documentation
style: format code with prettier
refactor: simplify user query logic
test: add tests for order creation
chore: update dependencies
```

### Pull Request Process

1. **Create PR** against `main` branch
2. **Fill out template** with description and checklist
3. **Request review** from at least one team member
4. **Address feedback** if any
5. **Merge** after approval and passing CI

### Code Review Checklist

- [ ] Code follows style guide
- [ ] Tests added for new functionality
- [ ] Documentation updated if needed
- [ ] No hardcoded credentials or secrets
- [ ] Error handling implemented
- [ ] Performance considered
- [ ] Security implications reviewed

## Code Standards

### JavaScript Style

```javascript
// Use const/let, not var
const userName = 'Josh';
let count = 0;

// Arrow functions preferred
const greet = (name) => `Hello, ${name}`;

// Async/await over promises
async function fetchUser(id) {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return user.rows[0];
}

// Destructuring
const { email, name } = user;

// Template literals
const message = `Welcome, ${name}!`;
```

### HTML/CSS Conventions

```html
<!-- Use semantic HTML -->
<nav>...</nav>
<main>...</main>
<footer>...</footer>

<!-- TailwindCSS classes -->
<div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800">
  <h1 class="text-2xl font-bold">Title</h1>
</div>

<!-- Accessible forms -->
<label for="email" class="block mb-2">Email</label>
<input 
  type="email" 
  id="email" 
  name="email" 
  required 
  aria-required="true"
  class="input"
>
```

### SQL Guidelines

```sql
-- Use parameterized queries (prevents SQL injection)
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

-- Create indexes for frequently queried columns
CREATE INDEX idx_users_email ON users(email);

-- Use transactions for multi-step operations
await db.query('BEGIN');
try {
  await db.query('INSERT INTO orders ...');
  await db.query('INSERT INTO order_items ...');
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
}
```

## Testing

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage

# Watch mode (re-run on changes)
npm test -- --watch
```

### Writing Tests

```javascript
// tests/unit/utils/password.test.js
const { hashPassword, verifyPassword } = require('../../../utils/password');

describe('Password Utilities', () => {
  test('hashPassword creates hash', async () => {
    const hash = await hashPassword('password123');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('password123');
  });
  
  test('verifyPassword validates correct password', async () => {
    const hash = await hashPassword('password123');
    const isValid = await verifyPassword('password123', hash);
    expect(isValid).toBe(true);
  });
  
  test('verifyPassword rejects incorrect password', async () => {
    const hash = await hashPassword('password123');
    const isValid = await verifyPassword('wrongpassword', hash);
    expect(isValid).toBe(false);
  });
});
```

## Deployment

### Local Testing

```bash
# Test locally before deploying
npm run validate  # Runs lint + build + tests
```

### Staging Deployment

```bash
# Merge to staging branch
git checkout staging
git merge feature/your-feature
git push origin staging

# Staging deploys automatically via CI
# URL: https://staging--joshburt.netlify.app
```

### Production Deployment

```bash
# Create release via GitHub
# Or merge staging to main after testing
git checkout main
git merge staging
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin main --tags

# Production deploys automatically
```

## Common Tasks

### Adding a New API Endpoint

1. Create function file: `.netlify/functions/my-endpoint.js`
2. Implement handler:

```javascript
const { getDb } = require('../../config/database');
const { verifyToken } = require('../../utils/jwt-utils');

exports.handler = async (event, context) => {
  // Verify authentication
  const user = verifyToken(event.headers.authorization);
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  // Handle different HTTP methods
  if (event.httpMethod === 'GET') {
    // Fetch data
    const db = await getDb();
    const result = await db.query('SELECT * FROM table');
    return {
      statusCode: 200,
      body: JSON.stringify(result.rows)
    };
  }
  
  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
```

3. Test locally: `curl http://localhost:8888/.netlify/functions/my-endpoint`
4. Add tests in `tests/functions/`
5. Update API documentation

### Adding a Database Migration

1. Create migration file: `migrations/002_add_feature.sql`

```sql
-- Migration: Add feature
-- Version: 002

CREATE TABLE IF NOT EXISTS my_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);

INSERT INTO migrations (version, name) 
VALUES ('002', 'add_feature')
ON CONFLICT (version) DO NOTHING;
```

2. Test locally: `node scripts/run-migrations.js --dry-run`
3. Apply: `node scripts/run-migrations.js`
4. Update `database-schema.sql`

### Debugging

```javascript
// Add detailed logging
const { logInfo, logError } = require('../utils/logger');

logInfo('Processing request', { userId: user.id, path: event.path });

try {
  // Your code
} catch (error) {
  logError('Operation failed', error, { userId: user.id });
}
```

```bash
# View Netlify function logs
netlify logs --live

# Check specific function
netlify functions:logs my-function --live
```

## Resources

### Documentation

- [Main README](../README.md)
- [API Documentation](../API_DOCUMENTATION.md)
- [Architecture Guide](../ARCHITECTURE.md)
- [Database Schema](../DATABASE.md)
- [Deployment Guide](../DEPLOYMENT.md)

### Tools & Services

- [Netlify Dashboard](https://app.netlify.com)
- [Neon Console](https://console.neon.tech)
- [Sentry Dashboard](https://sentry.io)
- [GitHub Repository](https://github.com/SmokeHound/joshburt.com.au)

### Learning Resources

- [Netlify Functions Guide](https://docs.netlify.com/functions/overview/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

### Getting Help

- **Slack**: #joshburt-dev channel
- **GitHub Issues**: For bugs and features
- **Code Review**: Tag @team for reviews
- **Questions**: Ask in daily standup or Slack

## Next Steps

Once you're comfortable with the basics:

1. Review open issues and pick one to work on
2. Read through recent PRs to understand ongoing work
3. Attend team meetings and pair programming sessions
4. Propose improvements or new features
5. Help review other developers' code

Welcome to the team! 🎉

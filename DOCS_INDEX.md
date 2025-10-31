# Technical Documentation Index

This document provides a comprehensive guide to all technical documentation for the joshburt.com.au application.

## Quick Start

**New to the project?** Start here:
1. [README.md](README.md) - Project overview and quick start guide
2. [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design
3. [CONTRIBUTING.md](CONTRIBUTING.md) - Development workflow and guidelines

## Core Documentation

### Architecture & Design
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system architecture
  - System diagrams
  - Component details
  - Data flow
  - Security architecture
  - Deployment architecture
  
### Development
- **[README.md](README.md)** - Project overview, setup, and quick reference
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development guidelines and workflow
- **[ROADMAP.md](ROADMAP.md)** - Project roadmap and future plans

### API Reference
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API reference
  - All endpoints documented
  - Request/response examples
  - Authentication details
  - Error codes

### Database
- **[DATABASE.md](DATABASE.md)** - Database schema and operations
  - Schema definitions
  - Migration procedures
  - Query examples
  - Maintenance tasks

### Authentication & Security
- **[AUTHENTICATION.md](AUTHENTICATION.md)** - Authentication system details
  - JWT implementation
  - OAuth integration
  - Session management
  - Security best practices

### Deployment & Operations
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment procedures
  - Environment setup
  - Deployment workflows
  - Configuration management
  
- **[ROLLBACK_PROCEDURES.md](ROLLBACK_PROCEDURES.md)** - Rollback and recovery
  - Emergency procedures
  - Database rollback
  - Incident response
  
- **[MONITORING.md](MONITORING.md)** - Monitoring and observability
  - Health checks
  - Metrics collection
  - Log aggregation
  - Performance monitoring

## Feature Documentation

### Features
- **[FEATURE_FLAGS.md](FEATURE_FLAGS.md)** - Feature flag system
  - Available flags
  - Implementation guide
  - Testing procedures

### Audit System
- **[AUDIT_EVENTS.md](AUDIT_EVENTS.md)** - Audit event types
- **[AUDIT_LOGGING_SUMMARY.md](AUDIT_LOGGING_SUMMARY.md)** - Audit system overview

### Optimization
- **[OPTIMIZATIONS.md](OPTIMIZATIONS.md)** - Performance optimizations
  - Asset optimization
  - API optimization
  - Database optimization
  - CI/CD optimization

## Implementation Summaries

Project phase summaries (historical reference):
- **[PHASE1_SUMMARY.md](PHASE1_SUMMARY.md)** - Phase 1 implementation
- **[PHASE3_PERFORMANCE_SUMMARY.md](PHASE3_PERFORMANCE_SUMMARY.md)** - Phase 3 performance work
- **[PHASE4_IMPLEMENTATION.md](PHASE4_IMPLEMENTATION.md)** - Phase 4 details
- **[PHASE4_SUMMARY.md](PHASE4_SUMMARY.md)** - Phase 4 summary
- **[PHASE4_QUICKSTART.md](PHASE4_QUICKSTART.md)** - Phase 4 quick start
- **[PHASE5_IMPLEMENTATION_SUMMARY.md](PHASE5_IMPLEMENTATION_SUMMARY.md)** - Phase 5 summary

## Improvement & Planning Documents

- **[IMPROVEMENTS.md](IMPROVEMENTS.md)** - Planned improvements
- **[MODAL-IMPROVEMENTS.md](MODAL-IMPROVEMENTS.md)** - Modal component improvements
- **[OPTIMIZATION-IMPLEMENTATION-SUMMARY.md](OPTIMIZATION-IMPLEMENTATION-SUMMARY.md)** - Optimization summary
- **[FUTURE-RECOMMENDATIONS-COMPLETE.md](FUTURE-RECOMMENDATIONS-COMPLETE.md)** - Future recommendations
- **[ACCESSIBILITY_AUDIT.md](ACCESSIBILITY_AUDIT.md)** - Accessibility compliance

## Specialized Topics

### Serverless Endpoints
- **[SERVERLESS_ENDPOINTS.md](SERVERLESS_ENDPOINTS.md)** - Serverless function details

## Document Navigation by Topic

### Getting Started
```
README.md → ARCHITECTURE.md → CONTRIBUTING.md
```

### Backend Development
```
API_DOCUMENTATION.md → DATABASE.md → AUTHENTICATION.md → SERVERLESS_ENDPOINTS.md
```

### Deployment & Operations
```
DEPLOYMENT.md → ROLLBACK_PROCEDURES.md → MONITORING.md
```

### Feature Development
```
FEATURE_FLAGS.md → AUDIT_EVENTS.md → OPTIMIZATIONS.md
```

## Documentation Standards

### Document Structure
All major documentation follows this structure:
1. **Overview** - What this document covers
2. **Table of Contents** - Quick navigation
3. **Content Sections** - Detailed information
4. **Examples** - Code samples and usage
5. **Version History** - Document changelog

### Maintenance
- Documents are updated with code changes
- Version numbers track major updates
- Last updated dates are maintained
- All documents use Markdown format

## Quick Reference Tables

### Key Configuration Files
| File | Purpose |
|------|---------|
| `package.json` | Node.js dependencies and scripts |
| `netlify.toml` | Netlify configuration |
| `tailwind.config.js` | TailwindCSS configuration |
| `jest.config.js` | Test configuration |
| `eslint.config.js` | Linting rules |

### Key Directories
| Directory | Purpose |
|-----------|---------|
| `.netlify/functions/` | Serverless backend functions |
| `utils/` | Shared utility functions |
| `config/` | Configuration modules |
| `scripts/` | Maintenance and utility scripts |
| `migrations/` | Database migration files |
| `tests/` | Test suites |
| `data/` | Runtime data (logs, reports, metrics) |

### Environment Variables
See [DEPLOYMENT.md](DEPLOYMENT.md) for complete environment variable documentation.

Key variables:
- `DB_TYPE` - Database type (postgres/sqlite)
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Environment (production/development)

## Getting Help

### For Development Questions
1. Check [README.md](README.md) for quick answers
2. Review [CONTRIBUTING.md](CONTRIBUTING.md) for workflow
3. See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for API details

### For Deployment Issues
1. Check [DEPLOYMENT.md](DEPLOYMENT.md) for procedures
2. Review [ROLLBACK_PROCEDURES.md](ROLLBACK_PROCEDURES.md) if needed
3. Check [MONITORING.md](MONITORING.md) for diagnostics

### For Architecture Questions
1. Start with [ARCHITECTURE.md](ARCHITECTURE.md)
2. Review specific component documentation
3. Check implementation phase summaries

## Document Updates

To update documentation:
1. Make changes in the relevant `.md` file
2. Update version number if major change
3. Update "Last Updated" date
4. Commit with descriptive message
5. Update this index if adding new documents

## Version History

- **1.0.0** (2025-10-31): Initial comprehensive documentation index
  - Consolidated all existing documentation
  - Added navigation guides
  - Created quick reference tables

---

**Maintained By**: Development Team  
**Last Updated**: 2025-10-31

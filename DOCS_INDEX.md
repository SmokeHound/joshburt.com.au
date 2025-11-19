# Technical Documentation Index

Welcome to the joshburt.com.au documentation. All technical documentation is organized in the `/docs` directory.

## Quick Start

**New to the project?** Start here:

1. [README.md](README.md) - Project overview and quick start guide
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture and design
3. [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) - Development workflow and guidelines

## Core Documentation

### Architecture & Design

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Complete system architecture
  - System diagrams
  - Component details
  - Data flow
  - Security architecture
  - Deployment architecture

### Development

- **[README.md](README.md)** - Project overview, setup, and quick reference
- **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** - Development guidelines and workflow
- **[docs/ROADMAP.md](docs/ROADMAP.md)** - Project roadmap and future plans

### API Reference

- **[docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)** - Complete API reference
  - All endpoints documented
  - Request/response examples
  - Authentication details
  - Error codes

### Database

- **[docs/DATABASE.md](docs/DATABASE.md)** - Database schema and operations
  - Schema definitions
  - Migration procedures
  - Query examples
  - Maintenance tasks

### Authentication & Security

- **[docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)** - Authentication system details
  - JWT implementation
  - OAuth integration
  - Session management
  - Security best practices

### Deployment & Operations

- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deployment procedures
  - Environment setup
  - Deployment workflows
  - Configuration management
- **[docs/ROLLBACK_PROCEDURES.md](docs/ROLLBACK_PROCEDURES.md)** - Rollback and recovery
  - Emergency procedures
  - Database rollback
  - Incident response
- **[docs/MONITORING.md](docs/MONITORING.md)** - Monitoring and observability
  - Health checks
  - Metrics collection
  - Log aggregation
  - Performance monitoring

## Feature Documentation

### Features

- **[docs/FEATURE_FLAGS.md](docs/FEATURE_FLAGS.md)** - Feature flag system
  - Available flags
  - Implementation guide
  - Testing procedures

### Audit System

- **[docs/AUDIT_EVENTS.md](docs/AUDIT_EVENTS.md)** - Audit event types
- **[docs/AUDIT_LOGGING.md](docs/AUDIT_LOGGING.md)** - Audit system overview

## Planning & Historical

### Current Planning

- **[UPGRADE_PLAN.md](UPGRADE_PLAN.md)** - Comprehensive upgrade and improvements plan
  - Replace external services with self-hosted solutions
  - Advanced analytics and reporting
  - Search and discovery features
  - Data management enhancements
  - Performance optimizations
  - Security improvements
  - PWA and offline support
  - Business intelligence features
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Quick-start implementation guide
  - Phase-by-phase implementation steps
  - Code examples and templates
  - Testing strategies
  - Deployment checklists
  - Troubleshooting tips
- **[IMPROVEMENTS.md](IMPROVEMENTS.md)** - Planned improvements (legacy)
- **[MODAL-IMPROVEMENTS.md](MODAL-IMPROVEMENTS.md)** - Modal component improvements
- **[OPTIMIZATIONS.md](OPTIMIZATIONS.md)** - Performance optimizations
  - Asset optimization
  - API optimization
  - Database optimization
  - CI/CD optimization

### Implementation Summaries

Project phase summaries (historical reference):

- **[PHASE1_SUMMARY.md](PHASE1_SUMMARY.md)** - Phase 1 implementation
- **[PHASE3_PERFORMANCE_SUMMARY.md](PHASE3_PERFORMANCE_SUMMARY.md)** - Phase 3 performance work
- **[PHASE4_IMPLEMENTATION.md](PHASE4_IMPLEMENTATION.md)** - Phase 4 details
- **[PHASE4_SUMMARY.md](PHASE4_SUMMARY.md)** - Phase 4 summary
- **[PHASE4_QUICKSTART.md](PHASE4_QUICKSTART.md)** - Phase 4 quick start
- **[PHASE5_IMPLEMENTATION_SUMMARY.md](PHASE5_IMPLEMENTATION_SUMMARY.md)** - Phase 5 summary
- **[OPTIMIZATION-IMPLEMENTATION-SUMMARY.md](OPTIMIZATION-IMPLEMENTATION-SUMMARY.md)** - Optimization summary
- **[FUTURE-RECOMMENDATIONS-COMPLETE.md](FUTURE-RECOMMENDATIONS-COMPLETE.md)** - Future recommendations

---

## Document Navigation by Topic

### Getting Started

```
README.md → docs/ARCHITECTURE.md → docs/CONTRIBUTING.md
```

### Backend Development

```
docs/API_DOCUMENTATION.md → docs/DATABASE.md → docs/AUTHENTICATION.md
```

### Deployment & Operations

```
docs/DEPLOYMENT.md → docs/ROLLBACK_PROCEDURES.md → docs/MONITORING.md
```

### Feature Development

```
docs/FEATURE_FLAGS.md → docs/AUDIT_EVENTS.md → docs/ROADMAP.md
```

---

## Quick Reference Tables

### Key Configuration Files

| File                 | Purpose                           |
| -------------------- | --------------------------------- |
| `package.json`       | Node.js dependencies and scripts  |
| `netlify.toml`       | Netlify serverless configuration  |
| `tailwind.config.js` | TailwindCSS styling configuration |
| `jest.config.js`     | Testing framework configuration   |
| `eslint.config.js`   | Code linting rules                |

### Key Directories

| Directory             | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `.netlify/functions/` | Serverless backend API functions           |
| `docs/`               | All technical documentation                |
| `utils/`              | Shared utility functions                   |
| `config/`             | Configuration modules                      |
| `scripts/`            | Maintenance and utility scripts            |
| `migrations/`         | Database migration files                   |
| `tests/`              | Test suites (unit, integration, functions) |

### Environment Variables

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete environment variable documentation.

---

## Getting Help

### For Development Questions

1. Check [README.md](README.md) for quick answers
2. Review [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for workflow
3. See [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) for API details

### For Deployment Issues

1. Check [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for procedures
2. Review [docs/ROLLBACK_PROCEDURES.md](docs/ROLLBACK_PROCEDURES.md) if needed
3. Check [docs/MONITORING.md](docs/MONITORING.md) for diagnostics

### For Architecture Questions

1. Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
2. Review specific component documentation
3. Check implementation phase summaries

---

## Documentation Standards

### Document Structure

All major documentation follows this structure:

1. **Overview** - What this document covers
2. **Table of Contents** - Quick navigation
3. **Content Sections** - Detailed information
4. **Examples** - Code samples and usage
5. **Last Updated** - Maintenance date

### Maintenance

- Documents are updated with code changes
- Last updated dates are maintained
- All documents use Markdown format
- Code examples are included where applicable

---

## Document Updates

To update documentation:

1. Make changes in the relevant `.md` file
2. Update "Last Updated" date
3. Commit with descriptive message
4. Update this index if adding new documents

---

**Last Updated**: 2025-11-11  
**Maintained By**: Development Team

# Documentation Index

Complete guide to joshburt.com.au documentation.

## Quick Start

- 🚀 **[README](../README.md)** - Project overview and getting started
- 👨‍💻 **[Developer Onboarding](DEVELOPER_ONBOARDING.md)** - New developer setup guide
- 🤝 **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute

## Core Documentation

### Development

- 📐 **[Architecture](ARCHITECTURE.md)** - System architecture and diagrams
- 🔌 **[API Documentation](../API_DOCUMENTATION.md)** - REST API reference
- 📋 **[OpenAPI Specification](../openapi.yaml)** - Swagger/OpenAPI 3.0 spec
- 🗄️ **[Database Schema](../DATABASE.md)** - Database design and queries
- 🔐 **[Authentication](../AUTHENTICATION.md)** - Auth system details
- 🏗️ **[Serverless Endpoints](../SERVERLESS_ENDPOINTS.md)** - Function documentation

### Operations

- 🚢 **[Deployment Guide](../DEPLOYMENT.md)** - Basic deployment info
- 🤖 **[Deployment Automation](DEPLOYMENT_AUTOMATION.md)** - CI/CD and automation
- 🗃️ **[Database Migrations](DATABASE_MIGRATIONS.md)** - Migration system
- 🎯 **[Staging Setup](STAGING_SETUP.md)** - Staging environment guide

### Monitoring & Debugging

- 📊 **[Monitoring](../MONITORING.md)** - Basic monitoring setup
- 📈 **[Monitoring Dashboards](MONITORING_DASHBOARDS.md)** - Dashboard configs
- 🚨 **[Alerting Rules](ALERTING_RULES.md)** - Alert configuration
- 📝 **[Log Aggregation](LOG_AGGREGATION.md)** - Log management
- 🔧 **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues and solutions

### Features

- 🚩 **[Feature Flags](../FEATURE_FLAGS.md)** - Feature flag system
- 📊 **[Audit Logging](../AUDIT_LOGGING_SUMMARY.md)** - Audit system
- ⚡ **[Optimizations](../OPTIMIZATIONS.md)** - Performance optimization

### Planning & Roadmap

- 🗺️ **[Roadmap](../ROADMAP.md)** - Development roadmap
- 💡 **[Future Recommendations](../FUTURE-RECOMMENDATIONS-COMPLETE.md)** - Future improvements
- ✅ **[Phase 1 Summary](../PHASE1_SUMMARY.md)** - Completed Phase 1

## Documentation by Role

### For New Developers

Start here:
1. [README](../README.md) - Understand the project
2. [Developer Onboarding](DEVELOPER_ONBOARDING.md) - Setup your environment
3. [Architecture](ARCHITECTURE.md) - Learn the system
4. [API Documentation](../API_DOCUMENTATION.md) - Understand the API
5. [Troubleshooting](TROUBLESHOOTING.md) - Solve common issues

### For DevOps Engineers

Focus on:
1. [Deployment Automation](DEPLOYMENT_AUTOMATION.md) - Deployment pipelines
2. [Database Migrations](DATABASE_MIGRATIONS.md) - Schema management
3. [Staging Setup](STAGING_SETUP.md) - Environment setup
4. [Monitoring Dashboards](MONITORING_DASHBOARDS.md) - Observability
5. [Alerting Rules](ALERTING_RULES.md) - Alert configuration

### For QA/Testers

Review:
1. [README](../README.md) - Feature overview
2. [Testing Guide](../CONTRIBUTING.md#testing) - Test guidelines
3. [API Documentation](../API_DOCUMENTATION.md) - API endpoints
4. [Troubleshooting](TROUBLESHOOTING.md) - Known issues

### For Product Managers

Read:
1. [README](../README.md) - Feature overview
2. [Roadmap](../ROADMAP.md) - Future plans
3. [Feature Flags](../FEATURE_FLAGS.md) - Feature toggles
4. [Architecture](ARCHITECTURE.md) - System capabilities

## Documentation by Topic

### Setup & Installation

- [README - Quick Start](../README.md#quick-start)
- [Developer Onboarding](DEVELOPER_ONBOARDING.md)
- [Staging Setup](STAGING_SETUP.md)
- [Database Schema](../DATABASE.md)

### Development

- [Contributing Guide](../CONTRIBUTING.md)
- [API Documentation](../API_DOCUMENTATION.md)
- [OpenAPI Specification](../openapi.yaml)
- [Architecture](ARCHITECTURE.md)
- [Database](../DATABASE.md)

### Testing

- [Contributing - Testing](../CONTRIBUTING.md#testing)
- [Test Documentation](../test-api-integration.md)
- Developer Onboarding - Testing Section

### Deployment

- [Deployment Guide](../DEPLOYMENT.md)
- [Deployment Automation](DEPLOYMENT_AUTOMATION.md)
- [Database Migrations](DATABASE_MIGRATIONS.md)
- [Staging Setup](STAGING_SETUP.md)

### Monitoring

- [Monitoring](../MONITORING.md)
- [Monitoring Dashboards](MONITORING_DASHBOARDS.md)
- [Alerting Rules](ALERTING_RULES.md)
- [Log Aggregation](LOG_AGGREGATION.md)

### Security

- [Authentication](../AUTHENTICATION.md)
- [Audit Logging](../AUDIT_LOGGING_SUMMARY.md)
- [Audit Events](../AUDIT_EVENTS.md)

### Performance

- [Optimizations](../OPTIMIZATIONS.md)
- [Optimization Summary](../OPTIMIZATION-IMPLEMENTATION-SUMMARY.md)

### Features

- [Feature Flags](../FEATURE_FLAGS.md)
- [Modal Improvements](../MODAL-IMPROVEMENTS.md)

## Templates

- [Weekly Performance Report](templates/weekly-performance-report.md)

## API Documentation Formats

- **Human-Readable**: [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)
- **Machine-Readable**: [openapi.yaml](../openapi.yaml)
- **Interactive**: Import `openapi.yaml` into [Swagger Editor](https://editor.swagger.io/)

## Version History

- **v1.0.0**: Initial production release
- See [ROADMAP.md](../ROADMAP.md) for future versions

## Contributing to Documentation

### Documentation Standards

1. **Format**: Use Markdown (.md)
2. **Structure**: Clear headings (H1, H2, H3)
3. **Code Examples**: Use syntax-highlighted code blocks
4. **Diagrams**: Use Mermaid syntax for diagrams
5. **Links**: Use relative links within docs
6. **Audience**: Write for your target reader
7. **Updates**: Keep docs in sync with code

### Adding New Documentation

1. Create `.md` file in appropriate directory
2. Add to this index under relevant sections
3. Link from related documents
4. Update in PR that adds the feature
5. Review for clarity and accuracy

### Documentation Review Checklist

- [ ] Clear and concise
- [ ] Correct markdown syntax
- [ ] Code examples tested
- [ ] Links work
- [ ] Images/diagrams included
- [ ] Spelling/grammar checked
- [ ] Added to documentation index
- [ ] Target audience appropriate

## Documentation Maintenance

### Regular Updates

- **Weekly**: Update troubleshooting with new issues
- **Per Release**: Update API docs, changelog
- **Monthly**: Review and update roadmap
- **Quarterly**: Comprehensive documentation audit

### Ownership

| Documentation | Owner | Review Frequency |
|---------------|-------|------------------|
| README | Product Team | Per release |
| API Docs | Backend Team | Per API change |
| Architecture | Tech Lead | Quarterly |
| Deployment | DevOps Team | Monthly |
| Monitoring | SRE Team | Monthly |

## Getting Help

### Documentation Issues

- **Unclear documentation**: Open GitHub issue with `documentation` label
- **Missing documentation**: Request in #dev-docs Slack channel
- **Corrections**: Submit PR with fix
- **Questions**: Ask in #general Slack channel

### Contacts

- **Documentation Lead**: @doc-team
- **Technical Writing**: tech-writing@joshburt.com.au
- **DevOps Questions**: @devops-team
- **API Questions**: @backend-team

## External Resources

### Netlify

- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/)
- [Deploy Contexts](https://docs.netlify.com/site-deploys/overview/)

### Database

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Neon Documentation](https://neon.tech/docs/introduction)

### Tools

- [Node.js Documentation](https://nodejs.org/docs/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Jest Testing](https://jestjs.io/docs/getting-started)

## Feedback

We're always improving our documentation! 

- 👍 Helpful? Give us feedback
- 📝 Missing something? Open an issue
- 🐛 Found an error? Submit a PR
- 💡 Have a suggestion? Let us know

---

**Last Updated**: 2025-01-01  
**Maintained By**: Development Team  
**License**: MIT

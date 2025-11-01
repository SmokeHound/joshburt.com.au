# Deployment Rollback Procedures

This document provides detailed procedures for rolling back failed deployments.

## Quick Reference

### Emergency Rollback Commands
```bash
# Option 1: Revert the last commit
git revert HEAD
git push origin main

# Option 2: Reset to specific commit (force push - use with caution)
git reset --hard <previous-commit-sha>
git push --force origin main

# Option 3: Deploy from a specific tag/commit via GitHub Actions
# Trigger workflow dispatch with specific commit
```

## Rollback Scenarios

### 1. Failed Deployment Detection

A deployment is considered failed when:
- Build steps fail (lint, test, build)
- FTP deployment fails
- Database migrations fail
- Post-deployment health checks fail

GitHub Actions will automatically:
1. Stop the deployment process
2. Display rollback instructions in the summary
3. Send failure notifications
4. Log the failed commit for tracking

### 2. Application Code Rollback

#### Automatic Rollback (Git Revert)
The safest approach - creates a new commit that undoes changes:

```bash
# Step 1: Identify the problematic commit
git log --oneline -10

# Step 2: Revert the commit (this creates a new commit)
git revert <bad-commit-sha>

# Step 3: Push to trigger automatic re-deployment
git push origin main
```

**Advantages:**
- Preserves git history
- Safe for shared branches
- Triggers CI/CD automatically
- Can be reverted if mistake was made

#### Manual Rollback (Git Reset)
Use only when revert is not possible:

```bash
# WARNING: This rewrites history - coordinate with team first

# Step 1: Identify the last good commit
git log --oneline -10

# Step 2: Reset to that commit
git reset --hard <good-commit-sha>

# Step 3: Force push (requires force-push permissions)
git push --force origin main
```

**⚠️ WARNING:** Force pushing:
- Rewrites git history
- Can cause issues for team members
- Requires coordination
- Use only as last resort

### 3. Database Rollback

#### Migration Rollback Strategy

**Prevention First:**
- Migrations are checked in dry-run mode before deployment
- Failed migrations stop the deployment automatically
- No automatic database rollback (by design - data safety)

**Manual Migration Rollback:**

1. **Identify the problematic migration:**
```bash
# Connect to database and check applied migrations
SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;
```

2. **Create a rollback migration:**
```bash
# Create a new migration file that reverses the changes
# Example: migrations/004_rollback_notification_system.sql
```

3. **Apply the rollback migration:**
```bash
# Add the rollback SQL file to migrations/
node scripts/run-migrations.js
```

**Important Database Notes:**
- Never manually delete entries from `schema_migrations` table
- Always create forward-fixing migrations, not manual rollbacks
- Database changes should be backwards compatible when possible
- Test migrations thoroughly in staging environment first

#### Database Backup & Restore

**Before risky migrations:**
```bash
# PostgreSQL backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restore from backup:**
```bash
# PostgreSQL restore
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_file.sql
```

### 4. Static File Rollback (FTP)

If static files were deployed but need rollback:

**Option 1: Re-deploy from previous commit**
```bash
# Checkout the last good commit
git checkout <good-commit-sha>

# Manually trigger deployment workflow
# Or create a temporary branch and push
git checkout -b rollback-temp
git push origin rollback-temp
```

**Option 2: Manual FTP rollback**
1. Access FTP server with credentials
2. Restore files from backup (if available)
3. Or manually upload files from previous commit

### 5. Netlify Functions Rollback

Netlify deployments can be rolled back through:

**Via Netlify Dashboard:**
1. Log into Netlify dashboard
2. Go to Deploys section
3. Find the last successful deployment
4. Click "Publish deploy" to rollback

**Via Netlify CLI:**
```bash
# List recent deployments
netlify deploy:list

# Restore a specific deployment
netlify api restoreDeploy --deploy_id=<deploy-id>
```

## Post-Rollback Checklist

After completing a rollback:

- [ ] Verify application is functioning correctly
- [ ] Check database integrity
- [ ] Verify all critical endpoints are working
- [ ] Run smoke tests: `npm run test:functions`
- [ ] Monitor error logs for 15-30 minutes
- [ ] Document the incident in a post-mortem
- [ ] Update the team via communication channels
- [ ] Plan forward fix for the issue that caused rollback

## Rollback Decision Matrix

| Failure Type | Recommended Action | Urgency | Data Risk |
|--------------|-------------------|---------|-----------|
| Lint/Test Failure | Fix forward + push | Low | None |
| Build Failure | Fix forward + push | Low | None |
| FTP Deploy Failure | Retry or fix forward | Medium | None |
| Migration Failure | Stop, assess, manual fix | High | High |
| Runtime Errors | Git revert + redeploy | High | Low |
| Data Corruption | Database restore + revert | Critical | Critical |

## Prevention Best Practices

To minimize the need for rollbacks:

1. **Always run locally first:**
   ```bash
   npm run validate  # Runs lint + build + tests
   ```

2. **Use feature flags for risky changes:**
   - Deploy code disabled by default
   - Enable gradually after monitoring

3. **Test migrations thoroughly:**
   ```bash
   # Always test in development first
   DB_TYPE=postgres node scripts/run-migrations.js
   ```

4. **Use staging environment:**
   - Deploy to staging first
   - Verify functionality
   - Then deploy to production

5. **Small, incremental changes:**
   - Easier to identify issues
   - Faster to rollback if needed
   - Less risky overall

## Emergency Contacts

In case of critical deployment issues:

- **Primary:** Check GitHub Actions logs and GITHUB_STEP_SUMMARY
- **Database Issues:** Access via connection details in secrets
- **FTP Issues:** Verify credentials in GitHub Secrets
- **Netlify Issues:** Check Netlify dashboard and function logs

## Monitoring After Rollback

After rollback, monitor:

1. **Error rates:**
   - Check function logs in Netlify
   - Monitor application logs

2. **Performance metrics:**
   - Response times via health endpoint
   - Database query performance

3. **User experience:**
   - Test critical user flows
   - Check for error reports

4. **Database health:**
   ```bash
   # Run health check
   curl https://joshburt.com.au/.netlify/functions/health
   ```

## Rollback Testing

Periodically test rollback procedures:

1. **Simulate a failed deployment** in staging
2. **Execute rollback procedures**
3. **Document any issues** or improvements needed
4. **Update this document** based on lessons learned

## Version History

- **2025-10-31:** Initial rollback procedures documentation
- Document version: 1.0.0

---

**Remember:** The best rollback is the one you never have to perform. Focus on testing, validation, and gradual deployments to minimize risk.

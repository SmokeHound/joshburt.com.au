# Rollback Procedures

Emergency rollback procedures for joshburt.com.au.

## Table of Contents

- [Netlify Rollback](#netlify-rollback)
- [Database Rollback](#database-rollback)
- [Emergency Procedures](#emergency-procedures)
- [Post-Rollback](#post-rollback)

---

## Netlify Rollback

### Via Dashboard

**Steps**:
1. Go to **Deploys** tab
2. Find previous successful deploy
3. Click **"Publish deploy"**
4. Confirm rollback

**Downtime**: ~30 seconds

### Via CLI

```bash
# List recent deploys
netlify deploy:list

# Rollback to specific deploy ID
netlify deploy:publish <deploy-id>
```

**Example**:
```bash
netlify deploy:publish 5f8a1b2c3d4e5f6g7h8i9j0k
```

---

## Database Rollback

### Point-in-Time Recovery (Neon)

**Neon Dashboard**:
1. Project → **Restore**
2. Select timestamp (last 7 days)
3. Create new branch or restore to main
4. Update connection strings if branch created

**Downtime**: ~5 minutes

### Manual Rollback

#### From Backup Dump

```bash
# Restore full database
pg_restore -h your-host.neon.tech \
  -U your-user \
  -d your-db \
  -v backup-20251110.dump

# Or restore specific tables
pg_restore -h your-host.neon.tech \
  -U your-user \
  -d your-db \
  -t products -t orders \
  backup-20251110.dump
```

#### Schema Rollback

To rollback schema changes, restore from a backup dump:

```bash
# Restore from backup
pg_restore -h your-host.neon.tech \
  -U your-user \
  -d your-db \
  -v backup-20251110.dump
```

---

## Emergency Procedures

### Enable Maintenance Mode

**Fastest Method** (direct database):

```sql
-- Enable maintenance mode
UPDATE settings SET data = jsonb_set(data, '{maintenanceMode}', 'true');
```

**Via API**:

```bash
curl -X PUT https://joshburt.netlify.app/.netlify/functions/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maintenanceMode":true}'
```

**Effect**: All pages show maintenance message to users.

### Disable Feature Flag

```sql
-- Disable specific feature
UPDATE settings SET data = jsonb_set(
  data,
  '{featureFlags,problematicFeature}',
  'false'
);
```

### Clear User Sessions

```sql
-- Invalidate all refresh tokens (forces re-login)
DELETE FROM refresh_tokens;
```

---

## Post-Rollback

### Verification Checklist

```bash
# 1. Health check
curl https://joshburt.netlify.app/.netlify/functions/health

# 2. Test login
curl -X POST https://joshburt.netlify.app/.netlify/functions/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'

# 3. Test key endpoints
curl https://joshburt.netlify.app/.netlify/functions/products \
  -H "Authorization: Bearer TOKEN"

# 4. Check database
psql -h your-host.neon.tech -U your-user -d your-db -c "SELECT COUNT(*) FROM users;"
```

### Disable Maintenance Mode

```sql
UPDATE settings SET data = jsonb_set(data, '{maintenanceMode}', 'false');
```

### Notify Users

If issue affected users:
1. Post incident report
2. Email affected users (if applicable)
3. Update status page

---

## Incident Response

### 1. Assess Impact

- How many users affected?
- What functionality broken?
- Data loss risk?

### 2. Communicate

- Enable maintenance mode if critical
- Post status update (GitHub issues/discussions)
- Notify team

### 3. Rollback Decision

**Rollback if**:
- Critical functionality broken
- Data corruption risk
- Security vulnerability
- >50% users affected

**Don't rollback if**:
- Minor UI issue
- Affects <10% users
- Quick hotfix available

### 4. Execute Rollback

Follow procedures above (Netlify and/or database).

### 5. Root Cause Analysis

After rollback:
- Identify cause
- Document lessons learned
- Update tests to prevent recurrence
- Plan fix for redeployment

---

## Contact

**Emergency Contact**: [Your email/phone for critical issues]

**GitHub Issues**: https://github.com/SmokeHound/joshburt.com.au/issues

---

**Last Updated**: 2025-11-11  
**Maintained By**: Development Team

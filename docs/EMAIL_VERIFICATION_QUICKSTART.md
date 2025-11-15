# Email Verification System - Quick Start Guide

**Complete email verification system with admin management and comprehensive tracking.**

---

## 🚀 Quick Setup

### 1. Run Database Migration

```bash
# Check what migrations are pending
node scripts/run-migrations.js --dry-run

# Apply all migrations
node scripts/run-migrations.js
```

**Or manually:**

```bash
psql $DATABASE_URL -f migrations/005_add_email_verification_tracking.sql
```

### 2. Test Database Schema

```bash
npm run test:email-verification
```

Should output:

```
✅ email_verification_attempts table exists
✅ All required columns present
✅ Indexes created
✅ Data insertion works
✅ Users table properly configured
```

### 3. Configure SMTP (if not already done)

Add to `.env`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@joshburt.com.au
```

Test SMTP:

```bash
npm run test:smtp
```

---

## 📋 User Flows

### New User Registration

1. User fills out registration form
2. Account created with `email_verified = false`
3. Verification email sent with 24-hour token
4. **Tracking**: `initial` attempt logged with IP/user agent

### Email Verification

1. User clicks link in email
2. Token validated (checks expiration)
3. User email marked as verified
4. **Tracking**: `verify` attempt logged (success or failure reason)

### Resend Verification

1. User visits `/resend-verification.html`
2. Enters email address
3. Old tokens invalidated, new email sent
4. **Tracking**: `resend` attempt logged

### Admin Manual Verification

1. Admin opens Users Management page
2. Finds user with ⚠ Unverified badge
3. Clicks "Verify Email" button
4. Confirms action in modal
5. Email marked as verified immediately
6. **Tracking**: `admin_manual` attempt logged

---

## 🔧 Admin Features

### View Email Status

Navigate to **Users Management** (`/users.html`):

- ✅ **Green badge**: Email verified
- ⚠️ **Yellow badge**: Email unverified

### Manually Verify Email

**When to use:**

- User never received email
- Email ended up in spam
- Token expired
- User cannot access email temporarily

**Steps:**

1. Find user in list
2. Click **"Verify Email"** button
3. Confirm in dialog
4. User email immediately verified
5. Audit logged automatically

### View Verification History

**What you'll see:**

- All verification attempts (initial, resend, verify, admin)
- Success/failure status (color-coded)
- IP addresses for each attempt
- Timestamps
- Error messages (for failures)

**Steps:**

1. Click **"Verify Attempts"** for any user
2. Review modal showing all attempts:
   - 🟢 Green = Success
   - 🔴 Red = Failed
3. Look for patterns (spam issues, expired tokens, etc.)

---

## 🔍 Monitoring

### Check Verification Attempts

**SQL Query:**

```sql
SELECT
  u.name,
  u.email,
  eva.attempt_type,
  eva.success,
  eva.error_message,
  eva.created_at
FROM email_verification_attempts eva
JOIN users u ON eva.user_id = u.id
WHERE eva.created_at > NOW() - INTERVAL '7 days'
ORDER BY eva.created_at DESC;
```

### Common Issues to Watch For

**High failure rates:**

```sql
SELECT
  attempt_type,
  COUNT(*) as total,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM email_verification_attempts
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY attempt_type;
```

**Multiple failed attempts from same IP:**

```sql
SELECT
  ip_address,
  COUNT(*) as attempts,
  COUNT(DISTINCT user_id) as users
FROM email_verification_attempts
WHERE
  success = false
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY attempts DESC;
```

---

## 📊 API Reference

### Manual Verification Endpoint

**POST** `/.netlify/functions/users/:id/verify-email`

**Permissions:** Admin only

**Request:**

```javascript
fetch(`${FN_BASE}/users/123/verify-email`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});
```

**Response (200):**

```json
{
  "message": "Email verified successfully",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "email_verified": true,
    "name": "John Doe"
  }
}
```

**Errors:**

- `400`: Email already verified
- `401`: Unauthorized (not logged in)
- `403`: Forbidden (not admin)
- `404`: User not found

### View Attempts Endpoint

**GET** `/.netlify/functions/users/:id/verification-attempts`

**Permissions:** Admin only

**Request:**

```javascript
fetch(`${FN_BASE}/users/123/verification-attempts`, {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});
```

**Response (200):**

```json
{
  "attempts": [
    {
      "id": 1,
      "email": "user@example.com",
      "attempt_type": "initial",
      "success": true,
      "ip_address": "192.168.1.1",
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "email": "user@example.com",
      "attempt_type": "verify",
      "success": false,
      "ip_address": "192.168.1.1",
      "error_message": "Token expired",
      "created_at": "2024-01-16T14:20:00Z"
    },
    {
      "id": 3,
      "email": "user@example.com",
      "attempt_type": "admin_manual",
      "success": true,
      "ip_address": "10.0.0.1",
      "created_at": "2024-01-16T15:00:00Z"
    }
  ]
}
```

---

## 🗄️ Database Schema

### email_verification_attempts Table

```sql
CREATE TABLE email_verification_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    attempt_type VARCHAR(50) NOT NULL,  -- 'initial', 'resend', 'verify', 'admin_manual'
    token_used VARCHAR(255),            -- Token that was used (nullable)
    success BOOLEAN DEFAULT false,      -- Did attempt succeed?
    ip_address VARCHAR(45),             -- IPv4 or IPv6
    user_agent TEXT,                    -- Browser/client info
    error_message TEXT,                 -- Error if failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_verification_attempts_user ON email_verification_attempts(user_id);
CREATE INDEX idx_verification_attempts_email ON email_verification_attempts(email);
CREATE INDEX idx_verification_attempts_created ON email_verification_attempts(created_at);
CREATE INDEX idx_verification_attempts_success ON email_verification_attempts(success);
```

### Attempt Types

| Type           | Description                                   | Triggered By       |
| -------------- | --------------------------------------------- | ------------------ |
| `initial`      | First verification email sent on registration | User registration  |
| `resend`       | User requested new verification email         | Resend button/page |
| `verify`       | User clicked verification link                | Email link click   |
| `admin_manual` | Admin manually verified email                 | Admin action       |

---

## 🎯 Best Practices

### When to Manually Verify

✅ **DO manually verify when:**

- User's email provider is blocking verification emails
- User has verified their identity through other means
- Token expired and user needs immediate access
- Corporate email system requires admin approval

❌ **DON'T manually verify when:**

- User hasn't checked spam folder
- User might be attempting to bypass security
- Email address appears suspicious
- Multiple failed attempts from same IP (possible attack)

### Security Considerations

1. **Always check user identity** before manual verification
2. **Review verification history** for suspicious patterns
3. **Monitor failure rates** across all attempt types
4. **Investigate** multiple failures from same IP
5. **Document reason** for manual verifications (in audit logs)

### Email Deliverability

If you see high initial/resend failure rates:

- Check SMTP configuration
- Verify SPF/DKIM/DMARC records
- Review email content for spam triggers
- Test with different email providers

---

## 🐛 Troubleshooting

### Users not receiving emails

**Check SMTP:**

```bash
npm run test:smtp
```

**Check tracking table:**

```sql
SELECT * FROM email_verification_attempts
WHERE email = 'user@example.com'
ORDER BY created_at DESC;
```

**Common causes:**

- SMTP credentials incorrect
- Email in spam folder
- Corporate firewall blocking
- Email quota exceeded

### Tokens expiring too quickly

**Current token lifetime:** 24 hours

**Extend in `auth.js`:**

```javascript
// Change from 24 hours to 72 hours
const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
```

### Database errors

**Test schema:**

```bash
npm run test:email-verification
```

**Check migration:**

```bash
node scripts/run-migrations.js --dry-run
```

---

## 📚 Related Documentation

- **[EMAIL_VERIFICATION.md](./EMAIL_VERIFICATION.md)** - Complete system documentation
- **[ADMIN_EMAIL_VERIFICATION.md](./ADMIN_EMAIL_VERIFICATION.md)** - Detailed admin guide
- **[AUTHENTICATION.md](./AUTHENTICATION.md)** - Overall auth system
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Full API reference

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] Run database migration on staging
- [ ] Test SMTP configuration
- [ ] Test user registration flow
- [ ] Test resend verification flow
- [ ] Test email verification link
- [ ] Test admin manual verification
- [ ] Test verification history viewing
- [ ] Train admins on manual verification process
- [ ] Set up monitoring for verification failures
- [ ] Document any custom SMTP configuration
- [ ] Run full test suite: `npm run validate`

---

**Last updated:** January 2024  
**System version:** 1.0.0 (Email Verification with Admin Management)

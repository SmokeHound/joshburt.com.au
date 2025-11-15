# Admin Email Verification Guide

## Overview
Admins can now manage email verification for users directly from the Users Management page.

## Features

### 1. Visual Email Status
Each user in the user list shows their email verification status:
- ✓ **Verified** (green) - Email has been verified
- ⚠ **Unverified** (yellow) - Email needs verification

### 2. Manual Email Verification
For users with unverified emails, admins can manually verify without requiring the user to click an email link.

**How to Use**:
1. Navigate to **Users Management** page
2. Find the user with unverified email
3. Click **"Verify Email"** button next to their name
4. Confirm the action in the dialog
5. Email will be marked as verified immediately

**When to Use**:
- User reports they never received verification email
- Email verification link expired
- User cannot access their email temporarily
- Testing or development scenarios

### 3. View Verification Attempts
Track all email verification activity for any user.

**How to Use**:
1. Navigate to **Users Management** page
2. Click **"Verify Attempts"** button for any user
3. View detailed history of verification attempts

**Information Displayed**:
- **Attempt Type**: 
  - `INITIAL` - First verification email on registration
  - `RESEND` - User requested resend
  - `VERIFY` - User clicked verification link
  - `ADMIN MANUAL` - Admin manually verified
- **Success Status**: Green (✓) for success, Red (✗) for failure
- **Email Address**: Email that was being verified
- **IP Address**: Where the attempt originated
- **Timestamp**: When the attempt occurred
- **Error Message**: If the attempt failed, why it failed

### 4. Security & Audit
All manual verifications are tracked:
- Logged in **Audit Logs** with admin user who performed action
- Recorded in **Email Verification Attempts** table
- Includes IP address and timestamp for compliance

## API Endpoints (for developers)

### Manual Verification
```
POST /.netlify/functions/users/:userId/verify-email
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "message": "Email verified successfully",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "email_verified": true
  }
}
```

### View Attempts
```
GET /.netlify/functions/users/:userId/verification-attempts
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "attempts": [
    {
      "id": 1,
      "email": "user@example.com",
      "attempt_type": "initial",
      "success": true,
      "ip_address": "192.168.1.1",
      "created_at": "2025-11-16T12:00:00Z"
    }
  ]
}
```

## Database Schema

### email_verification_attempts Table
```sql
CREATE TABLE email_verification_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    attempt_type VARCHAR(50) NOT NULL,
    token_used VARCHAR(255),
    success BOOLEAN DEFAULT false,
    ip_address VARCHAR(45),
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Best Practices

### When to Manually Verify
✅ **Good Reasons**:
- User cannot receive emails (spam folder, email service issues)
- Verification email expired and user requests help
- Internal testing accounts
- VIP users requiring immediate access

❌ **Avoid**:
- Bypassing verification for untrusted users
- Verifying email addresses you haven't confirmed belong to the user
- Bulk verification without user request

### Security Considerations
- Manual verification should be rare - automated verification is preferred
- Always confirm user identity before manual verification
- Review verification attempts if you see suspicious patterns
- Check audit logs regularly for manual verifications

### Monitoring
Regularly check verification attempts for:
- High failure rates (indicates email delivery issues)
- Multiple failed verify attempts (potential security issue)
- Unusual IP addresses for admin manual verifications
- Error patterns that need investigation

## Troubleshooting

### User Reports "No Verification Email"
1. Check verification attempts to see if email was sent
2. Ask user to check spam/junk folder
3. Verify SMTP is configured correctly (`npm run test:smtp`)
4. Have user request resend from login page
5. As last resort, manually verify email

### Verification Keeps Failing
1. View verification attempts to see error messages
2. Check if token expired (24 hour limit)
3. Verify database connectivity
4. Check audit logs for related issues

### High Volume of Resends
May indicate:
- Email delivery problems
- Spam filtering issues
- User confusion about process
- Consider improving email template or instructions

## Migration

To enable these features on an existing database:

```bash
# Run the migration
node scripts/run-migrations.js

# Or manually apply
psql $DATABASE_URL -f migrations/005_add_email_verification_tracking.sql
```

## Support

For issues or questions:
1. Check audit logs: `audit-logs.html`
2. View verification attempts for specific user
3. Test SMTP: `npm run test:smtp your-email@example.com`
4. Review documentation: `docs/EMAIL_VERIFICATION.md`

# Phase 1 Implementation Guide

**Status**: ✅ Implemented (Error Tracking & Email Queue)  
**Date**: 2025-11-19

## Overview

Phase 1 replaces external service dependencies with self-hosted solutions, specifically:

1. **Error Tracking** - Replaces Sentry with database-backed error logging
2. **Email Queue** - Replaces direct SMTP with reliable queued delivery
3. **OAuth Provider** - (Optional) Self-hosted OAuth server

## 1. Error Tracking System

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐
│  Client Browser │────▶│ error-logs API   │────▶│  error_logs   │
│  (JS errors)    │     │  (POST endpoint) │     │  (PostgreSQL) │
└─────────────────┘     └──────────────────┘     └───────────────┘
                                                           ▲
┌─────────────────┐     ┌──────────────────┐             │
│ Netlify         │────▶│ logServerError() │─────────────┘
│ Functions       │     │  (util function) │
└─────────────────┘     └──────────────────┘
```

### Database Schema

The error tracking system uses a single `error_logs` table:

```sql
CREATE TABLE error_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  level VARCHAR(20) NOT NULL,                    -- error, warning, info, critical
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_id INTEGER REFERENCES users(id),          -- Optional user context
  url TEXT,                                       -- Where error occurred
  user_agent TEXT,
  ip_address INET,
  environment VARCHAR(50),                        -- production, development, etc.
  metadata JSONB,                                 -- Additional context
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  occurrences INTEGER DEFAULT 1,                  -- Auto-incremented for duplicates
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  fingerprint VARCHAR(64) UNIQUE                  -- SHA256 hash for grouping
);
```

### Error Fingerprinting

Errors are automatically grouped using a fingerprint based on:
- Error name
- Error message
- URL path (normalized)

Example:
```javascript
const fingerprint = generateFingerprint(
  { message: "Cannot read property 'x' of undefined" },
  "https://example.com/products/123"
);
// Result: SHA256 hash of "Error:Cannot read property 'x' of undefined:/products/123"
```

### Client-Side Usage

Include the client-side error tracker in your HTML:

```html
<script src="/assets/js/client-error-tracker.js"></script>
```

The tracker automatically captures:
- Uncaught JavaScript errors
- Unhandled promise rejections

Manual error logging:

```javascript
// Log an error
window.ErrorTracker.logError('Something went wrong', {
  context: 'checkout',
  userId: 123
});

// Log a warning
window.ErrorTracker.logWarning('Deprecated feature used');

// Configure the tracker
window.ErrorTracker.configure({
  enabled: true,
  maxErrorsPerSession: 50,
  sampleRate: 1.0,  // Report 100% of errors
  ignoreErrors: ['ResizeObserver loop limit exceeded']
});
```

### Server-Side Usage

In Netlify Functions:

```javascript
const { logError, logServerError } = require('../../utils/error-tracker');

exports.handler = async (event) => {
  try {
    // Your function logic
  } catch (error) {
    // Log the error
    await logServerError(error, event, 'error');
    
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

Manual error logging:

```javascript
await logError({
  level: 'error',
  message: 'Database connection failed',
  stack: error.stack,
  userId: user.id,
  url: '/api/products',
  metadata: {
    query: 'SELECT * FROM products',
    connectionPool: 'exhausted'
  }
});
```

### API Endpoints

**POST /error-logs** - Log error (public)
```bash
curl -X POST https://your-site.com/.netlify/functions/error-logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "error",
    "message": "Failed to load product",
    "url": "/products/123",
    "metadata": {"productId": 123}
  }'
```

**GET /error-logs** - View errors (admin only)
```bash
curl https://your-site.com/.netlify/functions/error-logs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -G -d "resolved=false" -d "limit=50"
```

**GET /error-logs?stats=true** - Get statistics (admin only)
```bash
curl https://your-site.com/.netlify/functions/error-logs?stats=true \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**PUT /error-logs** - Resolve error (admin only)
```bash
curl -X PUT https://your-site.com/.netlify/functions/error-logs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 123, "resolved": true}'
```

### Error Resolution Workflow

1. Error occurs and is logged
2. Admin views unresolved errors in dashboard
3. Admin investigates error details
4. Admin marks error as resolved
5. Error is tracked in `resolved_by` and `resolved_at` fields

### Performance Considerations

- Errors are deduplicated using fingerprints
- Only unique errors create new records
- Duplicate errors increment `occurrences` counter
- Indexes on `fingerprint`, `timestamp`, `resolved`, and `level`
- Old resolved errors can be cleaned up periodically

### Cleanup

```javascript
const { cleanupOldErrors } = require('./utils/error-tracker');

// Delete errors resolved more than 90 days ago
const deleted = await cleanupOldErrors(90);
console.log(`Deleted ${deleted} old errors`);
```

---

## 2. Email Queue System

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Application    │────▶│ enqueueEmail()   │────▶│ email_queue  │
│  Code           │     │  (util function) │     │ (PostgreSQL) │
└─────────────────┘     └──────────────────┘     └──────────────┘
                                                           │
┌─────────────────┐     ┌──────────────────┐             │
│  Email Worker   │────▶│ getPendingEmails │◀────────────┘
│  (cron/watch)   │     │ sendEmail()      │
└─────────────────┘     └──────────────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │  SMTP Server     │
                        │  (Nodemailer)    │
                        └──────────────────┘
```

### Database Schema

**email_queue** - Queue for pending/sent emails:
```sql
CREATE TABLE email_queue (
  id SERIAL PRIMARY KEY,
  to_address VARCHAR(255) NOT NULL,
  from_address VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT,
  body_text TEXT,
  status VARCHAR(20) DEFAULT 'pending',          -- pending, sending, sent, failed, cancelled
  priority INTEGER DEFAULT 5,                     -- 1=highest, 10=lowest
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMP DEFAULT NOW(),          -- When to send
  sent_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**email_templates** - Reusable templates:
```sql
CREATE TABLE email_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB,                                -- Available variables
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Usage

**Enqueue a Custom Email:**

```javascript
const { enqueueEmail } = require('./utils/email-queue');

await enqueueEmail({
  to: 'user@example.com',
  subject: 'Welcome to Our Platform',
  html: '<h1>Welcome!</h1><p>Thanks for joining.</p>',
  text: 'Welcome! Thanks for joining.',
  priority: 3,  // High priority (1-10)
  scheduledFor: new Date('2025-12-01T09:00:00Z'),  // Optional
  metadata: { userId: 123 }
});
```

**Enqueue from Template:**

```javascript
const { enqueueTemplateEmail } = require('./utils/email-queue');

await enqueueTemplateEmail({
  templateName: 'password_reset',
  to: 'user@example.com',
  data: {
    name: 'John Doe',
    resetUrl: 'https://example.com/reset?token=abc123',
    siteName: 'Josh Burt Website'
  },
  priority: 3
});
```

**Using Feature Flag (Backwards Compatible):**

```javascript
// In .env:
// EMAIL_QUEUE_ENABLED=true

const { queueResetEmail } = require('./utils/email');

// Automatically uses queue if enabled, falls back to direct send if not
await queueResetEmail(email, name, resetUrl);
```

### Email Worker

The email worker processes the queue:

**One-time processing (for cron):**
```bash
npm run email:worker
```

**Continuous processing (for development):**
```bash
npm run email:worker:watch
```

**Custom configuration:**
```bash
# In .env:
EMAIL_WORKER_BATCH_SIZE=10           # Process 10 emails per batch
EMAIL_WORKER_POLL_INTERVAL=60000     # Check every 60 seconds
EMAIL_WORKER_MAX_TIME=300000         # Exit after 5 minutes (watch mode)
```

**Setting up as a cron job:**

```bash
# Edit crontab
crontab -e

# Add this line to run every minute
* * * * * cd /path/to/project && /usr/bin/node scripts/email-worker.js --cron >> /var/log/email-worker.log 2>&1
```

### Email Templates

Default templates included:
- `password_reset` - Password reset emails
- `email_verification` - Email verification emails

**Template Variables:**

Templates use `{{variable}}` syntax:

```html
<p>Hello {{name}},</p>
<p>Click here to verify: <a href="{{verificationUrl}}">Verify</a></p>
```

**Create Custom Template:**

```sql
INSERT INTO email_templates (name, subject, body_html, body_text, variables)
VALUES (
  'order_shipped',
  'Your Order {{orderNumber}} Has Shipped',
  '<p>Hi {{customerName}}, your order {{orderNumber}} has shipped!</p>',
  'Hi {{customerName}}, your order {{orderNumber}} has shipped!',
  '["customerName", "orderNumber", "trackingUrl"]'
);
```

### API Endpoints

**GET /email-queue** - View queue (admin only)
```bash
curl https://your-site.com/.netlify/functions/email-queue \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -G -d "status=pending" -d "limit=50"
```

**GET /email-queue?stats=true** - Queue statistics (admin only)
```bash
curl https://your-site.com/.netlify/functions/email-queue?stats=true \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**POST /email-queue** - Enqueue email (admin only)
```bash
curl -X POST https://your-site.com/.netlify/functions/email-queue \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Test Email",
    "html": "<p>Test</p>",
    "priority": 5
  }'
```

**POST /email-queue (process queue manually)** - Process queue (admin only)
```bash
curl -X POST https://your-site.com/.netlify/functions/email-queue \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "process"}'
```

**DELETE /email-queue** - Cancel email (admin only)
```bash
curl -X DELETE "https://your-site.com/.netlify/functions/email-queue?id=123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Retry Logic

The email queue includes automatic retry with exponential backoff:

1. Email fails to send
2. Status set to `failed`, `attempts` incremented
3. If `attempts < max_attempts`, status set back to `pending`
4. Worker will retry after next poll interval
5. If `attempts >= max_attempts`, status remains `failed`

### Priority Levels

- **1-2**: Critical (password resets, verification emails)
- **3-4**: High (order confirmations, urgent notifications)
- **5-6**: Normal (welcome emails, newsletters)
- **7-8**: Low (marketing emails, digests)
- **9-10**: Lowest (bulk emails, cleanup notifications)

### Performance Considerations

- Emails processed in batches (configurable batch size)
- Priority-based processing (highest priority first)
- Scheduled delivery support (future-dated emails)
- Database indexes on `status`, `priority`, `scheduled_for`
- Old emails can be cleaned up periodically

### Cleanup

```javascript
const { cleanupOldEmails } = require('./utils/email-queue');

// Delete emails sent/failed more than 30 days ago
const deleted = await cleanupOldEmails(30);
console.log(`Deleted ${deleted} old emails`);
```

---

## 3. OAuth Provider (Phase 1.3)

**Status**: Optional - Not implemented in this phase

Auth0 is currently used as an optional OAuth provider. The existing implementation supports:
- Auth0 OAuth login
- Automatic user provisioning
- Email-based user mapping

To implement a self-hosted OAuth server in the future:
1. Review OAuth 2.0 specification
2. Implement authorization code flow with PKCE
3. Create client management system
4. Migrate from Auth0 to self-hosted

---

## Migration Guide

### From Direct SMTP to Email Queue

**Before:**
```javascript
const { sendResetEmail } = require('./utils/email');
await sendResetEmail(email, name, resetUrl);
```

**After (with backwards compatibility):**
```javascript
// Option 1: Feature flag (recommended)
const { queueResetEmail } = require('./utils/email');
await queueResetEmail(email, name, resetUrl);

// Option 2: Direct queue usage
const { enqueueTemplateEmail } = require('./utils/email-queue');
await enqueueTemplateEmail({
  templateName: 'password_reset',
  to: email,
  data: { name, resetUrl, siteName: 'Josh Burt Website' }
});
```

### From Sentry to Self-Hosted Error Tracking

**Before:**
```javascript
const Sentry = require('@sentry/node');
Sentry.captureException(error);
```

**After:**
```javascript
const { logError, logServerError } = require('./utils/error-tracker');

// In Netlify Functions
await logServerError(error, event);

// Manual logging
await logError({
  level: 'error',
  message: error.message,
  stack: error.stack,
  metadata: { context: 'additional info' }
});
```

---

## Environment Variables

```env
# Error Tracking
ERROR_TRACKING_ENABLED=true

# Email Queue
EMAIL_QUEUE_ENABLED=false
EMAIL_WORKER_BATCH_SIZE=10
EMAIL_WORKER_POLL_INTERVAL=60000
EMAIL_WORKER_MAX_TIME=300000
```

---

## Monitoring & Maintenance

### Daily Tasks

1. Check error logs for unresolved errors
2. Review email queue status
3. Monitor failed emails

### Weekly Tasks

1. Analyze error patterns
2. Review email delivery metrics
3. Check worker performance

### Monthly Tasks

1. Clean up old resolved errors
2. Clean up old sent/failed emails
3. Review and optimize templates

---

## Troubleshooting

### Error Tracking

**Problem**: Errors not being logged
- Check ERROR_TRACKING_ENABLED environment variable
- Verify database migration was run
- Check network connectivity from client to API

**Problem**: Duplicate errors not being grouped
- Verify fingerprint generation logic
- Check that errors have consistent messages

### Email Queue

**Problem**: Emails stuck in pending status
- Check that email worker is running
- Verify SMTP credentials
- Check worker logs for errors

**Problem**: Emails failing repeatedly
- Check SMTP server status
- Verify email addresses are valid
- Review error messages in email_queue table

**Problem**: Worker not processing emails
- Verify EMAIL_WORKER_* environment variables
- Check that database connection is working
- Ensure no other worker instances are running

---

## Next Steps

- [ ] Create error monitoring dashboard UI
- [ ] Create email queue monitoring dashboard UI
- [ ] Integrate error tracking into all Netlify functions
- [ ] Refactor all email sends to use queue
- [ ] Add email delivery analytics
- [ ] Implement email bounce handling
- [ ] Add webhook support for email events

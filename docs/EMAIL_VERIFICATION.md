# Email Verification System

## Overview

The application includes a complete email verification system for user registration.

## Features

### 1. Registration with Email Verification

- New users receive a verification email upon registration
- Email contains a unique token valid for 24 hours
- Registration is complete but email must be verified for full access

### 2. Resend Verification Email

- Users can request a new verification email if needed
- Old tokens are invalidated when new ones are generated
- Security: Doesn't reveal if email exists in system

### 3. Email Verification

- Click link in email to verify
- Token-based verification with expiration
- Automatic cleanup of used tokens

## API Endpoints

### POST `/auth?action=resend-verification`

Resend verification email to a user.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response (Success):**

```json
{
  "message": "Verification email sent."
}
```

**Response (Already Verified):**

```json
{
  "error": "Email already verified"
}
```

### GET `/auth?action=verify-email&token=<token>`

Verify user's email address.

**Query Parameters:**

- `token` (required): Verification token from email

**Response (Success):**

```json
{
  "message": "Email verified"
}
```

**Response (Invalid/Expired):**

```json
{
  "error": "Invalid or expired verification token"
}
```

## Pages

### `/resend-verification.html`

- Simple form to request new verification email
- Enter email address
- Redirects to login after success
- Link available on login page

### `/verify-email.html`

- Automatically processes verification token from URL
- Shows loading/success/error states
- Links to resend verification if failed
- Redirects to login after success

## Email Template

The verification email includes:

- Personalized greeting with user's name
- Click button to verify
- Plain text link as fallback
- 24-hour expiration notice
- Professional HTML styling matching site branding

## User Flow

### New Registration

1. User fills out registration form
2. Account created with `email_verified = 0`
3. Verification email sent automatically
4. User receives email with verification link
5. Click link → redirected to `/verify-email.html?token=...`
6. Email verified → `email_verified = 1`
7. Can now log in

### Resend Verification

1. User goes to login page
2. Clicks "Resend Verification Email"
3. Enters email address
4. New verification email sent
5. Old token invalidated
6. Follow verification flow above

## Security Features

- **Token expiration**: 24 hours
- **One-time use**: Tokens cleared after verification
- **Privacy protection**: Doesn't reveal if email exists
- **Secure tokens**: 32-byte cryptographically random
- **Audit logging**: All verification attempts logged

## Testing

### Test Email Sending

```bash
npm run test:smtp your-email@example.com
```

### Test Flow

1. Register new account
2. Check email for verification link
3. Click link or manually go to verify-email.html with token
4. Verify success message
5. Test resend by requesting new email
6. Confirm old token no longer works

## Environment Variables

Required for email functionality:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
FROM_EMAIL=noreply@joshburt.com.au
FRONTEND_URL=https://joshburt.com.au
```

## Database Schema

Relevant `users` table columns:

```sql
email_verified INTEGER DEFAULT 0,
email_verification_token TEXT,
email_verification_expires INTEGER
```

## Audit Logging

Actions logged:

- `auth.register` - User registration
- `auth.verification_resent` - Verification email resent
- `auth.verify_email` - Email verified (if implemented)

## Error Handling

- Email sending failures don't prevent registration
- Clear error messages for expired tokens
- Graceful fallback for missing tokens
- User-friendly error states in UI

## Future Enhancements

- [ ] Add email verification requirement for login
- [ ] Email change verification
- [ ] Bulk email verification reminders
- [x] **Admin panel to manually verify emails** - Implemented
- [x] **Track verification attempts** - Implemented with detailed logging
- [ ] Rate limiting for resend requests

## Admin Features (NEW)

### Manual Email Verification

Admins can manually verify user emails from the user management page:

**Endpoint**: `POST /users/:id/verify-email`

**UI Features**:

- "Verify Email" button appears for unverified users
- Email verification status badge (✓ Verified / ⚠ Unverified)
- One-click verification with confirmation
- Automatic page refresh after verification

**Audit Trail**:

- Logs admin who performed manual verification
- Tracks in audit_logs table
- Records in email_verification_attempts table with type `admin_manual`

### Verification Attempts Tracking

All email verification attempts are logged with:

- User ID and email
- Attempt type (initial, resend, verify, admin_manual)
- Success/failure status
- IP address and user agent
- Error messages (if failed)
- Timestamp

**View Attempts**:

- "Verify Attempts" button in user management
- Shows chronological list of all attempts
- Color-coded by success/failure
- Displays IP, timestamp, and error details

**Database Table**: `email_verification_attempts`

**API Endpoint**: `GET /users/:id/verification-attempts`

Returns up to 50 most recent attempts for a user (admin only).

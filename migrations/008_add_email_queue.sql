-- Phase 1.2: Email Queue System (Replace External SMTP Reliance)
-- Migration to add email queue tables for reliable email delivery with retry logic

-- Email queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id SERIAL PRIMARY KEY,
  to_address VARCHAR(255) NOT NULL,
  from_address VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT,
  body_text TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1=highest, 10=lowest
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for email queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at DESC);

-- Composite index for worker queries
CREATE INDEX IF NOT EXISTS idx_email_queue_worker ON email_queue(status, priority, scheduled_for) 
  WHERE status IN ('pending', 'failed');

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB, -- List of available template variables e.g., ["name", "verificationUrl"]
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO email_templates (name, subject, body_html, body_text, variables, description) VALUES
(
  'password_reset',
  'Reset Your Password - {{siteName}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
      <h1>Password Reset</h1>
    </div>
    <div style="padding: 20px; background: #f9f9f9;">
      <p>Hello {{name}},</p>
      <p>We received a request to reset your password. Click the button below to reset it:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{resetUrl}}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      </div>
      <p>If you didn''t request this, you can safely ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    </div>
    <div style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
      <p>&copy; 2025 {{siteName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Hello {{name}},

We received a request to reset your password. Visit this link to reset it:

{{resetUrl}}

If you didn''t request this, you can safely ignore this email.

This link will expire in 1 hour.

© 2025 {{siteName}}. All rights reserved.',
  '["name", "resetUrl", "siteName"]',
  'Password reset email template'
),
(
  'email_verification',
  'Verify Your Email - {{siteName}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Verification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
      <h1>Verify Your Email</h1>
    </div>
    <div style="padding: 20px; background: #f9f9f9;">
      <p>Hello {{name}},</p>
      <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{verificationUrl}}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Verify Email</a>
      </div>
      <p>This link will expire in 24 hours.</p>
    </div>
    <div style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
      <p>&copy; 2025 {{siteName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Hello {{name}},

Thank you for registering. Please verify your email address by visiting:

{{verificationUrl}}

This link will expire in 24 hours.

© 2025 {{siteName}}. All rights reserved.',
  '["name", "verificationUrl", "siteName"]',
  'Email verification template'
)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE email_queue IS 'Database-backed email queue with retry logic - replaces direct SMTP';
COMMENT ON TABLE email_templates IS 'Reusable email templates with variable substitution';
COMMENT ON COLUMN email_queue.priority IS '1=highest priority, 10=lowest priority';
COMMENT ON COLUMN email_queue.status IS 'pending=not sent, sending=in progress, sent=delivered, failed=max retries exceeded';
COMMENT ON COLUMN email_templates.variables IS 'JSON array of template variable names for documentation';

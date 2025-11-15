-- Migration: Add email verification attempts tracking
-- Created: 2025-11-16
-- Description: Track email verification attempts for security and admin monitoring

-- Email verification attempts table
CREATE TABLE IF NOT EXISTS email_verification_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    attempt_type VARCHAR(50) NOT NULL, -- 'initial', 'resend', 'verify'
    token_used VARCHAR(255),
    success BOOLEAN DEFAULT false,
    ip_address VARCHAR(45),
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_attempts_user_id ON email_verification_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_email ON email_verification_attempts(email);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_created_at ON email_verification_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_success ON email_verification_attempts(success);

-- Add comments
COMMENT ON TABLE email_verification_attempts IS 'Tracks all email verification attempts for security monitoring';
COMMENT ON COLUMN email_verification_attempts.attempt_type IS 'Type of attempt: initial, resend, verify';
COMMENT ON COLUMN email_verification_attempts.success IS 'Whether the attempt was successful';

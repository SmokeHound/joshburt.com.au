-- Migration: Add push notification support (Phase 7.1)
-- Description: Adds push_subscriptions table for web push notifications
-- Created: 2025-11-20

-- Push subscriptions table for storing user's push notification endpoints
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = TRUE;

-- Comments for documentation
COMMENT ON TABLE push_subscriptions IS 'Stores user push notification subscriptions for web push';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Unique push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'Public key for message encryption (P-256 ECDH)';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Authentication secret for encryption';
COMMENT ON COLUMN push_subscriptions.user_agent IS 'Browser user agent at time of subscription';
COMMENT ON COLUMN push_subscriptions.last_used IS 'Last time this subscription received a notification';
COMMENT ON COLUMN push_subscriptions.is_active IS 'Whether subscription is still valid';

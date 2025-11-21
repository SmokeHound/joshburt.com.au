-- Migration 018: Add PWA Push Notifications Support
-- Phase 7: PWA & Offline Support
-- Created: 2025-11-21
--
-- This migration adds support for web push notifications as part of the PWA features.
-- It creates the push_subscriptions table to store user subscription data for the Web Push API.

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = TRUE;

-- Add comments for documentation
COMMENT ON TABLE push_subscriptions IS 'Stores user push notification subscriptions for web push (Phase 7)';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Unique push service endpoint URL provided by the browser';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'Public key for message encryption (P-256 ECDH)';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Authentication secret for message encryption';
COMMENT ON COLUMN push_subscriptions.user_agent IS 'Browser user agent at time of subscription for debugging';
COMMENT ON COLUMN push_subscriptions.last_used IS 'Last time this subscription received a notification';
COMMENT ON COLUMN push_subscriptions.is_active IS 'Whether subscription is still valid (false if endpoint returns 410 Gone)';

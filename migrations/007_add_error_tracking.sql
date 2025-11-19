-- Phase 1.1: Error Tracking System (Replace Sentry)
-- Migration to add error logging tables for self-hosted error tracking

-- Main error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  level VARCHAR(20) NOT NULL CHECK (level IN ('error', 'warning', 'info', 'critical')),
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  url TEXT,
  user_agent TEXT,
  ip_address INET,
  environment VARCHAR(50),
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  occurrences INTEGER DEFAULT 1,
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  fingerprint VARCHAR(64) UNIQUE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_fingerprint ON error_logs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_environment ON error_logs(environment);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_timestamp ON error_logs(resolved, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level_timestamp ON error_logs(level, timestamp DESC);

COMMENT ON TABLE error_logs IS 'Self-hosted error tracking system - replaces Sentry';
COMMENT ON COLUMN error_logs.fingerprint IS 'SHA256 hash of error signature for grouping similar errors';
COMMENT ON COLUMN error_logs.occurrences IS 'Number of times this error has occurred';
COMMENT ON COLUMN error_logs.metadata IS 'Additional context (request data, browser info, etc.)';

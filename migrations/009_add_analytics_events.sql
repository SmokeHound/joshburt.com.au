-- Phase 2.1: Advanced Analytics Dashboard
-- Migration to add analytics event tracking, session management, and daily stats

-- Analytics events table for tracking user interactions
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL, -- page_view, click, search, purchase, etc.
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(64) NOT NULL,
  page_url TEXT,
  referrer TEXT,
  properties JSONB, -- Custom event properties (e.g., product_id, search_query, etc.)
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics events
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_timestamp ON analytics_events(event_type, timestamp DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_timestamp ON analytics_events(session_id, timestamp DESC);

-- Analytics sessions table for session tracking
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  country VARCHAR(2), -- ISO country code
  started_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  page_views INTEGER DEFAULT 0,
  duration_seconds INTEGER, -- Calculated on session end
  entry_page TEXT, -- First page viewed
  exit_page TEXT -- Last page viewed
);

-- Indexes for analytics sessions
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started ON analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_last_activity ON analytics_sessions(last_activity DESC);

-- Materialized view for daily statistics (for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_stats AS
SELECT 
  DATE(timestamp) as date,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions
FROM analytics_events
GROUP BY DATE(timestamp), event_type
ORDER BY date DESC, event_type;

-- Index for materialized view
CREATE INDEX IF NOT EXISTS idx_analytics_daily_stats_date ON analytics_daily_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_stats_type ON analytics_daily_stats(event_type);

-- Function to refresh materialized view (can be called manually or on schedule)
CREATE OR REPLACE FUNCTION refresh_analytics_daily_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE analytics_events IS 'Event tracking for user interactions and analytics';
COMMENT ON TABLE analytics_sessions IS 'Session tracking for user visits';
COMMENT ON MATERIALIZED VIEW analytics_daily_stats IS 'Daily aggregated analytics statistics for performance';
COMMENT ON COLUMN analytics_events.properties IS 'JSONB field for custom event data (product_id, search_query, click_target, etc.)';
COMMENT ON COLUMN analytics_sessions.duration_seconds IS 'Session duration calculated as last_activity - started_at';

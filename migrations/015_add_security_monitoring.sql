-- Migration 015: Add security monitoring and advanced security features
-- Part of Phase 6: Security Enhancements
-- Date: 2025-11-20

-- Create table to track security events
CREATE TABLE IF NOT EXISTS security_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL, -- suspicious_login, brute_force, unauthorized_access, rate_limit_exceeded, etc.
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  user_id INTEGER REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  description TEXT,
  metadata JSONB, -- Additional context (e.g., failed login count, endpoint accessed, etc.)
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_security_events_type (event_type),
  INDEX idx_security_events_severity (severity),
  INDEX idx_security_events_timestamp (timestamp),
  INDEX idx_security_events_resolved (resolved),
  INDEX idx_security_events_ip (ip_address)
);

-- Create IP blacklist table for blocking malicious IPs
CREATE TABLE IF NOT EXISTS ip_blacklist (
  id SERIAL PRIMARY KEY,
  ip_address INET UNIQUE NOT NULL,
  reason TEXT,
  added_by INTEGER REFERENCES users(id),
  added_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- NULL means permanent
  is_active BOOLEAN DEFAULT TRUE,
  auto_added BOOLEAN DEFAULT FALSE, -- TRUE if added by automated system
  INDEX idx_ip_blacklist_ip (ip_address),
  INDEX idx_ip_blacklist_active (is_active),
  INDEX idx_ip_blacklist_expires (expires_at)
);

-- Create database-backed rate limiting table for persistent rate limiting
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL, -- IP address or user_id
  endpoint VARCHAR(255) NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  last_request TIMESTAMP DEFAULT NOW(),
  INDEX idx_api_rate_limits_identifier (identifier),
  INDEX idx_api_rate_limits_endpoint (endpoint),
  INDEX idx_api_rate_limits_window (window_start),
  UNIQUE(identifier, endpoint, window_start)
);

-- Create function to check if IP is blacklisted
CREATE OR REPLACE FUNCTION is_ip_blacklisted(check_ip INET)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ip_blacklist
    WHERE ip_address = check_ip
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to log security event
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type VARCHAR,
  p_severity VARCHAR,
  p_user_id INTEGER,
  p_ip_address INET,
  p_user_agent TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS INTEGER AS $$
DECLARE
  event_id INTEGER;
BEGIN
  INSERT INTO security_events (
    event_type,
    severity,
    user_id,
    ip_address,
    user_agent,
    description,
    metadata
  ) VALUES (
    p_event_type,
    p_severity,
    p_user_id,
    p_ip_address,
    p_user_agent,
    p_description,
    p_metadata
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-blacklist IP after threshold of security events
CREATE OR REPLACE FUNCTION auto_blacklist_check()
RETURNS TRIGGER AS $$
DECLARE
  event_count INTEGER;
  threshold INTEGER := 10; -- Blacklist after 10 critical/high events in 1 hour
BEGIN
  -- Only check for high/critical severity events
  IF NEW.severity IN ('high', 'critical') THEN
    -- Count recent events from same IP
    SELECT COUNT(*) INTO event_count
    FROM security_events
    WHERE ip_address = NEW.ip_address
    AND severity IN ('high', 'critical')
    AND timestamp > NOW() - INTERVAL '1 hour';
    
    -- Auto-blacklist if threshold exceeded
    IF event_count >= threshold THEN
      INSERT INTO ip_blacklist (
        ip_address,
        reason,
        added_by,
        expires_at,
        is_active,
        auto_added
      ) VALUES (
        NEW.ip_address,
        'Automatically blacklisted after ' || event_count || ' security events',
        NULL,
        NOW() + INTERVAL '24 hours', -- Auto-expire after 24 hours
        TRUE,
        TRUE
      )
      ON CONFLICT (ip_address) DO NOTHING; -- Don't duplicate if already blacklisted
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-blacklisting
CREATE TRIGGER trigger_auto_blacklist
  AFTER INSERT ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION auto_blacklist_check();

-- Create function to clean up old rate limit entries
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM api_rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create function to expire old blacklist entries
CREATE OR REPLACE FUNCTION expire_blacklist_entries()
RETURNS void AS $$
BEGIN
  UPDATE ip_blacklist
  SET is_active = FALSE
  WHERE is_active = TRUE
  AND expires_at IS NOT NULL
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for security statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS security_stats AS
SELECT 
  DATE(timestamp) as event_date,
  event_type,
  severity,
  COUNT(*) as event_count,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE resolved = TRUE) as resolved_count,
  COUNT(*) FILTER (WHERE resolved = FALSE) as unresolved_count
FROM security_events
GROUP BY DATE(timestamp), event_type, severity;

CREATE INDEX idx_security_stats_date ON security_stats(event_date);
CREATE INDEX idx_security_stats_type ON security_stats(event_type);
CREATE INDEX idx_security_stats_severity ON security_stats(severity);

-- Function to refresh security stats
CREATE OR REPLACE FUNCTION refresh_security_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY security_stats;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE security_events IS 'Tracks security-related events for monitoring and incident response';
COMMENT ON COLUMN security_events.event_type IS 'Type of security event (e.g., suspicious_login, brute_force)';
COMMENT ON COLUMN security_events.severity IS 'Event severity: low, medium, high, critical';
COMMENT ON COLUMN security_events.metadata IS 'Additional context about the event in JSON format';
COMMENT ON TABLE ip_blacklist IS 'IP addresses that are blocked from accessing the application';
COMMENT ON COLUMN ip_blacklist.auto_added IS 'TRUE if automatically added by security system';
COMMENT ON TABLE api_rate_limits IS 'Database-backed rate limiting for persistent tracking across function invocations';
COMMENT ON FUNCTION is_ip_blacklisted(INET) IS 'Check if an IP address is currently blacklisted';
COMMENT ON FUNCTION log_security_event(VARCHAR, VARCHAR, INTEGER, INET, TEXT, TEXT, JSONB) IS 'Log a security event and return the event ID';

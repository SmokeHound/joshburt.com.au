-- Migration 016: Add API key management
-- Part of Phase 6: Security Enhancements
-- Date: 2025-11-20

-- Create table for API keys
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  key_hash VARCHAR(255) UNIQUE NOT NULL, -- SHA-256 hash of the API key
  key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for identification (e.g., "sk_live_12345678")
  name VARCHAR(255) NOT NULL, -- Human-readable name for the key
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permissions TEXT[], -- Array of allowed actions/endpoints (e.g., ['products:read', 'orders:write'])
  rate_limit INTEGER DEFAULT 100, -- Requests per minute
  expires_at TIMESTAMP, -- NULL means no expiration
  last_used TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB, -- Additional metadata (e.g., IP restrictions, allowed origins)
  INDEX idx_api_keys_hash (key_hash),
  INDEX idx_api_keys_user (user_id),
  INDEX idx_api_keys_active (is_active),
  INDEX idx_api_keys_prefix (key_prefix)
);

-- Create table to track API key usage
CREATE TABLE IF NOT EXISTS api_key_usage (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  response_status INTEGER,
  response_time_ms INTEGER, -- Response time in milliseconds
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_api_key_usage_key (api_key_id),
  INDEX idx_api_key_usage_timestamp (timestamp),
  INDEX idx_api_key_usage_endpoint (endpoint)
);

-- Create materialized view for API key statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS api_key_stats AS
SELECT 
  k.id as api_key_id,
  k.name as key_name,
  k.key_prefix,
  COUNT(u.id) as total_requests,
  COUNT(DISTINCT DATE(u.timestamp)) as active_days,
  COUNT(*) FILTER (WHERE u.response_status < 400) as successful_requests,
  COUNT(*) FILTER (WHERE u.response_status >= 400) as failed_requests,
  AVG(u.response_time_ms) as avg_response_time,
  MAX(u.timestamp) as last_used,
  COUNT(DISTINCT u.endpoint) as unique_endpoints,
  COUNT(DISTINCT u.ip_address) as unique_ips
FROM api_keys k
LEFT JOIN api_key_usage u ON k.id = u.api_key_id
WHERE k.is_active = TRUE
GROUP BY k.id, k.name, k.key_prefix;

CREATE INDEX idx_api_key_stats_key_id ON api_key_stats(api_key_id);

-- Function to validate API key permissions
CREATE OR REPLACE FUNCTION has_api_permission(
  p_key_hash VARCHAR,
  p_required_permission VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  key_permissions TEXT[];
BEGIN
  -- Get permissions for the key
  SELECT permissions INTO key_permissions
  FROM api_keys
  WHERE key_hash = p_key_hash
  AND is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW());
  
  -- If no key found, deny
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- If key has wildcard permission, allow
  IF '*' = ANY(key_permissions) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if specific permission exists
  IF p_required_permission = ANY(key_permissions) THEN
    RETURN TRUE;
  END IF;
  
  -- Check for wildcard in resource (e.g., 'products:*' allows 'products:read')
  IF position(':' IN p_required_permission) > 0 THEN
    DECLARE
      resource VARCHAR;
      wildcard_permission VARCHAR;
    BEGIN
      resource := split_part(p_required_permission, ':', 1);
      wildcard_permission := resource || ':*';
      IF wildcard_permission = ANY(key_permissions) THEN
        RETURN TRUE;
      END IF;
    END;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to log API key usage
CREATE OR REPLACE FUNCTION log_api_key_usage(
  p_key_hash VARCHAR,
  p_endpoint VARCHAR,
  p_method VARCHAR,
  p_ip_address INET,
  p_user_agent TEXT,
  p_response_status INTEGER,
  p_response_time_ms INTEGER
)
RETURNS void AS $$
DECLARE
  key_id INTEGER;
BEGIN
  -- Get API key ID
  SELECT id INTO key_id
  FROM api_keys
  WHERE key_hash = p_key_hash;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Insert usage record
  INSERT INTO api_key_usage (
    api_key_id,
    endpoint,
    method,
    ip_address,
    user_agent,
    response_status,
    response_time_ms
  ) VALUES (
    key_id,
    p_endpoint,
    p_method,
    p_ip_address,
    p_user_agent,
    p_response_status,
    p_response_time_ms
  );
  
  -- Update last_used timestamp on api_keys
  UPDATE api_keys
  SET last_used = NOW()
  WHERE id = key_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old API key usage records
CREATE OR REPLACE FUNCTION cleanup_api_key_usage()
RETURNS void AS $$
BEGIN
  -- Delete usage records older than 90 days
  DELETE FROM api_key_usage
  WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to expire old API keys
CREATE OR REPLACE FUNCTION expire_api_keys()
RETURNS void AS $$
BEGIN
  UPDATE api_keys
  SET is_active = FALSE
  WHERE is_active = TRUE
  AND expires_at IS NOT NULL
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to refresh API key stats
CREATE OR REPLACE FUNCTION refresh_api_key_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY api_key_stats;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE api_keys IS 'Stores API keys for programmatic access to the application';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the actual API key (never store keys in plain text)';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters of the key for user identification';
COMMENT ON COLUMN api_keys.permissions IS 'Array of permissions in format resource:action (e.g., products:read, orders:write)';
COMMENT ON COLUMN api_keys.rate_limit IS 'Maximum requests per minute for this key';
COMMENT ON COLUMN api_keys.metadata IS 'Additional restrictions (e.g., {"allowed_ips": ["192.168.1.1"], "allowed_origins": ["https://example.com"]})';

COMMENT ON TABLE api_key_usage IS 'Tracks API key usage for analytics and rate limiting';
COMMENT ON COLUMN api_key_usage.response_time_ms IS 'API response time in milliseconds';

COMMENT ON FUNCTION has_api_permission(VARCHAR, VARCHAR) IS 'Check if an API key has a specific permission';
COMMENT ON FUNCTION log_api_key_usage(VARCHAR, VARCHAR, VARCHAR, INET, TEXT, INTEGER, INTEGER) IS 'Log API key usage for analytics';
COMMENT ON FUNCTION cleanup_api_key_usage() IS 'Delete old API key usage records (90+ days)';
COMMENT ON FUNCTION expire_api_keys() IS 'Mark expired API keys as inactive';

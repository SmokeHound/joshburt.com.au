-- 019_add_cache_stats.sql
-- Adds a small aggregate table to track cache activity across serverless function instances.

CREATE TABLE IF NOT EXISTS cache_stats (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  hits BIGINT NOT NULL DEFAULT 0,
  misses BIGINT NOT NULL DEFAULT 0,
  sets BIGINT NOT NULL DEFAULT 0,
  deletes BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure singleton row exists
INSERT INTO cache_stats (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Migration 011: Add Full-Text Search Support
-- Phase 3.1 of UPGRADE_PLAN.md
-- Description: Adds PostgreSQL full-text search capabilities across products, consumables, filters, and users

-- =====================================================
-- STEP 1: Add search_vector columns to existing tables
-- =====================================================

-- Add search vector to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search vector to consumables
ALTER TABLE consumables ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search vector to filters
ALTER TABLE filters ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search vector to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- =====================================================
-- STEP 2: Create trigger functions to maintain search vectors
-- =====================================================

-- Function to update product search vector
CREATE OR REPLACE FUNCTION update_product_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.code, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.specs, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update consumable search vector
CREATE OR REPLACE FUNCTION update_consumable_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.code, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.type, '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update filter search vector
CREATE OR REPLACE FUNCTION update_filter_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.code, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.type, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user search vector
CREATE OR REPLACE FUNCTION update_user_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.role, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: Create triggers on tables
-- =====================================================

-- Trigger for products
DROP TRIGGER IF EXISTS product_search_vector_update ON products;
CREATE TRIGGER product_search_vector_update 
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Trigger for consumables
DROP TRIGGER IF EXISTS consumable_search_vector_update ON consumables;
CREATE TRIGGER consumable_search_vector_update 
  BEFORE INSERT OR UPDATE ON consumables
  FOR EACH ROW EXECUTE FUNCTION update_consumable_search_vector();

-- Trigger for filters
DROP TRIGGER IF EXISTS filter_search_vector_update ON filters;
CREATE TRIGGER filter_search_vector_update 
  BEFORE INSERT OR UPDATE ON filters
  FOR EACH ROW EXECUTE FUNCTION update_filter_search_vector();

-- Trigger for users
DROP TRIGGER IF EXISTS user_search_vector_update ON users;
CREATE TRIGGER user_search_vector_update 
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_user_search_vector();

-- =====================================================
-- STEP 4: Create GIN indexes for fast full-text search
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_consumables_search_vector ON consumables USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_filters_search_vector ON filters USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_users_search_vector ON users USING GIN(search_vector);

-- =====================================================
-- STEP 5: Populate search vectors for existing data
-- =====================================================

-- Update existing products
UPDATE products SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(code, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(specs, '')), 'D');

-- Update existing consumables
UPDATE consumables SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(code, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(type, '')), 'D') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'D');

-- Update existing filters
UPDATE filters SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(code, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(type, '')), 'D');

-- Update existing users
UPDATE users SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(role, '')), 'C');

-- =====================================================
-- STEP 6: Create search_queries table for tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS search_queries (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  results_count INTEGER DEFAULT 0,
  clicked_result_id INTEGER,
  clicked_result_type VARCHAR(50), -- 'product', 'consumable', 'filter', 'user'
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for search queries
CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries(query);
CREATE INDEX IF NOT EXISTS idx_search_queries_timestamp ON search_queries(timestamp);
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON search_queries(user_id);

-- =====================================================
-- STEP 7: Create view for popular searches
-- =====================================================

CREATE OR REPLACE VIEW popular_searches AS
SELECT 
  query,
  COUNT(*) as search_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(results_count) as avg_results,
  MAX(timestamp) as last_searched
FROM search_queries
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY query
ORDER BY search_count DESC
LIMIT 100;

-- =====================================================
-- Migration complete
-- =====================================================

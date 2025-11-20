-- Migration 017: Add Business Intelligence Tables (Phase 8)
-- Created: 2025-11-20
-- Description: Adds tables for inventory forecasting and customer insights

-- Inventory Forecasts Table
CREATE TABLE IF NOT EXISTS inventory_forecasts (
  id SERIAL PRIMARY KEY,
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('product', 'consumable', 'filter')),
  item_id INTEGER NOT NULL,
  forecast_date DATE NOT NULL,
  predicted_demand INTEGER,
  confidence_level DECIMAL(3,2) CHECK (confidence_level >= 0.00 AND confidence_level <= 1.00),
  factors JSONB, -- What influenced the forecast (seasonality, trends, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_type, item_id, forecast_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_item ON inventory_forecasts(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_date ON inventory_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_confidence ON inventory_forecasts(confidence_level);

-- Customer Purchase Patterns (for insights)
CREATE TABLE IF NOT EXISTS customer_purchase_patterns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL,
  item_id INTEGER NOT NULL,
  purchase_count INTEGER DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  avg_order_value DECIMAL(10,2),
  last_purchase_date TIMESTAMP,
  first_purchase_date TIMESTAMP,
  purchase_frequency_days INTEGER, -- Average days between purchases
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, item_type, item_id)
);

-- Indexes for customer patterns
CREATE INDEX IF NOT EXISTS idx_customer_patterns_user ON customer_purchase_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_patterns_item ON customer_purchase_patterns(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_customer_patterns_frequency ON customer_purchase_patterns(purchase_frequency_days);

-- Product Affinity (items frequently bought together)
CREATE TABLE IF NOT EXISTS product_affinity (
  id SERIAL PRIMARY KEY,
  item_a_type VARCHAR(50) NOT NULL,
  item_a_id INTEGER NOT NULL,
  item_b_type VARCHAR(50) NOT NULL,
  item_b_id INTEGER NOT NULL,
  co_occurrence_count INTEGER DEFAULT 0,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_a_type, item_a_id, item_b_type, item_b_id)
);

-- Indexes for affinity
CREATE INDEX IF NOT EXISTS idx_product_affinity_item_a ON product_affinity(item_a_type, item_a_id);
CREATE INDEX IF NOT EXISTS idx_product_affinity_score ON product_affinity(confidence_score DESC);

-- Comment for documentation
COMMENT ON TABLE inventory_forecasts IS 'Stores demand predictions for inventory items based on historical data and trends';
COMMENT ON TABLE customer_purchase_patterns IS 'Tracks customer purchase behavior for insights and recommendations';
COMMENT ON TABLE product_affinity IS 'Stores relationships between products frequently purchased together';

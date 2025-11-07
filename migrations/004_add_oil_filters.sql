-- Migration: Add oil filters table
-- Feature: Oil filters ordering and management system

-- Create oil_filters table
CREATE TABLE IF NOT EXISTS oil_filters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'Engine Oil Filter', 'Transmission Filter', 'Fuel Filter', etc.
    description TEXT,
    model_qty INTEGER DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_oil_filters_type ON oil_filters(type);
CREATE INDEX IF NOT EXISTS idx_oil_filters_is_active ON oil_filters(is_active);
CREATE INDEX IF NOT EXISTS idx_oil_filters_code ON oil_filters(code);

-- Add full-text search capability (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS idx_oil_filters_search ON oil_filters USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || code));

-- Add update trigger for oil_filters
DROP TRIGGER IF EXISTS update_oil_filters_updated_at ON oil_filters;
CREATE TRIGGER update_oil_filters_updated_at
BEFORE UPDATE ON oil_filters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert sample oil filters data
INSERT INTO oil_filters (name, code, type, description, model_qty, stock_quantity, reorder_point) VALUES
('Standard Oil Filter', 'OF-001', 'Engine Oil Filter', 'Universal oil filter for most passenger vehicles', 0, 50, 20),
('Heavy Duty Oil Filter', 'OF-002', 'Engine Oil Filter', 'Heavy duty oil filter for trucks and commercial vehicles', 0, 30, 15),
('Premium Synthetic Filter', 'OF-003', 'Engine Oil Filter', 'Premium oil filter for synthetic oils', 0, 40, 18),
('Transmission Filter Kit', 'TF-001', 'Transmission Filter', 'Complete transmission filter kit with gasket', 0, 25, 10),
('Fuel Filter - Diesel', 'FF-001', 'Fuel Filter', 'Diesel fuel filter with water separator', 0, 35, 12),
('Fuel Filter - Petrol', 'FF-002', 'Fuel Filter', 'In-line fuel filter for petrol engines', 0, 45, 15),
('Cabin Air Filter', 'CF-001', 'Air Filter', 'Cabin air filter for passenger compartment', 0, 60, 25),
('Engine Air Filter', 'AF-001', 'Air Filter', 'High-flow engine air filter', 0, 55, 20)
ON CONFLICT (code) DO NOTHING;

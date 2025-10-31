-- Migration: Add product categories
-- Week 11-12: Product Enhancements

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add category_id to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL;

-- Add price and stock columns for filtering
ALTER TABLE products ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create product_variants table for size/color options
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    variant_type VARCHAR(50) NOT NULL, -- 'size', 'color', etc.
    variant_value VARCHAR(100) NOT NULL,
    price_modifier DECIMAL(10,2) DEFAULT 0.00,
    stock_quantity INTEGER DEFAULT 0,
    sku VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, variant_type, variant_value)
);

-- Create product_images table for multiple images
CREATE TABLE IF NOT EXISTS product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories for automotive products
INSERT INTO product_categories (name, description, display_order) VALUES
('Engine Oil', 'High-performance engine oils for all vehicle types', 1),
('Coolant', 'Engine cooling system fluids and additives', 2),
('Brake Fluid', 'Hydraulic brake and clutch fluids', 3),
('Gear Oil', 'Transmission and differential lubricants', 4),
('Specialty Fluids', 'Power steering, hydraulic and other specialty fluids', 5)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- Add full-text search capability (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(specs, '')));

-- Add update trigger for product_categories
CREATE TRIGGER update_product_categories_updated_at 
BEFORE UPDATE ON product_categories 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Add update trigger for product_variants
CREATE TRIGGER update_product_variants_updated_at 
BEFORE UPDATE ON product_variants 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Update existing products with category based on type
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE name = 'Engine Oil') WHERE type = 'Engine Oil' AND category_id IS NULL;
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE name = 'Coolant') WHERE type = 'Coolant' AND category_id IS NULL;
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE name = 'Brake Fluid') WHERE type = 'Brake Fluid' AND category_id IS NULL;
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE name = 'Gear Oil') WHERE type = 'Gear Oil' AND category_id IS NULL;

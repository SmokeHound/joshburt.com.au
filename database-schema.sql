-- Database Schema for joshburt.com.au Neon DB
-- Run this SQL in your Neon DB console to create the required tables

-- Products table for Castrol oil products
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    specs TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table to store customer orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_email VARCHAR(255) DEFAULT 'anonymous@example.com',
    total_items INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table to store individual products in each order
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table for authentication (future enhancement)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample Castrol products
INSERT INTO products (name, code, type, specs, description) VALUES
-- Engine Oil products
('Castrol GTX', 'GTX-15W40-5L', 'Engine oil', '15W-40 Semi Synthetic', 'Premium protection for your engine'),
('Castrol Magnatec', 'MAG-5W30-4L', 'Engine oil', '5W-30 Full Synthetic', 'Intelligent molecules that cling to your engine'),
('Castrol EDGE', 'EDGE-0W20-1L', 'Engine oil', '0W-20 Titanium Technology', 'Unlocks true engine performance'),
('Castrol GTX Diesel', 'GTX-D-15W40-20L', 'Engine oil', '15W-40 Diesel Formula', 'Specialized protection for diesel engines'),
('Castrol Actevo', 'ACT-10W40-1L', 'Engine oil', '10W-40 4T Motorcycle', 'Advanced protection for motorcycles'),

-- Coolant products  
('Castrol Radicool SF', 'RAD-SF-1L', 'Coolant', 'Silicate Free Formula', 'Long-life coolant for modern engines'),
('Castrol Radicool NF', 'RAD-NF-20L', 'Coolant', 'Nitrite Free Formula', 'Heavy duty coolant protection'),

-- Gear Oil products
('Castrol EPX', 'EPX-80W90-1L', 'Gear Oil', '80W-90 GL-5', 'Superior gear protection'),
('Castrol Syntrax', 'SYN-75W90-1L', 'Gear Oil', '75W-90 Synthetic', 'Advanced synthetic gear oil')

ON CONFLICT (code) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
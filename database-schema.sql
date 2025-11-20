-- Audit Logs Table for admin and API actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Products table for automotive products
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    specs TEXT,
    description TEXT,
    image TEXT,
    model_qty INTEGER DEFAULT 0,
    soh INTEGER DEFAULT 0,
    -- product category/stock flags (added by migrations/001)
    category_id INTEGER,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product categories, variants and images (from migrations/001_add_product_categories.sql)
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

CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    variant_type VARCHAR(50) NOT NULL,
    variant_value VARCHAR(100) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    sku VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, variant_type, variant_value)
);

CREATE TABLE IF NOT EXISTS product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search index for products (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(specs, '')));

-- Consumables table for workshop consumables
CREATE TABLE IF NOT EXISTS consumables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    model_qty INTEGER DEFAULT 0,
    soh INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    created_by VARCHAR(255) DEFAULT 'mechanic',
    total_items INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'normal',
    tracking_number VARCHAR(100) UNIQUE,
    status_updated_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    estimated_delivery TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order status history (migrations/002_add_order_status_tracking.sql)
CREATE TABLE IF NOT EXISTS order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);

-- Notifications system (migrations/003_add_notification_system.sql)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50),
    related_entity_id INTEGER,
    action_url TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    priority VARCHAR(20) DEFAULT 'normal',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    email_order_status BOOLEAN DEFAULT true,
    email_system_announcements BOOLEAN DEFAULT true,
    email_product_updates BOOLEAN DEFAULT false,
    in_app_order_status BOOLEAN DEFAULT true,
    in_app_system_announcements BOOLEAN DEFAULT true,
    in_app_product_updates BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Trigger for preferences
CREATE TRIGGER update_notification_preferences_updated_at 
BEFORE UPDATE ON notification_preferences 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Create default notification preferences for existing users (idempotent)
INSERT INTO notification_preferences (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM notification_preferences);

-- Inventory table to track stock for products and consumables
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('product', 'consumable')),
    item_id INTEGER NOT NULL,
    stock_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(item_type, item_id)
);

-- Users table for authentication (future enhancement)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    -- role constraint kept in runtime schema migrations/DB code; ensure application enforces valid roles
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verification_expires BIGINT,
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    avatar_url TEXT,
    reset_token VARCHAR(255),
    reset_token_expires BIGINT,
    failed_login_attempts INTEGER DEFAULT 0,
    lockout_expires BIGINT,
    totp_secret VARCHAR(255),
    totp_enabled BOOLEAN DEFAULT false,
    backup_codes TEXT,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table (for JWT/session refresh)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Login attempts table (for rate limiting / security)
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email verification attempts table (migrations/005_add_email_verification_tracking.sql)
CREATE TABLE IF NOT EXISTS email_verification_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    attempt_type VARCHAR(50) NOT NULL,
    token_used VARCHAR(255),
    success BOOLEAN DEFAULT false,
    ip_address VARCHAR(45),
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_attempts_user_id ON email_verification_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_email ON email_verification_attempts(email);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_created_at ON email_verification_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_success ON email_verification_attempts(success);

-- Settings table (enhanced structure with key-value pairs)
-- Migrated in migrations/006_upgrade_settings_table.sql
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    category VARCHAR(100) DEFAULT 'general', -- 'general', 'theme', 'security', 'integrations', 'features'
    data_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json', 'array'
    is_sensitive BOOLEAN DEFAULT false, -- For passwords, tokens, etc.
    description TEXT,
    default_value TEXT,
    validation_rules JSONB, -- Store validation constraints
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for settings table
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);

-- Backward compatibility view for legacy JSON format
CREATE OR REPLACE VIEW settings_json_view AS
SELECT 
    1 as id,
    jsonb_object_agg(key, 
        CASE 
            WHEN data_type = 'boolean' THEN to_jsonb((value = 'true'))
            WHEN data_type = 'number' THEN to_jsonb(value::numeric)
            WHEN data_type = 'json' THEN value::jsonb
            ELSE to_jsonb(value)
        END
    ) as data,
    MAX(updated_at) as updated_at
FROM settings;

-- Filters table (product/filter catalog) added in migrations/004_add_filters.sql
CREATE TABLE IF NOT EXISTS filters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'Oil Filter', 'Air Filter', 'Fuel Filter', etc.
    description TEXT,
    model_qty INTEGER DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_filters_type ON filters(type);
CREATE INDEX IF NOT EXISTS idx_filters_is_active ON filters(is_active);
CREATE INDEX IF NOT EXISTS idx_filters_code ON filters(code);

-- Full-text search for filters (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS idx_filters_search ON filters USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || code));

-- Add update trigger for filters
DROP TRIGGER IF EXISTS update_filters_updated_at ON filters;
CREATE TRIGGER update_filters_updated_at
BEFORE UPDATE ON filters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Supplier Returns table for tracking parts returned to suppliers for credit
CREATE TABLE IF NOT EXISTS supplier_returns (
    id SERIAL PRIMARY KEY,
    return_date DATE NOT NULL,
    inv_number VARCHAR(100),
    supplier VARCHAR(255) NOT NULL,
    part_code VARCHAR(100) NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_value DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    return_reason VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_shipment',
    tracking_number VARCHAR(100),
    notes TEXT,
    credit_date DATE,
    credit_number VARCHAR(100),
    credit_amount DECIMAL(10, 2),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('pending_shipment', 'in_transit', 'received_by_supplier', 'under_review', 'approved', 'credited', 'rejected')),
    CONSTRAINT valid_reason CHECK (return_reason IN ('defective', 'wrong_part', 'warranty', 'excess_stock', 'customer_return', 'other')),
    CONSTRAINT credit_required_when_credited CHECK (
        (status = 'credited' AND credit_date IS NOT NULL AND credit_amount IS NOT NULL) OR
        (status != 'credited')
    )
);

-- Indexes for supplier_returns
CREATE INDEX IF NOT EXISTS idx_supplier_returns_status ON supplier_returns(status);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_supplier ON supplier_returns(supplier);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_return_date ON supplier_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_part_code ON supplier_returns(part_code);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_created_by ON supplier_returns(created_by);

-- Add update trigger for supplier_returns
DROP TRIGGER IF EXISTS update_supplier_returns_updated_at ON supplier_returns;
CREATE TRIGGER update_supplier_returns_updated_at
BEFORE UPDATE ON supplier_returns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Seed sample filters (will not duplicate due to ON CONFLICT)
INSERT INTO filters (name, code, type, description, model_qty, stock_quantity, reorder_point) VALUES
('Standard Oil Filter', 'OF-001', 'Oil Filter', 'Universal oil filter for most passenger vehicles', 0, 50, 20),
('Heavy Duty Oil Filter', 'OF-002', 'Oil Filter', 'Heavy duty oil filter for trucks and commercial vehicles', 0, 30, 15),
('Premium Synthetic Filter', 'OF-003', 'Oil Filter', 'Premium oil filter for synthetic oils', 0, 40, 18),
('Transmission Filter Kit', 'TF-001', 'Transmission Filter', 'Complete transmission filter kit with gasket', 0, 25, 10),
('Fuel Filter - Diesel', 'FF-001', 'Fuel Filter', 'Diesel fuel filter with water separator', 0, 35, 12),
('Fuel Filter - Petrol', 'FF-002', 'Fuel Filter', 'In-line fuel filter for petrol engines', 0, 45, 15),
('Cabin Air Filter', 'CF-001', 'Air Filter', 'Cabin air filter for passenger compartment', 0, 60, 25),
('Engine Air Filter', 'AF-001', 'Air Filter', 'High-flow engine air filter', 0, 55, 20)
ON CONFLICT (code) DO NOTHING;

-- Insert sample Castrol products (with ON CONFLICT inside INSERT for PostgreSQL)
INSERT INTO products (name, code, type, specs, description, image) VALUES
-- Engine Oil products
('EDGE 0W-20', '3437297', 'Engine Oil', 'API SP, ILSAC GF-6', 'Fully synthetic engine oil meeting API SP and ILSAC GF-6 standards.', ''),
('EDGE 0W-20 C5', '3425218', 'Engine Oil', 'ACEA C5, ACEA C6, API SQ, ILSAC GF-7, STJLR.03.5006, Chrysler MS 6395, GM dexos1™ Gen 3, MB-Approval 229.71, Fiat 9.55535-CR1, Fiat 9.55535-GSX, Ford WSS-M2C947-A, Ford WSS-M2C947-B1, Ford WSS-M2C962-A1', 'Advanced synthetic oil compatible with ACEA C5/C6 and multiple OEM approvals including Ford, GM, MB, Fiat, and Jaguar Land Rover.', ''),
('EDGE 0W-20 LL IV', '3433822', 'Engine Oil', 'ACEA C5, ACEA C6, BMW Longlife-17FE+, MB-Approval 229.71/229.72, Porsche C20, VW 508 00/509 00, Ford WSS-M2C956-A1', 'Low-viscosity long-life oil approved for VW 508/509, BMW LL-17FE+, and Porsche C20.', ''),
('EDGE 0W-30 C2', '3436896', 'Engine Oil', 'ACEA C2, STJLR.03.5007', 'Synthetic oil for Jaguar Land Rover engines requiring ACEA C2 and STJLR.03.5007.', ''),
('EDGE 0W-30', '3432554', 'Engine Oil', 'ACEA C2/C3, API SQ, BMW Longlife-04, BMW Longlife-19 FE, MB-Approval 226.5/229.31/229.51, Renault RN0700/RN0710', 'Versatile synthetic oil for Euro vehicles including BMW, MB, and Renault.', ''),
('EDGE 0W-30 LL', '3433646', 'Engine Oil', 'ACEA C3, BMW Longlife-04, MB-Approval 229.31/229.51/229.52, Porsche C30, VW 504 00/507 00', 'Long-life oil for modern Euro engines including VW, Porsche, and MB.', ''),
('EDGE 0W-40 A3/B4', '3431407', 'Engine Oil', 'ACEA A3/B4, API SP, BMW Longlife-01, MB-Approval 229.5/229.3, Porsche A40, Renault RN0700/RN0710, VW 502 00/505 00, Ford WSS-M2C937-A', 'High-performance synthetic oil for premium Euro engines including Porsche and BMW.', ''),
('EDGE 5W-30 LL', '3431128', 'Engine Oil', 'ACEA C3, BMW Longlife-04, MB-Approval 229.31/229.51, Porsche C30, VW 504 00/507 00', 'Low-ash oil for Euro vehicles with diesel particulate filters and extended drain intervals.', ''),
('EDGE 5W-30 A3/B4', '3430989', 'Engine Oil', 'ACEA A3/B4, API SL, BMW Longlife-01, MB-Approval 229.5, VW 502 00/505 00', 'Robust synthetic oil for high-performance petrol and diesel engines.', ''),
('EDGE 5W-30 M', '3431108', 'Engine Oil', 'ACEA C3, API SQ, BMW Longlife-04, MB-Approval 229.51/229.52', 'Mid-SAPS oil for modern Euro engines with emission control systems.', ''),
('EDGE 5W-40 A3/B4', '3421235', 'Engine Oil', 'ACEA A3/B3, ACEA A3/B4, API SN/CF, BMW Longlife-01, MB-Approval 229.5, Porsche A40, Renault RN0700/RN0710, VW 502 00/505 00, MB-Approval 226.5/229.3', 'High-performance oil for turbocharged and high-output engines across Euro OEMs.', ''),
('EDGE 5W-40 M', '3426982', 'Engine Oil', 'ACEA C3, API SN, BMW Longlife-04, Fiat 9.55535-S2, Porsche C40, VW 511 00', 'Mid-SAPS oil for modern Euro engines including VW 511 00 and Porsche C40.', ''),
('EDGE 5W-50 S', '3436638', 'Engine Oil', 'API SP, Ford WSS-M2C931-C', 'High-viscosity synthetic oil for performance and racing applications.', ''),
('EDGE 10W-30', '3399574', 'Engine Oil', 'API SP, API CF, ILSAC GF-6', 'Synthetic oil for light-duty petrol and diesel engines requiring GF-6.', ''),
('EDGE 10W-60', '3412397', 'Engine Oil', 'ACEA A3/B3, ACEA A3/B4, API SN/CF, Approved for BMW M-Models, VW 501 01/505 00', 'Ultra-high performance oil for BMW M engines and high-load applications.', ''),
('EDGE 25W-50', '3383419', 'Engine Oil', 'API SG/CD', 'Mineral-based oil for older engines requiring SG/CD performance.', ''),
('EDGE PROFESSIONAL A1 5W-20', '3374699', 'Engine Oil', 'ACEA A1/B1, API SL, ILSAC GF-3, STJLR.03.5004', 'Professional-grade oil for Jaguar Land Rover and Ford engines requiring 5W-20.', ''),
('EDGE PROFESSIONAL A5 0W-30', '3386606', 'Engine Oil', 'ACEA A1/B1, ACEA A5/B5, API SL/CF, Volvo EDGE Professional', 'Low-viscosity oil for Volvo and Ford engines requiring A5/B5 performance.', ''),
('EDGE PROFESSIONAL A5 5W-30', '3377780', 'Engine Oil', 'ACEA A1/B1, ACEA A5/B5, API SN/CF, ILSAC GF-4, Ford WSS-M2C913-C, STJLR.03.5003', 'Fuel-efficient oil for Ford and Jaguar Land Rover engines requiring A5/B5.', ''),
('EDGE PROFESSIONAL C1 5W-30', '3375617', 'Engine Oil', 'ACEA C1, STJLR.03.5005', 'Low-SAPS oil for Jaguar Land Rover engines with emission control systems.', ''),
('EDGE PROFESSIONAL EC 0W-20', '3427866', 'Engine Oil', 'ACEA C5, STJLR.03.5006, STJLR.51.5122', 'Advanced synthetic oil for Jaguar Land Rover engines requiring C5 and STJLR approvals.', ''),
('EDGE PROFESSIONAL E 0W-30', '3423559', 'Engine Oil', 'ACEA C2, STJLR.03.5007', 'Synthetic oil for Jaguar Land Rover engines requiring ACEA C2 and STJLR.03.5007.', ''),
('EDGE PROFESSIONAL V 0W-20', '3383785', 'Engine Oil', 'ACEA C5, Volvo VCC RBS0-2AE', 'Low-viscosity oil for Volvo engines requiring VCC RBS0-2AE spec.', ''),
('MAGNATEC HYBRID 0W-16', '3428869', 'Engine Oil', 'API SP, ILSAC GF-6B', 'Ultra-low viscosity oil for hybrid engines requiring GF-6B performance.', ''),
('MAGNATEC 0W-20', '3439018', 'Engine Oil', 'API SP, ILSAC GF-6', 'Synthetic oil for modern petrol engines requiring API SP and GF-6.', ''),
('MAGNATEC 0W-20 C5', '3440366', 'Engine Oil', 'ACEA C5, API SQ', 'Low-SAPS oil for Euro engines requiring ACEA C5 and API SQ.', ''),
('MAGNATEC 0W-20 E', '3440475', 'Engine Oil', 'Ford WSS-M2C954-A1', 'Ford-approved oil for engines requiring WSS-M2C954-A1.', ''),
('MAGNATEC 0W-30 D', '3434547', 'Engine Oil', 'ACEA C2, API SN, Ford WSS-M2C950-A', 'Synthetic oil for Ford engines requiring ACEA C2 and WSS-M2C950-A.', ''),
('MAGNATEC 5W-20', '3429066', 'Engine Oil', 'API SP, ILSAC GF-6, Ford WSS-M2C960-A1', 'Fuel-efficient oil for Ford engines requiring WSS-M2C960-A', ''),
-- Coolant products  
('Radicool SF', '3424712', 'Coolant', 'ASTM D3306, BS 6580:2010', 'Long-life OAT coolant suitable for modern engines including those requiring G12+ specification.', ''),
('Radicool P-OAT', '3429903', 'Coolant', 'ASTM D3306', 'Phosphated OAT coolant designed for Japanese and Korean vehicles requiring enhanced aluminium protection.', ''),
('Radicool Si-OAT', '3437791', 'Coolant', 'VW TL-774G (G12++), MAN 324 Si-OAT, ASTM D3306', 'Silicated OAT coolant approved for VW G12++ and MAN Si-OAT systems; ideal for high-performance aluminium engines.', ''),
('Radicool NF', '3376394', 'Coolant', 'ASTM D3306, BS 6580:2010', 'Hybrid OAT coolant suitable for European vehicles; phosphate-free and compatible with mixed-metal systems.', ''),
('Radicool Concentrate', '3424670', 'Coolant', 'ASTM D3306, BS 6580:2010', 'General-purpose ethylene glycol-based coolant for older petrol and diesel engines.', ''),
-- Brake Fluid products
('React Performance DOT 4', '3430314', 'Brake Fluid', 'FMVSS 116 DOT 4, SAE J1704, ISO 4925 Class 4', 'High-performance glycol-based brake fluid for ABS, ESP, and disc/drum systems requiring DOT 4.', ''),
('React DOT 4 Low Temp', '3430315', 'Brake Fluid', 'FMVSS 116 DOT 4, SAE J1704, ISO 4925 Class 6', 'Low viscosity DOT 4 brake fluid for modern vehicles with advanced braking systems including ABS and ESP.', ''),
('React DOT 4', '3430316', 'Brake Fluid', 'FMVSS 116 DOT 4, SAE J1704, ISO 4925 Class 4', 'Standard DOT 4 brake fluid suitable for most passenger vehicles and light commercial applications.', ''),
('React DOT 3', '3430317', 'Brake Fluid', 'FMVSS 116 DOT 3, SAE J1703, ISO 4925 Class 3', 'DOT 3 brake fluid for older vehicles and systems not requiring low viscosity performance.', ''),
-- Gear Oil products
('Transmax ATF Dex/Merc Multivehicle', '3429062', 'Gear Oil', 'Dexron III, Mercon, JASO 1A, Allison C4', 'Multi-vehicle ATF for older GM and Ford models; compatible with Dexron III and Mercon specs.', ''),
('Transmax CVT', '3425325', 'Gear Oil', 'CVT fluids for Japanese, Hyundai, Kia, Chrysler, Ford', 'Continuously Variable Transmission fluid designed for a wide range of Asian and domestic CVTs.', ''),
('Transmax Dual', '3380380', 'Gear Oil', 'VW TL 52529, Ford WSS-M2C936-A, Mitsubishi SSTF-1', 'Dual clutch transmission fluid for VW, Ford, and Mitsubishi wet clutch systems.', ''),
('Transmax Dual Multivehicle', '3439145', 'Gear Oil', 'BMW, Ford, VW, MB, Porsche, PSA, Renault, Volvo DCT', 'Multi-vehicle DCT fluid compatible with European dual clutch systems including BMW and VW.', ''),
('Transmax Universal LL 75W-90', '3430280', 'Gear Oil', 'API GL-4/GL-5/MT-1, MB 235.8, MAN, ZF, Scania', 'Long-life synthetic gear oil for manual transmissions and axles across European OEMs.', ''),
('Transmax Limited Slip 75W-85', '3430676', 'Gear Oil', 'API GL-5, Limited Slip', 'Low-viscosity limited slip oil for modern differentials requiring GL-5.', ''),
('Transmax Manual VMX 80W', '3429677', 'Gear Oil', 'API GL-4', 'Smooth-shifting manual transmission oil for passenger vehicles.', ''),
('Transmax Manual Long Life 75W-85', '3432318', 'Gear Oil', 'API GL-4, MB 235.4, Volvo, Eaton', 'Extended drain manual transmission oil for European and heavy-duty gearboxes.', ''),
('Transmax Universal 80W-90', '3430310', 'Gear Oil', 'API GL-4 / GL-5', 'Universal gear oil for manual transmissions and axles requiring GL-4 or GL-5.', '')
ON CONFLICT (code) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_consumables_type ON consumables(type);
CREATE INDEX IF NOT EXISTS idx_consumables_category ON consumables(category);
CREATE INDEX IF NOT EXISTS idx_consumables_code ON consumables(code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_code ON order_items(product_code);
CREATE INDEX IF NOT EXISTS idx_inventory_item_type_id ON inventory(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
-- Performance indexes for frequent audit log queries (ignore errors if dialect syntax differs)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_user ON audit_logs(created_at DESC, user_id);

-- Additional indexes used by runtime schema/queries
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip_address, created_at);

-- Expression/indexes for audit_logs JSON details (PostgreSQL only)
-- These are guarded to avoid errors on non-JSON text rows
DO $$ BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_audit_details_path ON audit_logs ((details::json->>'path')) WHERE substring(details from 1 for 1) IN ('{','[');
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_audit_details_method ON audit_logs ((details::json->>'method')) WHERE substring(details from 1 for 1) IN ('{','[');
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_audit_details_request_id ON audit_logs ((details::json->>'requestId')) WHERE substring(details from 1 for 1) IN ('{','[');
    EXCEPTION WHEN others THEN NULL; END;
END $$;

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

-- Additional indexes and triggers added by migrations/001
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- Add update triggers for product_categories and product_variants
DROP TRIGGER IF EXISTS update_product_categories_updated_at ON product_categories;
CREATE TRIGGER update_product_categories_updated_at
BEFORE UPDATE ON product_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON product_variants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Phase 2: Advanced Analytics & Reporting Tables
-- Analytics events table for tracking user interactions (from migration 009)
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(64) NOT NULL,
  page_url TEXT,
  referrer TEXT,
  properties JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_timestamp ON analytics_events(event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_timestamp ON analytics_events(session_id, timestamp DESC);

-- Analytics sessions table for session tracking (from migration 009)
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  country VARCHAR(2),
  started_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  page_views INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  entry_page TEXT,
  exit_page TEXT
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started ON analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_last_activity ON analytics_sessions(last_activity DESC);

-- Materialized view for daily statistics (from migration 009)
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

CREATE INDEX IF NOT EXISTS idx_analytics_daily_stats_date ON analytics_daily_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_stats_type ON analytics_daily_stats(event_type);

-- Scheduled reports table (from migration 010)
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'once')),
  recipients TEXT[],
  filters JSONB,
  format VARCHAR(20) DEFAULT 'pdf' CHECK (format IN ('pdf', 'csv', 'excel')),
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_type ON scheduled_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by ON scheduled_reports(created_by);

-- Report history table (from migration 010)
CREATE TABLE IF NOT EXISTS report_history (
  id SERIAL PRIMARY KEY,
  scheduled_report_id INTEGER REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  file_path TEXT,
  file_size INTEGER,
  recipient_count INTEGER,
  status VARCHAR(20) CHECK (status IN ('success', 'failed', 'cancelled')),
  error_message TEXT,
  metadata JSONB,
  generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_report_history_scheduled_report ON report_history(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_report_history_generated_at ON report_history(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_history_status ON report_history(status);
CREATE INDEX IF NOT EXISTS idx_report_history_type ON report_history(report_type);
-- =====================================================
-- Phase 3: Search & Discovery (Migration 011)
-- =====================================================

-- Add search_vector columns to tables (if not exists)
-- Note: These will be populated by triggers

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

-- Search queries tracking table
CREATE TABLE IF NOT EXISTS search_queries (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  results_count INTEGER DEFAULT 0,
  clicked_result_id INTEGER,
  clicked_result_type VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries(query);
CREATE INDEX IF NOT EXISTS idx_search_queries_timestamp ON search_queries(timestamp);
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON search_queries(user_id);

-- Popular searches view
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
-- Phase 4: Data Management (Migrations 012-014)
-- =====================================================

-- ============== Migration 012: Backups ==============

CREATE TABLE IF NOT EXISTS backups (
  id SERIAL PRIMARY KEY,
  backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('full', 'incremental', 'table')),
  format VARCHAR(20) DEFAULT 'sql' CHECK (format IN ('sql', 'json', 'csv')),
  file_path TEXT,
  file_size BIGINT,
  compression VARCHAR(20) CHECK (compression IN ('gzip', 'none')),
  tables TEXT[],
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_backups_started ON backups(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_type ON backups(backup_type);

COMMENT ON TABLE backups IS 'Tracks database backup and export operations';
COMMENT ON COLUMN backups.backup_type IS 'Type of backup: full (all tables), incremental (changes only), table (specific tables)';
COMMENT ON COLUMN backups.format IS 'Export format: sql (PostgreSQL dump), json (JSON export), csv (CSV export)';
COMMENT ON COLUMN backups.compression IS 'Compression method: gzip or none';
COMMENT ON COLUMN backups.tables IS 'Array of table names included in backup';
COMMENT ON COLUMN backups.status IS 'Current status: pending, running, completed, failed';
COMMENT ON COLUMN backups.metadata IS 'Additional backup information (e.g., row counts, schema version)';

-- ============== Migration 013: Bulk Operations ==============

CREATE TABLE IF NOT EXISTS bulk_operations (
  id SERIAL PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('import', 'export', 'update', 'delete')),
  target_table VARCHAR(100) NOT NULL,
  format VARCHAR(20) CHECK (format IN ('csv', 'json', 'excel')),
  file_name VARCHAR(255),
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_log JSONB,
  validation_errors JSONB,
  preview_data JSONB,
  committed BOOLEAN DEFAULT FALSE,
  can_undo BOOLEAN DEFAULT FALSE,
  undo_data JSONB,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_bulk_ops_status ON bulk_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_table ON bulk_operations(target_table);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_started ON bulk_operations(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_created_by ON bulk_operations(created_by);

COMMENT ON TABLE bulk_operations IS 'Tracks bulk data operations (import, export, update, delete)';
COMMENT ON COLUMN bulk_operations.operation_type IS 'Type: import (add new), export (download), update (modify existing), delete (remove)';
COMMENT ON COLUMN bulk_operations.target_table IS 'Database table affected by operation';
COMMENT ON COLUMN bulk_operations.error_log IS 'JSON array of errors with row numbers and messages';
COMMENT ON COLUMN bulk_operations.preview_data IS 'Sample of changes for user review before commit';
COMMENT ON COLUMN bulk_operations.undo_data IS 'Original data before changes, for rollback capability';

-- ============== Migration 014: Data History & Version Tracking ==============

CREATE TABLE IF NOT EXISTS data_history (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_data_history_table_record ON data_history(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_data_history_changed_at ON data_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_history_changed_by ON data_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_data_history_action ON data_history(action);

COMMENT ON TABLE data_history IS 'Tracks all data changes across monitored tables';
COMMENT ON COLUMN data_history.table_name IS 'Name of table where change occurred';
COMMENT ON COLUMN data_history.record_id IS 'ID of record that was changed';
COMMENT ON COLUMN data_history.action IS 'Type of change: insert, update, delete';
COMMENT ON COLUMN data_history.old_data IS 'Complete record state before change (null for inserts)';
COMMENT ON COLUMN data_history.new_data IS 'Complete record state after change (null for deletes)';
COMMENT ON COLUMN data_history.changed_fields IS 'Array of field names that were modified (updates only)';

-- Function to track changes on any table
CREATE OR REPLACE FUNCTION track_data_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[] := ARRAY[]::TEXT[];
  old_json JSONB;
  new_json JSONB;
  col RECORD;
BEGIN
  -- Convert old and new rows to JSONB
  IF TG_OP = 'DELETE' THEN
    old_json := row_to_json(OLD)::JSONB;
    new_json := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_json := NULL;
    new_json := row_to_json(NEW)::JSONB;
  ELSE -- UPDATE
    old_json := row_to_json(OLD)::JSONB;
    new_json := row_to_json(NEW)::JSONB;
    
    -- Determine which fields changed
    FOR col IN 
      SELECT key 
      FROM jsonb_each(old_json) 
      WHERE old_json->key IS DISTINCT FROM new_json->key
    LOOP
      changed_fields := array_append(changed_fields, col.key);
    END LOOP;
  END IF;

  -- Insert history record
  INSERT INTO data_history (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    changed_by
  ) VALUES (
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN (OLD.id)::INTEGER
      ELSE (NEW.id)::INTEGER
    END,
    LOWER(TG_OP),
    old_json,
    new_json,
    changed_fields,
    NULLIF(current_setting('app.current_user_id', TRUE), '')::INTEGER
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION track_data_changes() IS 'Trigger function to automatically track data changes';

-- Create materialized view for change statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS data_history_stats AS
SELECT 
  table_name,
  action,
  DATE(changed_at) as change_date,
  COUNT(*) as change_count,
  COUNT(DISTINCT record_id) as unique_records,
  COUNT(DISTINCT changed_by) as unique_users
FROM data_history
GROUP BY table_name, action, DATE(changed_at);

CREATE INDEX IF NOT EXISTS idx_data_history_stats_date ON data_history_stats(change_date DESC);
CREATE INDEX IF NOT EXISTS idx_data_history_stats_table ON data_history_stats(table_name);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_data_history_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY data_history_stats;
END;
$$ LANGUAGE plpgsql;

-- Note: Triggers must be created manually on tables to track
-- Example: CREATE TRIGGER track_products_changes 
--          AFTER INSERT OR UPDATE OR DELETE ON products
--          FOR EACH ROW EXECUTE FUNCTION track_data_changes();

-- ============================================================================
-- PHASE 6: SECURITY ENHANCEMENTS
-- ============================================================================

-- Security Events Table (from migrations/015_add_security_monitoring.sql)
CREATE TABLE IF NOT EXISTS security_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  description TEXT,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);

-- IP Blacklist Table
CREATE TABLE IF NOT EXISTS ip_blacklist (
  id SERIAL PRIMARY KEY,
  ip_address INET UNIQUE NOT NULL,
  reason TEXT,
  added_by INTEGER REFERENCES users(id),
  added_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  auto_added BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip ON ip_blacklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_active ON ip_blacklist(is_active);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_expires ON ip_blacklist(expires_at);

-- Database-backed Rate Limiting Table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  last_request TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_identifier ON api_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_endpoint ON api_rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON api_rate_limits(window_start);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_rate_limits_unique ON api_rate_limits(identifier, endpoint, window_start);

-- API Keys Table (from migrations/016_add_api_keys.sql)
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permissions TEXT[],
  rate_limit INTEGER DEFAULT 100,
  expires_at TIMESTAMP,
  last_used TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- API Key Usage Tracking Table
CREATE TABLE IF NOT EXISTS api_key_usage (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_timestamp ON api_key_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_endpoint ON api_key_usage(endpoint);


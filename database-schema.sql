-- Audit Logs Table for admin and API actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Consumables table for workshop consumables
CREATE TABLE IF NOT EXISTS consumables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    model_qty INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_email VARCHAR(255) DEFAULT 'anonymous@example.com',
    total_items INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- Performance indexes for frequent audit log queries (ignore errors if dialect syntax differs)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

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
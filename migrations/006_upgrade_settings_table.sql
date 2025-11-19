-- Migration 006: Upgrade Settings Table
-- Description: Enhanced settings table with better structure, indexing, and audit trail
-- Date: 2025-11-17

-- Create new enhanced settings table
CREATE TABLE IF NOT EXISTS settings_v2 (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_settings_v2_key ON settings_v2(key);
CREATE INDEX IF NOT EXISTS idx_settings_v2_category ON settings_v2(category);
CREATE INDEX IF NOT EXISTS idx_settings_v2_updated_at ON settings_v2(updated_at);

-- Migrate existing data from settings to settings_v2
-- Extract JSON fields and convert to individual rows
DO $$
DECLARE
    settings_json JSONB;
    current_data TEXT;
    has_data_column BOOLEAN;
BEGIN
    -- Check if the old 'data' column exists (legacy table structure)
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings' 
        AND column_name = 'data'
    ) INTO has_data_column;
    
    IF has_data_column THEN
        -- Get existing settings data from legacy JSON structure
        SELECT data INTO current_data FROM settings WHERE id = 1;
        
        IF current_data IS NOT NULL THEN
            settings_json := current_data::JSONB;
        
        -- Core Identity
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('siteTitle', settings_json->>'siteTitle', 'general', 'string', 'Website title')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('siteDescription', settings_json->>'siteDescription', 'general', 'string', 'Website description')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('contactEmail', settings_json->>'contactEmail', 'general', 'string', 'Contact email address')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('maintenanceMode', (settings_json->>'maintenanceMode')::TEXT, 'general', 'boolean', 'Enable maintenance mode')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
        
        -- Theme
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('theme', settings_json->>'theme', 'theme', 'string', 'Active theme preset')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('primaryColor', settings_json->>'primaryColor', 'theme', 'string', 'Primary theme color')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('secondaryColor', settings_json->>'secondaryColor', 'theme', 'string', 'Secondary theme color')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('accentColor', settings_json->>'accentColor', 'theme', 'string', 'Accent theme color')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
        
        -- Button colors
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('buttonPrimaryColor', settings_json->>'buttonPrimaryColor', 'theme', 'string', 'Primary button color')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('buttonSecondaryColor', settings_json->>'buttonSecondaryColor', 'theme', 'string', 'Secondary button color')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('buttonDangerColor', settings_json->>'buttonDangerColor', 'theme', 'string', 'Danger button color')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('buttonSuccessColor', settings_json->>'buttonSuccessColor', 'theme', 'string', 'Success button color')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
        
        -- SMTP (sensitive)
        INSERT INTO settings_v2 (key, value, category, data_type, is_sensitive, description) VALUES
            ('smtpHost', settings_json->>'smtpHost', 'integrations', 'string', false, 'SMTP server host')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, is_sensitive, description) VALUES
            ('smtpPort', settings_json->>'smtpPort', 'integrations', 'number', false, 'SMTP server port')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, is_sensitive, description) VALUES
            ('smtpUser', settings_json->>'smtpUser', 'integrations', 'string', false, 'SMTP username')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, is_sensitive, description) VALUES
            ('smtpPassword', settings_json->>'smtpPassword', 'integrations', 'string', true, 'SMTP password')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
        
        -- Data Sources
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('oilDataSource', settings_json->>'oilDataSource', 'general', 'string', 'Oil products data source')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('consumablesDataSource', settings_json->>'consumablesDataSource', 'general', 'string', 'Consumables data source')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
        
        -- Branding
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('logoUrl', settings_json->>'logoUrl', 'general', 'string', 'Logo image URL')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('faviconUrl', settings_json->>'faviconUrl', 'general', 'string', 'Favicon image URL')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
        
        -- Customization
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('customCss', settings_json->>'customCss', 'theme', 'string', 'Custom CSS code')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('customJs', settings_json->>'customJs', 'general', 'string', 'Custom JavaScript code')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
        
        -- Feature Flags (JSON)
        IF settings_json ? 'featureFlags' THEN
            INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
                ('featureFlags', (settings_json->'featureFlags')::TEXT, 'features', 'json', 'Feature flag settings')
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
        END IF;
        
        -- Theme Schedule (JSON)
        IF settings_json ? 'themeSchedule' THEN
            INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
                ('themeSchedule', (settings_json->'themeSchedule')::TEXT, 'theme', 'json', 'Automatic theme scheduling')
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
        END IF;
        
        -- Security
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('sessionTimeout', settings_json->>'sessionTimeout', 'security', 'number', 'Session timeout in minutes')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('maxLoginAttempts', settings_json->>'maxLoginAttempts', 'security', 'number', 'Maximum login attempts before lockout')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('enable2FA', (settings_json->>'enable2FA')::TEXT, 'security', 'boolean', 'Enable two-factor authentication')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
            
        INSERT INTO settings_v2 (key, value, category, data_type, description) VALUES
            ('auditAllActions', (settings_json->>'auditAllActions')::TEXT, 'security', 'boolean', 'Audit all user actions')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
        END IF;
    ELSE
        -- New table structure already exists, copy data from current settings table
        INSERT INTO settings_v2 (key, value, category, data_type, is_sensitive, description, default_value, validation_rules, created_at, updated_at, updated_by)
        SELECT key, value, category, data_type, is_sensitive, description, default_value, validation_rules, created_at, updated_at, updated_by
        FROM settings
        ON CONFLICT (key) DO NOTHING;
    END IF;
END $$;

-- Rename old table and new table
-- Drop legacy table if it exists from previous failed migration
DROP TABLE IF EXISTS settings_legacy;

-- Only rename if settings_v2 exists (migration was successful)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings_v2') THEN
        -- Check if settings table still exists (not already renamed)
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings') THEN
            ALTER TABLE settings RENAME TO settings_legacy;
        END IF;
        ALTER TABLE settings_v2 RENAME TO settings;
    END IF;
END $$;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-update
DROP TRIGGER IF EXISTS settings_updated_at_trigger ON settings;
CREATE TRIGGER settings_updated_at_trigger
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

-- Create view for backward compatibility (returns JSON like old table)
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

COMMENT ON TABLE settings IS 'Enhanced settings table with structured key-value storage';
COMMENT ON COLUMN settings.key IS 'Unique setting key identifier';
COMMENT ON COLUMN settings.category IS 'Setting category for grouping (general, theme, security, integrations, features)';
COMMENT ON COLUMN settings.data_type IS 'Data type of the value (string, number, boolean, json, array)';
COMMENT ON COLUMN settings.is_sensitive IS 'Mark sensitive data like passwords for special handling';
COMMENT ON COLUMN settings.validation_rules IS 'JSON schema or validation rules for the setting value';

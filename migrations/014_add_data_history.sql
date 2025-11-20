-- Migration 014: Add data audit and version history tracking
-- Part of Phase 4: Data Management
-- Date: 2025-11-20

-- Create table to track all data changes across all tables
CREATE TABLE IF NOT EXISTS data_history (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL, -- insert, update, delete
  old_data JSONB, -- Complete record before change
  new_data JSONB, -- Complete record after change
  changed_fields TEXT[], -- Array of field names that changed
  changed_by INTEGER REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  reason TEXT, -- Optional reason for change
  INDEX idx_data_history_table_record (table_name, record_id),
  INDEX idx_data_history_changed_at (changed_at),
  INDEX idx_data_history_changed_by (changed_by),
  INDEX idx_data_history_action (action)
);

-- Create function to track changes on any table
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

CREATE INDEX idx_data_history_stats_date ON data_history_stats(change_date);
CREATE INDEX idx_data_history_stats_table ON data_history_stats(table_name);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_data_history_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY data_history_stats;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE data_history IS 'Tracks all data changes across monitored tables';
COMMENT ON COLUMN data_history.table_name IS 'Name of table where change occurred';
COMMENT ON COLUMN data_history.record_id IS 'ID of record that was changed';
COMMENT ON COLUMN data_history.action IS 'Type of change: insert, update, delete';
COMMENT ON COLUMN data_history.old_data IS 'Complete record state before change (null for inserts)';
COMMENT ON COLUMN data_history.new_data IS 'Complete record state after change (null for deletes)';
COMMENT ON COLUMN data_history.changed_fields IS 'Array of field names that were modified (updates only)';
COMMENT ON FUNCTION track_data_changes() IS 'Trigger function to automatically track data changes';

-- Note: Triggers must be created manually on tables to track
-- Example: CREATE TRIGGER track_products_changes 
--          AFTER INSERT OR UPDATE OR DELETE ON products
--          FOR EACH ROW EXECUTE FUNCTION track_data_changes();

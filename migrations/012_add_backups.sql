-- Migration 012: Add backups table for backup & export system
-- Part of Phase 4: Data Management
-- Date: 2025-11-20

-- Create backups table to track backup operations
CREATE TABLE IF NOT EXISTS backups (
  id SERIAL PRIMARY KEY,
  backup_type VARCHAR(50) NOT NULL, -- full, incremental, table
  format VARCHAR(20) DEFAULT 'sql', -- sql, json, csv
  file_path TEXT,
  file_size BIGINT,
  compression VARCHAR(20), -- gzip, none
  tables TEXT[], -- Which tables were backed up
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'running', -- running, completed, failed
  error_message TEXT,
  created_by INTEGER REFERENCES users(id),
  metadata JSONB, -- Additional backup metadata
  INDEX idx_backups_started (started_at),
  INDEX idx_backups_status (status),
  INDEX idx_backups_type (backup_type)
);

-- Add comments for documentation
COMMENT ON TABLE backups IS 'Tracks database backup and export operations';
COMMENT ON COLUMN backups.backup_type IS 'Type of backup: full (all tables), incremental (changes only), table (specific tables)';
COMMENT ON COLUMN backups.format IS 'Export format: sql (PostgreSQL dump), json (JSON export), csv (CSV export)';
COMMENT ON COLUMN backups.compression IS 'Compression method: gzip or none';
COMMENT ON COLUMN backups.tables IS 'Array of table names included in backup';
COMMENT ON COLUMN backups.status IS 'Current status: running, completed, failed';
COMMENT ON COLUMN backups.metadata IS 'Additional backup information (e.g., row counts, schema version)';

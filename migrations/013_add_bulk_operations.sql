-- Migration 013: Add bulk operations tracking
-- Part of Phase 4: Data Management
-- Date: 2025-11-20

-- Create table to track bulk import/export/update operations
CREATE TABLE IF NOT EXISTS bulk_operations (
  id SERIAL PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL, -- import, export, update, delete
  target_table VARCHAR(100) NOT NULL, -- Table being operated on
  format VARCHAR(20), -- csv, json, excel
  file_name VARCHAR(255),
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_log JSONB, -- Array of errors encountered
  validation_errors JSONB, -- Validation errors before processing
  preview_data JSONB, -- Preview of changes before commit
  committed BOOLEAN DEFAULT FALSE, -- Whether changes were committed
  can_undo BOOLEAN DEFAULT FALSE, -- Whether operation can be undone
  undo_data JSONB, -- Data needed to undo operation
  created_by INTEGER REFERENCES users(id),
  metadata JSONB,
  INDEX idx_bulk_ops_status (status),
  INDEX idx_bulk_ops_table (target_table),
  INDEX idx_bulk_ops_started (started_at),
  INDEX idx_bulk_ops_created_by (created_by)
);

-- Add comments for documentation
COMMENT ON TABLE bulk_operations IS 'Tracks bulk data operations (import, export, update, delete)';
COMMENT ON COLUMN bulk_operations.operation_type IS 'Type: import (add new), export (download), update (modify existing), delete (remove)';
COMMENT ON COLUMN bulk_operations.target_table IS 'Database table affected by operation';
COMMENT ON COLUMN bulk_operations.error_log IS 'JSON array of errors with row numbers and messages';
COMMENT ON COLUMN bulk_operations.preview_data IS 'Sample of changes for user review before commit';
COMMENT ON COLUMN bulk_operations.undo_data IS 'Original data before changes, for rollback capability';

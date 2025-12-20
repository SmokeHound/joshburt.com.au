-- Migration 005: Bulk Operations
-- Creates bulk_operations table used by bulk-import.html and /bulk-operations API

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

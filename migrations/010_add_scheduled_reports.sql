-- Phase 2.2: Automated Report Generation
-- Migration to add scheduled reports and report history tables

-- Scheduled reports table
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL, -- sales, inventory, users, analytics, custom
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'once')),
  recipients TEXT[], -- Array of email addresses
  filters JSONB, -- Report parameters (date_range, user_type, product_category, etc.)
  format VARCHAR(20) DEFAULT 'pdf' CHECK (format IN ('pdf', 'csv', 'excel')),
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for scheduled reports
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_type ON scheduled_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by ON scheduled_reports(created_by);

-- Report history table
CREATE TABLE IF NOT EXISTS report_history (
  id SERIAL PRIMARY KEY,
  scheduled_report_id INTEGER REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  file_path TEXT, -- Path to generated file (if stored)
  file_size INTEGER, -- Size in bytes
  recipient_count INTEGER,
  status VARCHAR(20) CHECK (status IN ('success', 'failed', 'cancelled')),
  error_message TEXT,
  metadata JSONB, -- Additional info (filters used, row count, etc.)
  generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for report history
CREATE INDEX IF NOT EXISTS idx_report_history_scheduled_report ON report_history(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_report_history_generated_at ON report_history(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_history_status ON report_history(status);
CREATE INDEX IF NOT EXISTS idx_report_history_type ON report_history(report_type);

-- Function to calculate next run time for scheduled reports
CREATE OR REPLACE FUNCTION calculate_next_run(
  frequency VARCHAR(20),
  current_run TIMESTAMP DEFAULT NOW()
)
RETURNS TIMESTAMP AS $$
DECLARE
  next_run TIMESTAMP;
BEGIN
  CASE frequency
    WHEN 'daily' THEN
      next_run := current_run + INTERVAL '1 day';
    WHEN 'weekly' THEN
      next_run := current_run + INTERVAL '1 week';
    WHEN 'monthly' THEN
      next_run := current_run + INTERVAL '1 month';
    WHEN 'once' THEN
      next_run := NULL; -- One-time reports don't have a next run
    ELSE
      next_run := current_run + INTERVAL '1 day'; -- Default to daily
  END CASE;
  
  RETURN next_run;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update next_run after a report is generated
CREATE OR REPLACE FUNCTION update_scheduled_report_next_run()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' AND OLD.scheduled_report_id IS NOT NULL THEN
    UPDATE scheduled_reports
    SET 
      last_run = NEW.generated_at,
      next_run = calculate_next_run(frequency, NEW.generated_at)
    WHERE id = NEW.scheduled_report_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_report_next_run
  AFTER INSERT ON report_history
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_report_next_run();

COMMENT ON TABLE scheduled_reports IS 'Scheduled report configurations for automated report generation';
COMMENT ON TABLE report_history IS 'Historical record of generated reports';
COMMENT ON COLUMN scheduled_reports.filters IS 'JSONB field for report parameters (date ranges, filters, etc.)';
COMMENT ON COLUMN scheduled_reports.recipients IS 'Array of email addresses to receive the report';
COMMENT ON COLUMN report_history.metadata IS 'Additional report metadata (row count, execution time, etc.)';

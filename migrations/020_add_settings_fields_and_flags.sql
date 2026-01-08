-- Add new DB-backed settings fields and extend featureFlags JSON defaults
--
-- Adds:
-- - general.maintenanceMessage (string)
-- - integrations.fromEmail (string)
-- - integrations.fromName (string)
-- - featureFlags: enableAdvancedAnalytics, enableScheduledReports, enableCustomerInsights (boolean defaults)

-- 1) New settings rows (idempotent)
INSERT INTO settings (key, value, category, data_type, is_sensitive, description)
VALUES
  (
    'maintenanceMessage',
    '',
    'general',
    'string',
    false,
    'Maintenance mode message'
  ),
  (
    'fromEmail',
    '',
    'integrations',
    'string',
    false,
    'Default From email address for outgoing emails'
  ),
  (
    'fromName',
    '',
    'integrations',
    'string',
    false,
    'Default From name for outgoing emails'
  )
ON CONFLICT (key) DO NOTHING;

-- 2) Extend featureFlags JSON with new admin tool flags (preserve any existing values)
-- Only sets each key if missing.
UPDATE settings
SET
  value = (
    CASE
      WHEN value IS NULL OR value = '' THEN
        '{"enableAdvancedAnalytics":true,"enableScheduledReports":true,"enableCustomerInsights":true}'
      ELSE
        (
          (
            (
              value::jsonb
              || CASE
                WHEN (value::jsonb ? 'enableAdvancedAnalytics') THEN '{}'::jsonb
                ELSE '{"enableAdvancedAnalytics":true}'::jsonb
              END
            )
            || CASE
              WHEN (value::jsonb ? 'enableScheduledReports') THEN '{}'::jsonb
              ELSE '{"enableScheduledReports":true}'::jsonb
            END
          )
          || CASE
            WHEN (value::jsonb ? 'enableCustomerInsights') THEN '{}'::jsonb
            ELSE '{"enableCustomerInsights":true}'::jsonb
          END
        )::text
    END
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE key = 'featureFlags' AND data_type = 'json';

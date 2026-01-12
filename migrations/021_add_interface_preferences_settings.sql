-- Migration 021: Add Interface Preferences settings
-- Description: Adds DB-backed UI preference keys (motion + non-color design tokens)
-- Date: 2026-01-12

-- New settings rows (idempotent)
INSERT INTO settings (key, value, category, data_type, is_sensitive, description)
VALUES
  (
    'reduceMotion',
    'false',
    'general',
    'boolean',
    false,
    'Force reduced motion (disable animations/transitions)'
  ),
  (
    'spacingScale',
    '1',
    'theme',
    'number',
    false,
    'Global spacing scale multiplier (affects --token-spacing-*)'
  ),
  (
    'fontScale',
    '1',
    'theme',
    'number',
    false,
    'Global font scale multiplier'
  ),
  (
    'baseFontWeight',
    '400',
    'theme',
    'string',
    false,
    'Base font weight (updates token font-weight values)'
  ),
  (
    'radiusMd',
    '12',
    'theme',
    'number',
    false,
    'Medium corner radius in pixels (derives radius scale)'
  ),
  (
    'shadowPreset',
    'default',
    'theme',
    'string',
    false,
    'Shadow preset (default/none/soft/crisp/deep)'
  )
ON CONFLICT (key) DO NOTHING;

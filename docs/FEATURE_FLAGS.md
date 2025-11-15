# Feature Flags

Configuration system for enabling/disabling features without code deployment.

## Table of Contents

- [Overview](#overview)
- [Available Flags](#available-flags)
- [Implementation](#implementation)
- [Usage](#usage)
- [Best Practices](#best-practices)

---

## Overview

**Storage**: Database (`settings` table, JSONB field)

**Access**: Via `/settings.html` (admin only) or `/.netlify/functions/settings`

**Purpose**:

- Enable beta features for testing
- Gradual rollouts
- A/B testing
- Quick feature disable without redeployment

---

## Available Flags

### Current Flags

| Flag                           | Type    | Default | Description                 |
| ------------------------------ | ------- | ------- | --------------------------- |
| `featureFlags.betaFeatures`    | boolean | `false` | Enable all beta features    |
| `featureFlags.newDashboard`    | boolean | `false` | New analytics dashboard     |
| `featureFlags.advancedReports` | boolean | `false` | Advanced reporting system   |
| `featureFlags.auth0Enabled`    | boolean | `false` | Auth0 OAuth integration     |
| `maintenanceMode`              | boolean | `false` | Site-wide maintenance mode  |
| `enableRegistration`           | boolean | `true`  | Allow new user registration |
| `enableGuestCheckout`          | boolean | `false` | Guest checkout for orders   |
| `enable2FA`                    | boolean | `true`  | Two-factor authentication   |
| `auditAllActions`              | boolean | `true`  | Log all user actions        |

### Database Structure

```json
{
  "maintenanceMode": false,
  "enableRegistration": true,
  "enable2FA": true,
  "auditAllActions": true,
  "featureFlags": {
    "betaFeatures": false,
    "newDashboard": false,
    "advancedReports": false,
    "auth0Enabled": false
  }
}
```

---

## Implementation

### Backend (Get Flags)

**Endpoint**: `GET /.netlify/functions/settings`

```javascript
// netlify/functions/settings.js
const { pool } = require('../../config/database');

exports.handler = async event => {
  const result = await pool.query('SELECT data FROM settings WHERE id = 1');
  const settings = result.rows[0]?.data || {};

  return {
    statusCode: 200,
    body: JSON.stringify(settings)
  };
};
```

### Backend (Update Flags)

**Endpoint**: `PUT /.netlify/functions/settings`

**Auth**: Admin only

```javascript
exports.handler = async event => {
  await requirePermission(event, 'settings', 'update');

  const updates = JSON.parse(event.body);

  await pool.query('UPDATE settings SET data = $1, updated_at = NOW() WHERE id = 1', [
    JSON.stringify(updates)
  ]);

  // Log audit event
  await logAudit(user.id, 'settings:update', JSON.stringify(updates));

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Settings updated' })
  };
};
```

### Frontend (Check Flag)

```javascript
// Fetch settings on app load
const settings = await fetch('/.netlify/functions/settings', {
  headers: { Authorization: `Bearer ${accessToken}` }
}).then(r => r.json());

// Store globally
window.APP_SETTINGS = settings;

// Check flag
if (window.APP_SETTINGS.featureFlags?.newDashboard) {
  // Show new dashboard
  showNewDashboard();
} else {
  // Show old dashboard
  showOldDashboard();
}
```

### Public Configuration

**Endpoint**: `GET /.netlify/functions/public-config` (no auth required)

Returns public flags only (e.g., `auth0Enabled`, `enableRegistration`):

```javascript
// netlify/functions/public-config.js
exports.handler = async event => {
  const result = await pool.query('SELECT data FROM settings WHERE id = 1');
  const settings = result.rows[0]?.data || {};

  // Return only public flags
  return {
    statusCode: 200,
    body: JSON.stringify({
      auth0Enabled: settings.featureFlags?.auth0Enabled || false,
      registrationEnabled: settings.enableRegistration || true,
      maintenanceMode: settings.maintenanceMode || false
    })
  };
};
```

---

## Usage

### Admin UI

**File**: `settings.html`

```html
<div class="feature-flags">
  <h3>Feature Flags</h3>

  <label>
    <input type="checkbox" id="flag-beta-features" />
    Beta Features
  </label>

  <label>
    <input type="checkbox" id="flag-new-dashboard" />
    New Dashboard
  </label>

  <button onclick="saveSettings()">Save Settings</button>
</div>

<script>
  async function loadSettings() {
    const settings = await fetch('/.netlify/functions/settings', {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).then(r => r.json());

    document.getElementById('flag-beta-features').checked =
      settings.featureFlags?.betaFeatures || false;
    document.getElementById('flag-new-dashboard').checked =
      settings.featureFlags?.newDashboard || false;
  }

  async function saveSettings() {
    const settings = {
      featureFlags: {
        betaFeatures: document.getElementById('flag-beta-features').checked,
        newDashboard: document.getElementById('flag-new-dashboard').checked
      }
    };

    await fetch('/.netlify/functions/settings', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });

    alert('Settings saved!');
  }

  loadSettings();
</script>
```

### Conditional Rendering

```javascript
// Check flag before showing feature
const showAdvancedReports = () => {
  if (!window.APP_SETTINGS.featureFlags?.advancedReports) {
    console.log('Advanced reports feature disabled');
    return;
  }

  // Feature is enabled, show it
  document.getElementById('advanced-reports').style.display = 'block';
};
```

### Backend Feature Gate

```javascript
// netlify/functions/reports.js
exports.handler = async event => {
  const settings = await getSettings();

  if (!settings.featureFlags?.advancedReports) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Feature not enabled' })
    };
  }

  // Feature is enabled, proceed
  // ... report logic
};
```

---

## Best Practices

### Naming Convention

Use descriptive, hierarchical names:

```javascript
{
  "featureFlags": {
    "products": {
      "categories": true,
      "variants": true,
      "bulkUpload": false
    },
    "orders": {
      "trackingIntegration": false,
      "autoConfirm": true
    }
  }
}
```

### Gradual Rollout

1. **Deploy with flag disabled**
2. **Enable for admins** (test internally)
3. **Enable for subset of users** (beta testing)
4. **Enable for all users** (full rollout)
5. **Remove flag after stable** (clean up code)

### Cleanup Strategy

Remove flags after features are stable (typically 2-4 weeks):

```javascript
// Before (with flag)
if (settings.featureFlags?.newDashboard) {
  showNewDashboard();
} else {
  showOldDashboard();
}

// After (flag removed, feature permanent)
showNewDashboard();
```

### Documentation

Document each flag in code:

```javascript
/**
 * Feature Flags
 *
 * - betaFeatures: Enable all beta features (added: 2025-11-01)
 * - newDashboard: New analytics dashboard (added: 2025-11-05, stable: TBD)
 * - advancedReports: Advanced reporting (added: 2025-11-10, experimental)
 */
```

---

## Adding New Flag

### 1. Add to Settings

```javascript
// Update settings via admin UI or database
UPDATE settings SET data = jsonb_set(
  data,
  '{featureFlags,myNewFeature}',
  'false'
) WHERE id = 1;
```

### 2. Document Flag

Add to this file (Available Flags table).

### 3. Implement Feature

```javascript
// Frontend check
if (window.APP_SETTINGS.featureFlags?.myNewFeature) {
  // New feature code
}

// Backend check
const settings = await getSettings();
if (settings.featureFlags?.myNewFeature) {
  // New feature code
}
```

### 4. Test

- Test with flag **disabled** (fallback works)
- Test with flag **enabled** (feature works)
- Test toggling flag (no reload required ideally)

---

## Troubleshooting

### Flag Not Updating

**Issue**: Changed flag in admin UI, but frontend still sees old value.

**Solution**: Frontend caches settings. Reload page or refetch settings:

```javascript
// Refetch settings without reload
const refreshSettings = async () => {
  const settings = await fetch('/.netlify/functions/settings', {
    headers: { Authorization: `Bearer ${accessToken}` }
  }).then(r => r.json());

  window.APP_SETTINGS = settings;
};
```

### Flag Not Persisting

**Issue**: Flag resets after server restart.

**Solution**: Flags stored in database, not environment variables. Verify database connection.

---

## Support

- **Settings UI**: `settings.html` (admin only)
- **API**: See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) → Settings section
- **Database**: See [DATABASE.md](DATABASE.md) → Settings table

---

**Last Updated**: 2025-11-11  
**Maintained By**: Development Team

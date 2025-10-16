# Feature Flags Implementation

## Overview

This implementation adds feature flag functionality to the website, allowing administrators to enable/disable features via the settings page. Three feature flags are currently implemented:

1. **Beta Features** - Experimental features marked as beta
2. **New Dashboard** - Enhanced dashboard experience
3. **Advanced Reports** - Premium analytics and reporting

## Architecture

### Core Components

#### 1. Feature Flags Utility (`assets/js/feature-flags.js`)

A lightweight utility that:
- Fetches feature flags from the settings API
- Caches flags for 1 minute to reduce API calls
- Provides methods to check flag status and toggle element visibility
- Automatically clears cache when settings are updated

**API:**
```javascript
// Check if a feature is enabled
const isEnabled = await FeatureFlags.isEnabled('betaFeatures');

// Fetch all flags
const flags = await FeatureFlags.fetch();

// Toggle elements based on flag
await FeatureFlags.toggleElements('#beta-section', 'betaFeatures');

// Clear cache (called automatically on settings save)
FeatureFlags.clearCache();
```

#### 2. Settings Integration

The settings page (`settings.html`) includes three feature flag checkboxes:
- Beta Features
- New Dashboard
- Advanced Reports

When settings are saved, the feature flags cache is automatically cleared to ensure immediate updates.

### Feature Implementations

#### Beta Features (administration.html)

Located in the Admin Dashboard, includes three beta features:

1. **AI-Powered Insights**
   - Intelligent recommendations based on data patterns
   - Coming soon notification

2. **Predictive Analytics**
   - Forecast future trends and patterns
   - Coming soon notification

3. **Advanced Automation**
   - Automate complex workflows
   - Coming soon notification

All features are visually marked with a yellow "BETA" badge and shown only when the `betaFeatures` flag is enabled.

#### New Dashboard (administration.html)

A promotional section linking to the enhanced dashboard experience (`shared-dashboards.html`).

Features:
- Redesigned UI with modern components
- Improved data visualization
- Customizable widget layout
- Real-time updates

Marked with a blue "NEW" badge and shown only when the `newDashboard` flag is enabled.

#### Advanced Reports (analytics.html)

Comprehensive reporting features integrated into the analytics page.

Features:
- **Report Types:**
  - Comprehensive Analysis
  - Predictive Analytics
  - Comparative Report
  - User Behavior Analysis
  - Revenue Forecast

- **Premium Metrics:**
  - Customer Lifetime Value (CLV)
  - Churn Rate
  - Customer Acquisition Cost (CAC)
  - Revenue Per User (RPU)

- **Export Formats:**
  - PDF Report
  - Excel Spreadsheet
  - JSON Data
  - Interactive Dashboard

- **Report Generation:**
  - Configurable time periods (7, 30, 90, 365 days, custom)
  - Key insights and recommendations
  - Preview before export

Marked with a purple "PREMIUM" badge and shown only when the `advancedReports` flag is enabled.

## Usage

### For Administrators

1. Navigate to the Settings page
2. Scroll to the "Feature Flags" section
3. Toggle any of the three feature flags:
   - ☐ Beta Features
   - ☐ New Dashboard
   - ☐ Advanced Reports
4. Click "Save Settings"
5. Visit the relevant pages to see the features:
   - **Beta Features & New Dashboard**: Go to Administration page
   - **Advanced Reports**: Go to Analytics page

### For Developers

To add a new feature flag:

1. **Add to Settings UI** (`settings.html`):
```html
<label class="flex items-center gap-2">
  <input id="feature-your-feature" type="checkbox">
  <span>Your Feature Name</span>
</label>
```

2. **Update Settings Collection** (`settings.html` JavaScript):
```javascript
featureFlags: {
  betaFeatures: document.getElementById('feature-beta-features')?.checked || false,
  newDashboard: document.getElementById('feature-new-dashboard')?.checked || false,
  advancedReports: document.getElementById('feature-advanced-reports')?.checked || false,
  yourFeature: document.getElementById('feature-your-feature')?.checked || false
}
```

3. **Update Settings Load** (`settings.html` JavaScript):
```javascript
if (settings.featureFlags) {
  // ... existing flags ...
  document.getElementById('feature-your-feature').checked = settings.featureFlags.yourFeature;
}
```

4. **Create Feature UI** (in relevant HTML file):
```html
<div id="your-feature-section" class="hidden">
  <!-- Your feature content -->
</div>
```

5. **Initialize Feature Toggle** (in relevant HTML file JavaScript):
```javascript
document.addEventListener('DOMContentLoaded', async function() {
  if (window.FeatureFlags) {
    await window.FeatureFlags.toggleElements('#your-feature-section', 'yourFeature');
  }
});
```

## Testing

A dedicated test page is available at `feature-flags-demo.html` that:
- Shows current status of all three flags
- Provides quick toggle functionality
- Demonstrates all feature sections
- Includes usage instructions

### Manual Testing Steps

1. Start the web server:
   ```bash
   python3 -m http.server 8000
   ```

2. Start Netlify functions (if available):
   ```bash
   netlify dev
   ```

3. Visit test page:
   ```
   http://localhost:8000/feature-flags-demo.html
   ```

4. Toggle flags in Settings and verify:
   - Elements show/hide correctly
   - Cache is cleared on settings save
   - Changes are immediate after page refresh

## Database Schema

The settings are stored in a single row in the `settings` table:

```sql
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    data TEXT  -- JSON string containing all settings
);
```

Example settings JSON:
```json
{
  "siteTitle": "Josh Burt Demo",
  "theme": "dark",
  "featureFlags": {
    "betaFeatures": true,
    "newDashboard": true,
    "advancedReports": true
  }
}
```

## API Endpoints

### GET /.netlify/functions/settings

Returns current settings including feature flags.

**Response:**
```json
{
  "siteTitle": "...",
  "featureFlags": {
    "betaFeatures": true,
    "newDashboard": false,
    "advancedReports": true
  }
}
```

### PUT /.netlify/functions/settings

Updates settings including feature flags.

**Request Body:**
```json
{
  "featureFlags": {
    "betaFeatures": true,
    "newDashboard": true,
    "advancedReports": true
  }
}
```

## Performance

- Feature flags are cached for 60 seconds to minimize API calls
- Cache is automatically cleared when settings are saved
- Minimal overhead: ~1KB JavaScript utility
- No performance impact when flags are disabled

## Browser Support

Works in all modern browsers that support:
- ES6+ JavaScript (async/await, arrow functions)
- Fetch API
- localStorage (for potential future enhancements)

## Security

- Feature flags are read-only from the client side
- Only administrators with access to the Settings page can modify flags
- No sensitive data is exposed in feature flag state
- All settings changes are audit-logged

## Future Enhancements

Possible improvements:
- Per-user feature flags (enable features for specific users)
- Gradual rollout (percentage-based feature enablement)
- A/B testing integration
- Feature flag analytics (usage tracking)
- Time-based auto-enable/disable
- Role-based feature access

## Troubleshooting

### Features not showing after enabling flag

1. Check browser console for errors
2. Verify `feature-flags.js` is loaded
3. Hard refresh page (Ctrl+F5 or Cmd+Shift+R)
4. Check that settings API is responding correctly
5. Verify settings were saved (check database)

### Cache not clearing

- The cache is automatically cleared on settings save
- You can manually clear by calling `FeatureFlags.clearCache()` in console
- Cache expires after 60 seconds anyway

### Settings not persisting

1. Check that the settings table exists in the database
2. Verify the settings endpoint is working (test with curl)
3. Check browser network tab for failed API calls
4. Ensure database is writable

## License

Part of the joshburt.com.au website project.

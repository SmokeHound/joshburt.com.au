// Test settings save API
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testSave() {
  const baseUrl = 'http://localhost:8888/.netlify/functions';

  // First login to get token
  console.log('Logging in...');
  const loginRes = await fetch(`${baseUrl}/auth?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@joshburt.com.au',
      password: 'Admin123!'
    })
  });

  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status);
    return;
  }

  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('✓ Logged in successfully\n');

  // Try to save settings
  console.log('Saving settings...');
  const testSettings = {
    siteTitle: 'Test Site',
    maintenanceMode: false,
    featureFlags: {
      betaFeatures: true,
      newDashboard: false,
      advancedReports: true,
      enableRegistration: true,
      enableGuestCheckout: false
    },
    themeSchedule: {
      enabled: false,
      darkModeStart: '18:00',
      lightModeStart: '06:00'
    },
    smtpHost: 'smtp.test.com',
    smtpPort: 587
  };

  const saveRes = await fetch(`${baseUrl}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(testSettings)
  });

  console.log('Response status:', saveRes.status);
  const saveData = await saveRes.json();
  console.log('Response data:', JSON.stringify(saveData, null, 2));

  if (!saveRes.ok) {
    console.error('✗ Save failed');
  } else {
    console.log('✓ Save successful');

    // Verify by reading back
    console.log('\nVerifying saved settings...');
    const getRes = await fetch(`${baseUrl}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const getData = await getRes.json();
    console.log('Feature flags:', getData.featureFlags);
    console.log('Theme schedule:', getData.themeSchedule);
    console.log('SMTP Host:', getData.smtpHost);
  }
}

testSave().catch(console.error);

const fs = require('fs');
const path = require('path');

// Minimal utility to load an HTML file from project root
function loadHtml(file) {
  const p = path.join(__dirname, '..', '..', file);
  return fs.readFileSync(p, 'utf8');
}

describe('Page header utility adoption', () => {
  const pages = [
    'index.html',
    'administration.html',
    'analytics.html',
    'audit-logs.html',
    'consumables.html',
    'oil.html',
    'profile.html',
    'settings.html',
    'shared-dashboards.html',
    'users.html',
  ];

  test.each(pages)('%s contains page-header and main landmark', (file) => {
    const html = loadHtml(file);
    expect(html).toMatch(/<header[^>]*class=["'][^"']*page-header[^"']*["'][^>]*>/i);
    // Ensure there is a main landmark; allow attributes
    expect(html).toMatch(/<main\b[^>]*>/i);
  });
});

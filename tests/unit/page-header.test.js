const fs = require('fs');
const path = require('path');

describe('Page header utility presence', () => {
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

  for (const page of pages) {
    it(`${page} contains a page header`, () => {
      const file = path.join(__dirname, '..', '..', page);
      const html = fs.readFileSync(file, 'utf8');
      expect(html).toMatch(/<header[^>]*class="[^"]*page-header[^"]*"/);
    });
  }
});

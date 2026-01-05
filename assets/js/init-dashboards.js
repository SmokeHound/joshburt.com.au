// Shared dashboard initialization helper
(function() {
  let stockTrendChart = null;

  function getCssVar(name, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function colorToRgba(color, alpha) {
    if (!color) {return color;}
    const c = String(color).trim();
    const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
    const a = clamp(Number(alpha), 0, 1);

    if (c.startsWith('rgba(')) {
      const parts = c.slice(5, -1).split(',').map(p => p.trim());
      if (parts.length >= 3) {return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;}
    }
    if (c.startsWith('rgb(')) {
      const parts = c.slice(4, -1).split(',').map(p => p.trim());
      if (parts.length >= 3) {return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;}
    }
    if (c.startsWith('#')) {
      const raw = c.slice(1);
      const hex = raw.length === 3 ? raw.split('').map(ch => ch + ch).join('') : raw;
      if (/^[0-9a-fA-F]{6}$/.test(hex)) {
        const r = parseInt(hex.slice(0,2), 16);
        const g = parseInt(hex.slice(2,4), 16);
        const b = parseInt(hex.slice(4,6), 16);
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      }
    }
    return c;
  }

  function applyStockTrendTheme() {
    if (!stockTrendChart) {return;}
    try {
      const primary = getCssVar('--token-color-primary', '#3b82f6');
      const text = getCssVar('--token-text-secondary', 'rgb(209, 213, 219)');
      const grid = getCssVar('--token-border-default', 'rgba(255,255,255,0.1)');

      if (stockTrendChart.data?.datasets?.[0]) {
        stockTrendChart.data.datasets[0].backgroundColor = colorToRgba(primary, 0.7);
        stockTrendChart.data.datasets[0].borderColor = primary;
      }
      if (stockTrendChart.options?.plugins?.legend?.labels) {
        stockTrendChart.options.plugins.legend.labels.color = text;
      }
      if (stockTrendChart.options?.scales?.x?.ticks) {
        stockTrendChart.options.scales.x.ticks.color = text;
      }
      if (stockTrendChart.options?.scales?.y?.ticks) {
        stockTrendChart.options.scales.y.ticks.color = text;
      }
      if (stockTrendChart.options?.scales?.x?.grid) {
        stockTrendChart.options.scales.x.grid.color = colorToRgba(grid, 0.25);
      }
      if (stockTrendChart.options?.scales?.y?.grid) {
        stockTrendChart.options.scales.y.grid.color = colorToRgba(grid, 0.25);
      }
      stockTrendChart.update();
    } catch (e) {
      // ignore
    }
  }
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = url;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = (_e) => reject(new Error('Failed to load ' + url));
      document.head.appendChild(s);
    });
  }

  async function fetchJson(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) {return null;}
      return await res.json();
    } catch (e) { return null; }
  }

  function renderList(items) {
    if (!items || !items.length) {return '<div class="text-sm text-gray-400">No items</div>';}
    return '<ul class="space-y-2">' + items.map(it => `<li class="p-2 bg-gray-800 rounded">${typeof it === 'string' ? it : JSON.stringify(it)}</li>`).join('') + '</ul>';
  }

  async function initAdminDashboard() {
    const container = document.getElementById('admin-dashboard');
    if (!container) {return;}
    try {
      await loadScript('/assets/js/components/dashboard-builder.js');
    } catch (e) { console.warn(e); return; }

    const stats = await fetchJson('/.netlify/functions/public-stats') || { users: 0, orders: 0, products: 0 };
    const recent = await fetchJson('/.netlify/functions/audit-logs?limit=5') || [];

    const widgets = [
      { id: 'w-stats', title: 'Statistics', content: `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="p-4 bg-white dark:bg-gray-800 rounded text-center"><div class="text-2xl font-bold">${stats.users}</div><div class="text-sm text-gray-400">Users</div></div>
          <div class="p-4 bg-white dark:bg-gray-800 rounded text-center"><div class="text-2xl font-bold">${stats.orders}</div><div class="text-sm text-gray-400">Orders</div></div>
          <div class="p-4 bg-white dark:bg-gray-800 rounded text-center"><div class="text-2xl font-bold">${stats.products}</div><div class="text-sm text-gray-400">Products</div></div>
        </div>` },
      { id: 'w-activity', title: 'Recent Activity', content: renderList(recent.map(r => (r && r.action ? `${r.action} — ${r.created_at || ''}` : JSON.stringify(r)))) },
      { id: 'w-quick', title: 'Quick Actions', content: `
        <div class="grid grid-cols-2 gap-2">
          <a href="users.html" class="btn p-2 bg-blue-600 text-white rounded">Manage Users</a>
          <a href="orders-review.html" class="btn p-2 bg-green-600 text-white rounded">Review Orders</a>
        </div>` }
      ,
      { id: 'w-lowstock', title: 'Low Stock', content: `
        <div id="low-stock-widget">
          <div id="low-stock-table" class="w-full"></div>
        </div>` },
      { id: 'w-stocktrend', title: 'Stock Trend', content: `
        <div class="p-2">
          <canvas id="stock-trend-canvas" height="160"></canvas>
        </div>` }
    ];

    try {
      new DashboardBuilder('admin-dashboard', { widgets, columns: 3, editable: true, storageKey: 'admin-dashboard-layout' });

      // Initialize richer widgets after a short delay to allow DashboardBuilder to render DOM
      setTimeout(async () => {
        // Low-stock table
        try {
          await loadScript('/assets/js/components/data-table.js');
          const low = await fetchJson('/.netlify/functions/low-stock?threshold=10') || [];
          new DataTable('low-stock-table', {
            data: low,
            columns: [
              { field: 'name', label: 'Product' },
              { field: 'stock_quantity', label: 'Stock', sortable: true }
            ],
            pageSize: 5,
            filterable: true,
            paginated: true
          });
        } catch (e) { console.warn('Low-stock table init failed', e); }

        // Stock trend chart (top low-stock items)
        try {
          await loadScript('https://cdn.jsdelivr.net/npm/chart.js');
          const low = await fetchJson('/.netlify/functions/low-stock?threshold=50') || [];
          const labels = low.slice(0,6).map(p => p.name);
          const data = low.slice(0,6).map(p => p.stock_quantity);
          const ctx = document.getElementById('stock-trend-canvas');
          if (ctx && window.Chart) {
            const primary = getCssVar('--token-color-primary', '#3b82f6');
            const text = getCssVar('--token-text-secondary', 'rgb(209, 213, 219)');
            const grid = getCssVar('--token-border-default', 'rgba(255,255,255,0.1)');
            stockTrendChart = new Chart(ctx.getContext('2d'), {
              type: 'bar',
              data: { labels, datasets: [{ label: 'Stock', data, backgroundColor: colorToRgba(primary, 0.7), borderColor: primary, borderWidth: 1 }] },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: text } } },
                scales: {
                  x: { ticks: { color: text }, grid: { color: colorToRgba(grid, 0.25) } },
                  y: { ticks: { color: text }, grid: { color: colorToRgba(grid, 0.25) }, beginAtZero: true }
                }
              }
            });
          }
        } catch (e) { console.warn('Stock trend chart init failed', e); }

      }, 300);

    } catch (e) { console.warn('Failed to init admin dashboard', e); }
  }

  async function initSharedBuilder() {
    const container = document.getElementById('dashboard-builder-container');
    if (!container) {return;}
    try { await loadScript('/assets/js/components/dashboard-builder.js'); } catch (e) { console.warn(e); return; }

    const stats = await fetchJson('/.netlify/functions/public-stats') || { users: 0, orders: 0, products: 0 };

    const widgets = [
      { id: 'w-overview', title: 'Overview', content: `<div class="p-3">Users: <strong>${stats.users}</strong><br/>Orders: <strong>${stats.orders}</strong></div>` },
      { id: 'w-alerts', title: 'Alerts', content: '<div class="p-3">No alerts</div>' }
    ];

    try { new DashboardBuilder('dashboard-builder-container', { widgets, columns: 2, editable: true, storageKey: 'shared-dashboards-layout' }); } catch (e) { console.warn('Failed to init shared dashboards', e); }
  }

  // Kick off in DOMContentLoaded
  if (document.readyState === 'loading') {document.addEventListener('DOMContentLoaded', () => { initAdminDashboard(); initSharedBuilder(); });} else { initAdminDashboard(); initSharedBuilder(); }

  try {
    window.addEventListener('theme:changed', applyStockTrendTheme);
  } catch (e) {
    // ignore
  }

})();

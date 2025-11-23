// Shared dashboard initialization helper
(function(){
  function loadScript(url){
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = url;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = (e) => reject(new Error('Failed to load ' + url));
      document.head.appendChild(s);
    });
  }

  async function fetchJson(path){
    try{
      const res = await fetch(path);
      if (!res.ok) return null;
      return await res.json();
    }catch(e){ return null; }
  }

  function renderList(items){
    if (!items || !items.length) return '<div class="text-sm text-gray-400">No items</div>';
    return '<ul class="space-y-2">' + items.map(it => `<li class="p-2 bg-gray-800 rounded">${typeof it === 'string' ? it : JSON.stringify(it)}</li>`).join('') + '</ul>';
  }

  async function initAdminDashboard(){
    const container = document.getElementById('admin-dashboard');
    if (!container) return;
    try{
      await loadScript('/assets/js/components/dashboard-builder.js');
    }catch(e){ console.warn(e); return; }

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

    try{
      const db = new DashboardBuilder('admin-dashboard', { widgets, columns: 3, editable: true, storageKey: 'admin-dashboard-layout' });

      // Initialize richer widgets after a short delay to allow DashboardBuilder to render DOM
      setTimeout(async () => {
        // Low-stock table
        try{
          await loadScript('/assets/js/components/data-table.js');
          const low = await fetchJson('/.netlify/functions/low-stock?threshold=10') || [];
          const table = new DataTable('low-stock-table', {
            data: low,
            columns: [
              { field: 'name', label: 'Product' },
              { field: 'stock_quantity', label: 'Stock', sortable: true }
            ],
            pageSize: 5,
            filterable: true,
            paginated: true
          });
        }catch(e){ console.warn('Low-stock table init failed', e); }

        // Stock trend chart (top low-stock items)
        try{
          await loadScript('https://cdn.jsdelivr.net/npm/chart.js');
          const low = await fetchJson('/.netlify/functions/low-stock?threshold=50') || [];
          const labels = low.slice(0,6).map(p => p.name);
          const data = low.slice(0,6).map(p => p.stock_quantity);
          const ctx = document.getElementById('stock-trend-canvas');
          if (ctx && window.Chart) {
            new Chart(ctx.getContext('2d'), {
              type: 'bar',
              data: { labels, datasets: [{ label: 'Stock', data, backgroundColor: 'rgba(59,130,246,0.7)' }] },
              options: { responsive: true, maintainAspectRatio: false }
            });
          }
        }catch(e){ console.warn('Stock trend chart init failed', e); }

      }, 300);

    }catch(e){ console.warn('Failed to init admin dashboard', e); }
  }

  async function initSharedBuilder(){
    const container = document.getElementById('dashboard-builder-container');
    if (!container) return;
    try{ await loadScript('/assets/js/components/dashboard-builder.js'); }catch(e){ console.warn(e); return; }

    const stats = await fetchJson('/.netlify/functions/public-stats') || { users: 0, orders: 0, products: 0 };

    const widgets = [
      { id: 'w-overview', title: 'Overview', content: `<div class="p-3">Users: <strong>${stats.users}</strong><br/>Orders: <strong>${stats.orders}</strong></div>` },
      { id: 'w-alerts', title: 'Alerts', content: '<div class="p-3">No alerts</div>' }
    ];

    try{ new DashboardBuilder('dashboard-builder-container', { widgets, columns: 2, editable: true, storageKey: 'shared-dashboards-layout' }); }
    catch(e){ console.warn('Failed to init shared dashboards', e); }
  }

  // Kick off in DOMContentLoaded
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { initAdminDashboard(); initSharedBuilder(); });
  else { initAdminDashboard(); initSharedBuilder(); }

})();

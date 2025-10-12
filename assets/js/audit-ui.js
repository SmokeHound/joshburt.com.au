/*
 * Modular Audit Log UI
 * Responsibilities:
 *  - Lazy initialization (runs only if #audit-log-root present)
 *  - Fetch audit logs with server pagination (page,pageSize,q,action,startDate,endDate)
 *  - Client-side debounce for search input
 *  - Render table + pagination controls + summary counts
 *  - Export (JSON/CSV) + Clear (all or olderThanDays)
 *  - Graceful fallback if API fails
 */
(function(){
  const ROOT_ID = 'audit-log-root';
  if (!document.getElementById(ROOT_ID)) return; // Lazy mount

  const state = {
    page: 1,
    pageSize: 25,
    q: '',
    action: '',
    startDate: '',
    endDate: '',
    loading: false,
    total: 0,
    totalPages: 0,
    data: []
  };

  // Create base structure if none
  function ensureStructure(){
    const root = document.getElementById(ROOT_ID);
    if (root.dataset.initialized) return root;
    root.innerHTML = `
      <div class="widget-primary rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div class="flex flex-col md:flex-row gap-2 md:items-end md:justify-between">
          <div class="flex flex-wrap gap-2 items-center">
            <input id="audit-search" placeholder="Search..." class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm" />
            <select id="audit-action" class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm">
              <option value="">All Actions</option>
              <option value="user_login">User Login</option>
              <option value="user_logout">User Logout</option>
              <option value="settings_changed">Settings Changed</option>
              <option value="theme_change">Theme Change</option>
              <option value="security_change">Security Change</option>
              <option value="error_occurred">Error</option>
            </select>
            <input type="date" id="audit-start" class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm" />
            <input type="date" id="audit-end" class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm" />
            <select id="audit-page-size" class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm">
              <option value="10">10</option>
              <option value="25" selected>25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <div class="flex flex-wrap gap-2">
            <button id="audit-export-json" class="btn-neon-blue px-3 py-1 rounded text-sm">Export JSON</button>
            <button id="audit-export-csv" class="btn-neon-blue px-3 py-1 rounded text-sm">Export CSV</button>
            <button id="audit-clear" class="btn-neon-pink px-3 py-1 rounded text-sm">Clear</button>
          </div>
        </div>
        <div id="audit-summary" class="text-xs text-gray-400"></div>
        <div class="overflow-auto border border-gray-200 dark:border-gray-700 rounded" id="audit-table-wrapper">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-100 dark:bg-gray-800 text-left">
              <tr>
                <th class="p-2">Time</th>
                <th class="p-2">User</th>
                <th class="p-2">Action</th>
                <th class="p-2">Details</th>
                <th class="p-2">IP</th>
              </tr>
            </thead>
            <tbody id="audit-tbody" class="divide-y divide-gray-200 dark:divide-gray-700"></tbody>
          </table>
        </div>
        <div id="audit-pagination" class="flex flex-wrap gap-2 items-center justify-between pt-2 border-t border-gray-800"></div>
      </div>`;
    root.dataset.initialized = 'true';
    return root;
  }

  function formatDate(iso){
    try { return new Date(iso).toLocaleString(); } catch(e){ return iso || ''; }
  }

  async function fetchLogs(){
    state.loading = true; renderLoading();
    const params = new URLSearchParams();
    params.set('page', state.page);
    params.set('pageSize', state.pageSize);
    if (state.q) params.set('q', state.q);
    if (state.action) params.set('action', state.action);
    if (state.startDate) params.set('startDate', state.startDate);
    if (state.endDate) params.set('endDate', state.endDate);
    try {
      const res = await fetch('/.netlify/functions/audit-logs?' + params.toString());
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      // Expect { data, pagination }
      if (Array.isArray(json)) {
        state.data = json;
        state.total = json.length;
        state.totalPages = 1;
      } else {
        state.data = json.data || [];
        state.total = (json.pagination && json.pagination.total) || state.data.length;
        state.totalPages = (json.pagination && json.pagination.totalPages) || 1;
      }
    } catch (e) {
      state.data = [];
      state.error = e.message;
    } finally {
      state.loading = false;
      renderTable();
      renderPagination();
      renderSummary();
    }
  }

  function renderLoading(){
    const tbody = document.getElementById('audit-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Loading...</td></tr>';
  }

  function renderTable(){
    const tbody = document.getElementById('audit-tbody');
    if (!tbody) return;
    if (state.error) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">${state.error}</td></tr>`;
      return;
    }
    if (!state.data.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No audit log entries</td></tr>';
      return;
    }
    tbody.innerHTML = state.data.map(row => {
      let details = row.details;
      if (details && details.length > 200) details = details.slice(0,197) + '…';
      return `<tr>
        <td class="p-2 align-top whitespace-nowrap">${formatDate(row.created_at || row.timestamp)}</td>
        <td class="p-2 align-top">${row.user_id || row.userId || ''}</td>
        <td class="p-2 align-top font-medium">${row.action}</td>
        <td class="p-2 align-top max-w-sm break-words">${escapeHtml(details||'')}</td>
        <td class="p-2 align-top whitespace-nowrap text-xs">${row.ip_address || row.ip || ''}</td>
      </tr>`;
    }).join('');
  }

  function renderPagination(){
    const el = document.getElementById('audit-pagination');
    if (!el) return;
    if (state.totalPages <= 1) { el.innerHTML = `<div class="text-xs text-gray-400">Showing ${state.data.length} of ${state.total}</div>`; return; }
    const prevDisabled = state.page <= 1 ? 'opacity-50 pointer-events-none' : '';
    const nextDisabled = state.page >= state.totalPages ? 'opacity-50 pointer-events-none' : '';
    el.innerHTML = `
      <div class="flex gap-2 items-center">
        <button id="audit-prev" class="px-2 py-1 text-sm rounded bg-gray-800 ${prevDisabled}">Prev</button>
        <span class="text-xs">Page ${state.page} / ${state.totalPages}</span>
        <button id="audit-next" class="px-2 py-1 text-sm rounded bg-gray-800 ${nextDisabled}">Next</button>
      </div>
      <div class="text-xs text-gray-400">Total: ${state.total}</div>`;
    const prevBtn = document.getElementById('audit-prev');
    const nextBtn = document.getElementById('audit-next');
    if (prevBtn) prevBtn.onclick = ()=>{ if (state.page>1){ state.page--; fetchLogs(); } };
    if (nextBtn) nextBtn.onclick = ()=>{ if (state.page<state.totalPages){ state.page++; fetchLogs(); } };
  }

  function renderSummary(){
    const el = document.getElementById('audit-summary');
    if (!el) return;
    el.textContent = `Showing ${state.data.length} of ${state.total} total audit events`;
  }

  function exportData(format){
    const params = new URLSearchParams();
    if (format === 'csv') params.set('format', 'csv');
    // Export large subset (no pagination) - respect search filters
    if (state.q) params.set('q', state.q);
    if (state.action) params.set('action', state.action);
    if (state.startDate) params.set('startDate', state.startDate);
    if (state.endDate) params.set('endDate', state.endDate);
    params.set('limit', 1000);
    const url = '/.netlify/functions/audit-logs?' + params.toString();
    fetch(url).then(async res => {
      if (!res.ok) throw new Error('Failed export');
      if (format === 'csv') {
        const text = await res.text();
        downloadBlob(new Blob([text], { type: 'text/csv' }), 'audit-log.csv');
      } else {
        const json = await res.json();
        downloadBlob(new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }), 'audit-log.json');
      }
    }).catch(()=>{/* ignore */});
  }

  function clearLogs(){
    if (!confirm('Clear all audit logs? This cannot be undone.')) return;
    fetch('/.netlify/functions/audit-logs', { method: 'DELETE' })
      .then(()=>fetchLogs())
      .catch(()=>{});
  }

  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function escapeHtml(str){
    return str.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function debounce(fn, ms){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; }

  function wireEvents(){
    const search = document.getElementById('audit-search');
    const action = document.getElementById('audit-action');
    const start = document.getElementById('audit-start');
    const end = document.getElementById('audit-end');
    const pageSize = document.getElementById('audit-page-size');
    const expJson = document.getElementById('audit-export-json');
    const expCsv = document.getElementById('audit-export-csv');
    const clearBtn = document.getElementById('audit-clear');

    if (search) search.addEventListener('input', debounce(e=>{ state.q = e.target.value.trim(); state.page=1; fetchLogs(); }, 300));
    if (action) action.addEventListener('change', e=>{ state.action = e.target.value; state.page=1; fetchLogs(); });
    if (start) start.addEventListener('change', e=>{ state.startDate = e.target.value; state.page=1; fetchLogs(); });
    if (end) end.addEventListener('change', e=>{ state.endDate = e.target.value; state.page=1; fetchLogs(); });
    if (pageSize) pageSize.addEventListener('change', e=>{ state.pageSize = parseInt(e.target.value); state.page=1; fetchLogs(); });
    if (expJson) expJson.addEventListener('click', ()=>exportData('json'));
    if (expCsv) expCsv.addEventListener('click', ()=>exportData('csv'));
    if (clearBtn) clearBtn.addEventListener('click', clearLogs);
  }

  // Initialize
  ensureStructure();
  wireEvents();
  fetchLogs();
})();

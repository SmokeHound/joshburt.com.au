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
    method: '',
    path: '',
    requestId: '',
    userId: '',
    startDate: '',
    endDate: '',
    truncateLen: 120,
    loading: false,
    total: 0,
    totalPages: 0,
    data: [],
    usersById: {}
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
            <input id="audit-action" placeholder="Action (e.g. auth.login_success)" class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm" />
            <input id="audit-method" placeholder="Method (GET/POST)" class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm w-28" />
            <input id="audit-path" placeholder="Path (/..../orders)" class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm w-48" />
            <input id="audit-request-id" placeholder="Request ID" class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm w-48" />
            <input id="audit-user-id" placeholder="User ID" class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm w-32" />
            <input type="date" id="audit-start" class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm" />
            <input type="date" id="audit-end" class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm" />
            <select id="audit-page-size" class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm">
              <option value="10">10</option>
              <option value="25" selected>25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <input id="audit-truncate" type="number" min="40" max="1000" step="10" class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm w-24" title="Preview length" placeholder="Preview" />
          </div>
          <div class="flex flex-wrap gap-2 items-center mt-2">
            <button id="audit-chip-24h" class="px-2 py-1 text-xs rounded bg-gray-800">24h</button>
            <button id="audit-chip-7d" class="px-2 py-1 text-xs rounded bg-gray-800">7d</button>
            <button id="audit-chip-30d" class="px-2 py-1 text-xs rounded bg-gray-800">30d</button>
            <button id="audit-chip-clear" class="px-2 py-1 text-xs rounded bg-gray-800">Clear</button>
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
    if (state.method) params.set('method', state.method);
    if (state.path) params.set('path', state.path);
    if (state.requestId) params.set('requestId', state.requestId);
    if (state.userId) params.set('userId', state.userId);
    if (state.startDate) params.set('startDate', state.startDate);
    if (state.endDate) params.set('endDate', state.endDate);
    try {
      const FN_BASE = window.FN_BASE || '/.netlify/functions';
      const res = await fetch(`${FN_BASE}/audit-logs?` + params.toString());
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
    tbody.innerHTML = state.data.map((row, idx) => {
      const created = formatDate(row.created_at || row.timestamp);
      const uid = row.user_id || row.userId || '';
      const mapped = (uid && state.usersById[String(uid)]) || null;
      const disp = mapped ? `${mapped} (${uid})` : (uid || '');
      const userHtml = uid
        ? `<a href="profile.html?userId=${encodeURIComponent(String(uid))}" class="text-blue-400 hover:underline">${escapeHtml(disp)}</a>`
        : '';
      const action = row.action || '';
      const ip = row.ip_address || row.ip || '';

      // Build details view: parse JSON if possible
      let raw = row.details;
      let parsed = null;
      if (raw && typeof raw === 'string') {
        try { parsed = JSON.parse(raw); } catch (_) { /* not JSON */ }
      } else if (raw && typeof raw === 'object') {
        parsed = raw;
        raw = JSON.stringify(raw);
      }

      // Summarize chips
      let chipsHtml = '';
      if (parsed) {
        const m = parsed.method ? String(parsed.method).toUpperCase() : '';
        const p = parsed.path || '';
        const rid = parsed.requestId || '';
        if (m) chipsHtml += `<span class="inline-block text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 mr-1">${escapeHtml(m)}</span>`;
        if (p) chipsHtml += `<span class="inline-block text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 mr-1">${escapeHtml(p.length>40 ? p.slice(0,37)+'…' : p)}</span>`;
        if (rid) chipsHtml += `<span class="inline-block text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 mr-1">${escapeHtml(String(rid).slice(0,12))}</span>`;
      }

      // Collapsible pretty JSON or raw text
      let pretty = '';
      if (parsed) {
        pretty = JSON.stringify(parsed, null, 2);
      } else if (typeof raw === 'string') {
        pretty = raw;
      } else {
        pretty = '';
      }

      const tlen = Math.max(40, Math.min(1000, parseInt(state.truncateLen) || 120));
      const truncated = (pretty && pretty.length > tlen) ? (pretty.slice(0, tlen - 3) + '…') : pretty;
      const baseId = `audit-${idx}`;
      const boxId = `${baseId}-box`;
      const prePrettyId = `${baseId}-pretty`;
      const preRawId = `${baseId}-raw`;

      return `<tr>
        <td class="p-2 align-top whitespace-nowrap">${created}</td>
  <td class="p-2 align-top">${userHtml}</td>
        <td class="p-2 align-top font-medium">${action}</td>
        <td class="p-2 align-top max-w-sm break-words">
          ${chipsHtml ? `<div class="mb-1">${chipsHtml}</div>` : ''}
          <div class="text-xs text-gray-300 dark:text-gray-400 break-words">${escapeHtml(truncated || '')}</div>
          ${(pretty || raw) ? `
          <div class="mt-1 flex gap-2">
            <button class="audit-toggle px-2 py-0.5 text-xs rounded bg-gray-800" data-target="${boxId}">View</button>
            ${parsed ? `<button class="audit-mode px-2 py-0.5 text-xs rounded bg-gray-800" data-base="${baseId}" data-mode="pretty">Raw</button>` : ''}
            <button class="audit-copy px-2 py-0.5 text-xs rounded bg-gray-800" data-base="${baseId}">Copy</button>
          </div>
          <div id="${boxId}" class="hidden mt-2">
            ${parsed ? `<pre id="${prePrettyId}" class="mt-2 p-2 bg-gray-900 text-gray-100 rounded text-[11px] overflow-auto max-h-48">${escapeHtml(pretty)}</pre>` : ''}
            <pre id="${preRawId}" class="${parsed ? 'hidden ' : ''}mt-2 p-2 bg-gray-900 text-gray-100 rounded text-[11px] overflow-auto max-h-48">${escapeHtml(raw || '')}</pre>
          </div>
          ` : ''}
        </td>
        <td class="p-2 align-top whitespace-nowrap text-xs">${ip}</td>
      </tr>`;
    }).join('');

    // Row actions: toggle/copy via event delegation
    tbody.onclick = (e) => {
      const t = e.target;
      if (t && t.classList.contains('audit-toggle')) {
        const boxId2 = t.getAttribute('data-target');
        const box = document.getElementById(boxId2);
        if (box) {
          if (box.classList.contains('hidden')) { box.classList.remove('hidden'); t.textContent = 'Hide'; }
          else { box.classList.add('hidden'); t.textContent = 'View'; }
        }
      } else if (t && t.classList.contains('audit-mode')) {
        const base = t.getAttribute('data-base');
        const mode = t.getAttribute('data-mode') || 'pretty';
        const preP = document.getElementById(`${base}-pretty`);
        const preR = document.getElementById(`${base}-raw`);
        if (preP && preR) {
          if (mode === 'pretty') {
            // Switch to raw
            preP.classList.add('hidden');
            preR.classList.remove('hidden');
            t.setAttribute('data-mode', 'raw');
            t.textContent = 'Pretty';
          } else {
            // Switch to pretty
            preR.classList.add('hidden');
            preP.classList.remove('hidden');
            t.setAttribute('data-mode', 'pretty');
            t.textContent = 'Raw';
          }
        }
      } else if (t && t.classList.contains('audit-copy')) {
        const base = t.getAttribute('data-base');
        let text = '';
        if (base) {
          const preP = document.getElementById(`${base}-pretty`);
          const preR = document.getElementById(`${base}-raw`);
          const visible = preR && !preR.classList.contains('hidden') ? preR : preP;
          text = visible ? (visible.textContent || '') : '';
        }
        if (text) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(()=>{});
          } else {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text; document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); } catch(err) { /* no-op */ }
            document.body.removeChild(ta);
          }
        }
      }
    };
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
    if (state.method) params.set('method', state.method);
    if (state.path) params.set('path', state.path);
    if (state.requestId) params.set('requestId', state.requestId);
    if (state.userId) params.set('userId', state.userId);
    if (state.startDate) params.set('startDate', state.startDate);
    if (state.endDate) params.set('endDate', state.endDate);
    params.set('limit', 1000);
    const FN_BASE = window.FN_BASE || '/.netlify/functions';
    const url = `${FN_BASE}/audit-logs?` + params.toString();
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
    const FN_BASE = window.FN_BASE || '/.netlify/functions';
    fetch(`${FN_BASE}/audit-logs`, { method: 'DELETE' })
      .then(()=>fetchLogs())
      .catch(()=>{});
  }

  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function escapeHtml(input){
    try {
      if (input === null || input === undefined) return '';
      let str = input;
      // If it's an object, stringify; otherwise coerce to string
      if (typeof str === 'object') {
        try { str = JSON.stringify(str); }
        catch (_) { str = String(str); }
      } else if (typeof str !== 'string') {
        str = String(str);
      }
      return str.replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]); });
    } catch(_) {
      // Fallback to empty string on any unexpected error
      return '';
    }
  }

  function debounce(fn, ms){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; }

  function formatYMD(d){
    try { return d.toISOString().slice(0,10); } catch(e){ return ''; }
  }

  async function fetchUsersMap(){
    try {
      const FN_BASE = window.FN_BASE || '/.netlify/functions';
      const res = await fetch(`${FN_BASE}/users`);
      if (!res.ok) return;
      const json = await res.json();
      const arr = (json && json.users) || [];
      const map = {};
      arr.forEach(u=>{
        const id = String(u.id || u.user_id || u.uid || '');
        if (!id) return;
        map[id] = u.username || u.name || `User #${id}`;
      });
      state.usersById = map;
      renderTable(); // refresh names in current page
    } catch(_) { /* ignore */ }
  }

  function wireEvents(){
    const search = document.getElementById('audit-search');
    const action = document.getElementById('audit-action');
    const method = document.getElementById('audit-method');
    const path = document.getElementById('audit-path');
    const requestId = document.getElementById('audit-request-id');
    const userId = document.getElementById('audit-user-id');
    const truncate = document.getElementById('audit-truncate');
    const start = document.getElementById('audit-start');
    const end = document.getElementById('audit-end');
    const pageSize = document.getElementById('audit-page-size');
    const chip24h = document.getElementById('audit-chip-24h');
    const chip7d = document.getElementById('audit-chip-7d');
    const chip30d = document.getElementById('audit-chip-30d');
    const chipClear = document.getElementById('audit-chip-clear');
    const expJson = document.getElementById('audit-export-json');
    const expCsv = document.getElementById('audit-export-csv');
    const clearBtn = document.getElementById('audit-clear');

    if (search) search.addEventListener('input', debounce(e=>{ state.q = e.target.value.trim(); state.page=1; fetchLogs(); }, 300));
    if (action) action.addEventListener('input', debounce(e=>{ state.action = e.target.value.trim(); state.page=1; fetchLogs(); }, 300));
    if (method) method.addEventListener('input', debounce(e=>{ state.method = e.target.value.trim(); state.page=1; fetchLogs(); }, 300));
    if (path) path.addEventListener('input', debounce(e=>{ state.path = e.target.value.trim(); state.page=1; fetchLogs(); }, 300));
    if (requestId) requestId.addEventListener('input', debounce(e=>{ state.requestId = e.target.value.trim(); state.page=1; fetchLogs(); }, 300));
    if (userId) userId.addEventListener('input', debounce(e=>{ state.userId = e.target.value.trim(); state.page=1; fetchLogs(); }, 300));
    if (truncate) {
      // Initialize from state/localStorage
      try {
        const saved = localStorage.getItem('audit.truncateLen');
        if (saved) state.truncateLen = parseInt(saved) || state.truncateLen;
      } catch(err){ /* no-op */ }
      truncate.value = state.truncateLen;
      truncate.addEventListener('input', debounce(e=>{
        const v = parseInt(e.target.value);
        if (!isNaN(v)) {
          state.truncateLen = Math.max(40, Math.min(1000, v));
          try { localStorage.setItem('audit.truncateLen', String(state.truncateLen)); } catch(err){ /* no-op */ }
          renderTable(); // no refetch needed
        }
      }, 200));
    }
    if (start) start.addEventListener('change', e=>{ state.startDate = e.target.value; state.page=1; fetchLogs(); });
    if (end) end.addEventListener('change', e=>{ state.endDate = e.target.value; state.page=1; fetchLogs(); });
    if (pageSize) pageSize.addEventListener('change', e=>{ state.pageSize = parseInt(e.target.value); state.page=1; fetchLogs(); });
    function setRangeDays(days){
      const endD = new Date();
      const startD = new Date();
      startD.setDate(endD.getDate() - (days - 1));
      state.startDate = formatYMD(startD);
      state.endDate = formatYMD(endD);
      if (start) start.value = state.startDate;
      if (end) end.value = state.endDate;
      state.page=1; fetchLogs();
    }
    if (chip24h) chip24h.addEventListener('click', ()=> setRangeDays(1));
    if (chip7d) chip7d.addEventListener('click', ()=> setRangeDays(7));
    if (chip30d) chip30d.addEventListener('click', ()=> setRangeDays(30));
    if (chipClear) chipClear.addEventListener('click', ()=>{ state.startDate=''; state.endDate=''; if (start) start.value=''; if (end) end.value=''; state.page=1; fetchLogs(); });
    if (expJson) expJson.addEventListener('click', ()=>exportData('json'));
    if (expCsv) expCsv.addEventListener('click', ()=>exportData('csv'));
    if (clearBtn) clearBtn.addEventListener('click', clearLogs);
  }

  // Initialize
  ensureStructure();
  wireEvents();
  fetchUsersMap();
  fetchLogs();
})();

/*
 * Modular Audit Log UI
 * Responsibilities:
 *  - Lazy initialization (runs only if #audit-log-root present)
 *  - Fetch audit logs with server pagination (page,pageSize,q,startDate,endDate)
 *  - Client-side debounce for search input
 *  - Render table + pagination controls + summary counts
 *  - Export (JSON/CSV) + Clear (all or olderThanDays)
 *  - Graceful fallback if API fails
 */
(function () {
  const ROOT_ID = 'audit-log-root';
  if (!document.getElementById(ROOT_ID)) {
    return;
  } // Lazy mount

  const state = {
    page: 1,
    pageSize: 25,
    q: '',
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
  function ensureStructure() {
    const root = document.getElementById(ROOT_ID);
    if (root.dataset.initialized) {
      return root;
    }
    root.innerHTML = `
      <div class="widget-primary rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div class="flex flex-col md:flex-row gap-2 md:items-end md:justify-between">
          <div class="flex flex-wrap gap-2 items-center">
            <input id="audit-search" placeholder="Search..." class="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm" />
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
    // Modal for viewing full details
    const modalHtml = `
      <div id="audit-detail-modal" class="modal-overlay hidden">
        <div class="modal-content max-w-3xl">
          <div class="modal-header">
            <h3 class="text-lg font-semibold text-gray-100">Audit Detail</h3>
            <div class="flex gap-2">
              <button id="audit-modal-mode" class="btn-neon-blue px-3 py-1 rounded text-sm">Raw</button>
              <button id="audit-modal-copy" class="btn-neon-blue px-3 py-1 rounded text-sm">Copy</button>
              <button id="audit-modal-close" class="btn-neon-pink px-3 py-1 rounded text-sm">Close</button>
            </div>
          </div>
          <div class="modal-body">
            <div class="overflow-auto max-h-[60vh]">
              <pre id="audit-modal-pretty" class="hidden p-2 bg-gray-900 text-gray-100 rounded text-[12px] whitespace-pre-wrap"></pre>
              <pre id="audit-modal-raw" class="p-2 bg-gray-900 text-gray-100 rounded text-[12px] whitespace-pre-wrap hidden"></pre>
            </div>
          </div>
        </div>
      </div>`;
    root.insertAdjacentHTML('beforeend', modalHtml);
    root.dataset.initialized = 'true';
    return root;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch (e) {
      return iso || '';
    }
  }

  function formatAction(action) {
    if (!action || typeof action !== 'string') {
      return '';
    }

    // Trim whitespace
    action = action.trim();
    if (action.length === 0) {
      return '';
    }

    // Convert snake_case, camelCase, and kebab-case to readable text
    let pretty = action
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to space
      .replace(/_/g, ' ') // snake_case to space
      .replace(/-/g, ' ') // kebab-case to space
      .replace(/\./g, ' ') // dot notation to space
      .toLowerCase();

    // Capitalize first letter of each word
    pretty = pretty
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return pretty || action;
  }

  // Get emoji icon for action type
  function getActionIcon(action) {
    const a = String(action || '').toLowerCase();
    if (a.includes('page.visit') || a.includes('page_visit')) {return '📄';}
    if (a.includes('login')) {return '🔐';}
    if (a.includes('logout')) {return '🚪';}
    if (a.includes('order')) {return '🧾';}
    if (a.includes('product')) {return '📦';}
    if (a.includes('user')) {return '👤';}
    if (a.includes('settings')) {return '⚙️';}
    if (a.includes('filter')) {return '🔧';}
    if (a.includes('consumable')) {return '🛢️';}
    if (a.includes('inventory')) {return '📊';}
    if (a.includes('create') || a.includes('add')) {return '➕';}
    if (a.includes('update') || a.includes('edit')) {return '✏️';}
    if (a.includes('delete') || a.includes('remove')) {return '🗑️';}
    return '•';
  }

  async function fetchLogs() {
    state.loading = true;
    state.error = null; // Clear any previous errors
    renderLoading();
    const params = new URLSearchParams();
    params.set('page', state.page);
    params.set('pageSize', state.pageSize);
    if (state.q) {
      params.set('q', state.q);
    }
    if (state.startDate) {
      params.set('startDate', state.startDate);
    }
    if (state.endDate) {
      params.set('endDate', state.endDate);
    }
    try {
      const FN_BASE = window.FN_BASE || '/.netlify/functions';
      const url = `${FN_BASE}/audit-logs?` + params.toString();
      const res = await (window.authFetch ? window.authFetch(url) : fetch(url));
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Authentication required. Please log in as an admin to view audit logs.');
        }
        throw new Error(`Failed to fetch audit logs (${res.status})`);
      }
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

  function renderLoading() {
    const tbody = document.getElementById('audit-tbody');
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="p-4 text-center text-gray-500">Loading...</td></tr>';
    }
  }

  function renderTable() {
    const tbody = document.getElementById('audit-tbody');
    if (!tbody) {
      return;
    }
    if (state.error) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">${escapeHtml(state.error)}</td></tr>`;
      return;
    }
    if (!state.data.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="p-4 text-center text-gray-500">No audit log entries</td></tr>';
      return;
    }
    tbody.innerHTML = state.data
      .map((row, idx) => {
        const created = formatDate(row.created_at || row.timestamp);
        const uid = row.user_id || row.userId || '';
        const mapped = (uid && state.usersById[String(uid)]) || null;
        const disp = mapped ? `${mapped} (${uid})` : uid || '';
        const userHtml = uid
          ? `<a href="profile.html?userId=${encodeURIComponent(String(uid))}" class="text-blue-400 hover:underline">${escapeHtml(disp)}</a>`
          : '';
        const action = row.action || '';
        const formattedAction = formatAction(action);
        const actionIconEmoji = getActionIcon(action);
        const ip = row.ip_address || row.ip || '';

        // Build details view: parse JSON if possible
        let raw = row.details;
        let parsed = null;
        if (raw && typeof raw === 'string') {
          try {
            parsed = JSON.parse(raw);
          } catch (_) {
            /* not JSON */
          }
        } else if (raw && typeof raw === 'object') {
          parsed = raw;
          raw = JSON.stringify(raw);
        }

        // Summarize chips
        let chipsHtml = '';
        const isPageVisit = String(action).toLowerCase().includes('page.visit');
        if (parsed) {
          const m = parsed.method ? String(parsed.method).toUpperCase() : '';
          const p = parsed.path || '';
          const rid = parsed.requestId || '';
          const pageTitle = parsed.title || '';

          // For page visits, show page title prominently
          if (isPageVisit && pageTitle) {
            chipsHtml += `<span class="inline-block text-[10px] px-2 py-0.5 rounded bg-blue-600 text-white mr-1" title="Page Title">${escapeHtml(pageTitle.length > 30 ? pageTitle.slice(0, 27) + '…' : pageTitle)}</span>`;
          }

          if (m) {
            let methodColor = 'bg-gray-700';
            if (m === 'GET') {
              methodColor = 'bg-green-700';
            } else if (m === 'POST') {
              methodColor = 'bg-blue-700';
            } else if (m === 'PUT') {
              methodColor = 'bg-yellow-700';
            } else if (m === 'PATCH') {
              methodColor = 'bg-orange-700';
            } else if (m === 'DELETE') {
              methodColor = 'bg-red-700';
            }
            chipsHtml += `<span class="inline-block text-[10px] px-2 py-0.5 rounded text-white ${methodColor} mr-1">${escapeHtml(m)}</span>`;
          }
          if (p) {
            chipsHtml += `<span class="inline-block text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 mr-1">${escapeHtml(p.length > 40 ? p.slice(0, 37) + '…' : p)}</span>`;
          }
          if (rid) {
            chipsHtml += `<span class="inline-block text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 mr-1">${escapeHtml(String(rid).slice(0, 12))}</span>`;
          }
        }

        // Create hidden DOM nodes for pretty and raw JSON
        const base = `audit-${idx}`;
        let hiddenPretty = '';
        let hiddenRaw = '';

        if (parsed && typeof parsed === 'object') {
          // Build pretty summary with key: value lines (truncate long values to ~240 chars)
          const keys = Object.keys(parsed);
          const prettyLines = keys
            .map(key => {
              const val = parsed[key];
              let valStr = '';
              if (val === null || val === undefined) {
                valStr = String(val);
              } else if (typeof val === 'object') {
                valStr = JSON.stringify(val);
              } else {
                valStr = String(val);
              }
              // Truncate long values to ~240 chars
              if (valStr.length > 240) {
                valStr = valStr.slice(0, 237) + '...';
              }
              return `${key}: ${valStr}`;
            })
            .join('\n');
          hiddenPretty = `<pre id="${base}-pretty" class="hidden" data-content="pretty">${escapeHtml(prettyLines)}</pre>`;

          // Raw JSON block
          const rawJson = JSON.stringify(parsed, null, 2);
          hiddenRaw = `<pre id="${base}-raw" class="hidden" data-content="raw">${escapeHtml(rawJson)}</pre>`;
        } else if (typeof raw === 'string' && raw) {
          // If not parsed, use raw string for both
          hiddenPretty = `<pre id="${base}-pretty" class="hidden" data-content="pretty">${escapeHtml(raw)}</pre>`;
          hiddenRaw = `<pre id="${base}-raw" class="hidden" data-content="raw">${escapeHtml(raw)}</pre>`;
        }

        // Build details / chips section: put Details button inline next to chips when chips exist
        let detailsPart = '';
        if (hiddenPretty || hiddenRaw) {
          if (chipsHtml) {
            // Details button with same height as chips (py-0.5)
            detailsPart =
              '<div class="mb-1 flex items-center gap-1">' +
              chipsHtml +
              '<button class="audit-open-modal px-2 py-0.5 text-[10px] rounded bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 ml-1" data-base="' +
              base +
              '">Details</button></div>';
          } else {
            // Standalone Details button
            detailsPart =
              '<div class="mb-1"><button class="audit-open-modal px-2 py-0.5 text-[10px] rounded bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400" data-base="' +
              base +
              '">Details</button></div>';
          }
        } else {
          detailsPart = chipsHtml ? '<div class="mb-1">' + chipsHtml + '</div>' : '';
        }

        return `<tr>
        <td class="p-2 align-top whitespace-nowrap">${created}</td>
        <td class="p-2 align-top">${userHtml}</td>
        <td class="p-2 align-top font-medium" title="${escapeHtml(action)}"><span class="mr-1">${actionIconEmoji}</span>${escapeHtml(formattedAction)}</td>
        <td class="p-2 align-top max-w-sm break-words">
          ${detailsPart}
          ${hiddenPretty}
          ${hiddenRaw}
        </td>
        <td class="p-2 align-top whitespace-nowrap text-xs">${ip}</td>
      </tr>`;
      })
      .join('');

    // Row actions: modal/mode/copy via event delegation
    tbody.onclick = e => {
      const t = e.target;
      if (t && t.classList.contains('audit-open-modal')) {
        const base = t.getAttribute('data-base');
        if (!base) {
          return;
        }

        // Find hidden content nodes by base ID
        const prettyNode = document.getElementById(`${base}-pretty`);
        const rawNode = document.getElementById(`${base}-raw`);

        if (!prettyNode && !rawNode) {
          return;
        }

        const modal = document.getElementById('audit-detail-modal');
        if (!modal) {
          return;
        }

        const modalPretty = document.getElementById('audit-modal-pretty');
        const modalRaw = document.getElementById('audit-modal-raw');
        const modeBtn = document.getElementById('audit-modal-mode');

        // Copy content from hidden nodes to modal
        if (modalPretty && prettyNode) {
          modalPretty.textContent = prettyNode.textContent || '';
        }
        if (modalRaw && rawNode) {
          modalRaw.textContent = rawNode.textContent || '';
        }

        // Show pretty by default if available
        if (prettyNode && modalPretty) {
          modalPretty.classList.remove('hidden');
          modalRaw.classList.add('hidden');
          if (modeBtn) {
            modeBtn.textContent = 'Raw';
          }
        } else if (rawNode && modalRaw) {
          modalRaw.classList.remove('hidden');
          modalPretty.classList.add('hidden');
          if (modeBtn) {
            modeBtn.textContent = 'Pretty';
          }
        }

        // Show modal with animation
        modal.classList.remove('hidden');
        return;
      } else if (t && t.classList.contains('audit-toggle')) {
        const boxId2 = t.getAttribute('data-target');
        const box = document.getElementById(boxId2);
        if (box) {
          if (box.classList.contains('hidden')) {
            box.classList.remove('hidden');
            t.textContent = 'Hide';
          } else {
            box.classList.add('hidden');
            t.textContent = 'View';
          }
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
          text = visible ? visible.textContent || '' : '';
        }
        if (text) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => {});
          } else {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try {
              document.execCommand('copy');
            } catch (err) {
              /* no-op */
            }
            document.body.removeChild(ta);
          }
        }
      }
    };
  }

  function renderPagination() {
    const el = document.getElementById('audit-pagination');
    if (!el) {
      return;
    }
    if (state.totalPages <= 1) {
      el.innerHTML = `<div class="text-xs text-gray-400">Showing ${state.data.length} of ${state.total}</div>`;
      return;
    }
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
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (state.page > 1) {
          state.page--;
          fetchLogs();
        }
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (state.page < state.totalPages) {
          state.page++;
          fetchLogs();
        }
      };
    }
  }

  function renderSummary() {
    const el = document.getElementById('audit-summary');
    if (!el) {
      return;
    }
    el.textContent = `Showing ${state.data.length} of ${state.total} total audit events`;
  }

  function exportData(format) {
    const params = new URLSearchParams();
    if (format === 'csv') {
      params.set('format', 'csv');
    }
    // Export large subset (no pagination) - respect search filters
    if (state.q) {
      params.set('q', state.q);
    }
    if (state.startDate) {
      params.set('startDate', state.startDate);
    }
    if (state.endDate) {
      params.set('endDate', state.endDate);
    }
    params.set('limit', 1000);
    const FN_BASE = window.FN_BASE || '/.netlify/functions';
    const url = `${FN_BASE}/audit-logs?` + params.toString();
    (window.authFetch ? window.authFetch(url) : fetch(url))
      .then(async res => {
        if (!res.ok) {
          throw new Error('Failed export');
        }
        if (format === 'csv') {
          const text = await res.text();
          downloadBlob(new Blob([text], { type: 'text/csv' }), 'audit-log.csv');
        } else {
          const json = await res.json();
          downloadBlob(
            new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }),
            'audit-log.json'
          );
        }
      })
      .catch(() => {
        /* ignore */
      });
  }

  function clearLogs() {
    if (!confirm('Clear all audit logs? This cannot be undone.')) {
      return;
    }
    const FN_BASE = window.FN_BASE || '/.netlify/functions';
    const url = `${FN_BASE}/audit-logs`;
    (window.authFetch
      ? window.authFetch(url, { method: 'DELETE' })
      : fetch(url, { method: 'DELETE' })
    )
      .then(() => fetchLogs())
      .catch(() => {});
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeHtml(input) {
    try {
      if (input === null || input === undefined) {
        return '';
      }
      let str = input;
      // If it's an object, stringify; otherwise coerce to string
      if (typeof str === 'object') {
        try {
          str = JSON.stringify(str);
        } catch (_) {
          str = String(str);
        }
      } else if (typeof str !== 'string') {
        str = String(str);
      }
      return str.replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    } catch (_) {
      // Fallback to empty string on any unexpected error
      return '';
    }
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function formatYMD(d) {
    try {
      return d.toISOString().slice(0, 10);
    } catch (e) {
      return '';
    }
  }

  async function fetchUsersMap() {
    try {
      const FN_BASE = window.FN_BASE || '/.netlify/functions';
      const url = `${FN_BASE}/users`;
      let res;
      if (window.authFetch) {
        res = await window.authFetch(url);
      } else {
        // Fallback: attach token manually if present
        const token = (window.getToken && window.getToken()) || null;
        const headers = token ? { Authorization: 'Bearer ' + token } : {};
        res = await fetch(url, { headers });
      }
      if (!res.ok) {
        return;
      }
      const json = await res.json();
      const arr = (json && json.users) || [];
      const map = {};
      arr.forEach(u => {
        const id = String(u.id || u.user_id || u.uid || '');
        if (!id) {
          return;
        }
        map[id] = u.username || u.name || `User #${id}`;
      });
      state.usersById = map;
      renderTable(); // refresh names in current page
    } catch (_) {
      /* ignore */
    }
  }

  function wireEvents() {
    const search = document.getElementById('audit-search');
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

    if (search) {
      search.addEventListener(
        'input',
        debounce(e => {
          state.q = e.target.value.trim();
          state.page = 1;
          fetchLogs();
        }, 300)
      );
    }
    if (truncate) {
      // Initialize from state/localStorage
      try {
        const saved = localStorage.getItem('audit.truncateLen');
        if (saved) {
          state.truncateLen = parseInt(saved) || state.truncateLen;
        }
      } catch (err) {
        /* no-op */
      }
      truncate.value = state.truncateLen;
      truncate.addEventListener(
        'input',
        debounce(e => {
          const v = parseInt(e.target.value);
          if (!isNaN(v)) {
            state.truncateLen = Math.max(40, Math.min(1000, v));
            try {
              localStorage.setItem('audit.truncateLen', String(state.truncateLen));
            } catch (err) {
              /* no-op */
            }
            renderTable(); // no refetch needed
          }
        }, 200)
      );
    }
    if (start) {
      start.addEventListener('change', e => {
        state.startDate = e.target.value;
        state.page = 1;
        fetchLogs();
      });
    }
    if (end) {
      end.addEventListener('change', e => {
        state.endDate = e.target.value;
        state.page = 1;
        fetchLogs();
      });
    }
    if (pageSize) {
      pageSize.addEventListener('change', e => {
        state.pageSize = parseInt(e.target.value);
        state.page = 1;
        fetchLogs();
      });
    }
    function setRangeDays(days) {
      const endD = new Date();
      const startD = new Date();
      startD.setDate(endD.getDate() - (days - 1));
      state.startDate = formatYMD(startD);
      state.endDate = formatYMD(endD);
      if (start) {
        start.value = state.startDate;
      }
      if (end) {
        end.value = state.endDate;
      }
      state.page = 1;
      fetchLogs();
    }
    if (chip24h) {
      chip24h.addEventListener('click', () => setRangeDays(1));
    }
    if (chip7d) {
      chip7d.addEventListener('click', () => setRangeDays(7));
    }
    if (chip30d) {
      chip30d.addEventListener('click', () => setRangeDays(30));
    }
    if (chipClear) {
      chipClear.addEventListener('click', () => {
        state.startDate = '';
        state.endDate = '';
        if (start) {
          start.value = '';
        }
        if (end) {
          end.value = '';
        }
        state.page = 1;
        fetchLogs();
      });
    }
    if (expJson) {
      expJson.addEventListener('click', () => exportData('json'));
    }
    if (expCsv) {
      expCsv.addEventListener('click', () => exportData('csv'));
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', clearLogs);
    }
    // Modal controls (close, overlay, mode toggle, copy, ESC)
    const modal = document.getElementById('audit-detail-modal');
    if (modal) {
      const closeBtn = document.getElementById('audit-modal-close');
      const modeBtn = document.getElementById('audit-modal-mode');
      const copyBtn = document.getElementById('audit-modal-copy');
      const modalPretty = document.getElementById('audit-modal-pretty');
      const modalRaw = document.getElementById('audit-modal-raw');
      function closeModal() {
        modal.classList.add('hidden');
        try {
          if (modalPretty) {
            modalPretty.textContent = '';
          }
          if (modalRaw) {
            modalRaw.textContent = '';
          }
        } catch (err) {
          /* ignore */
        }
      }
      if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
      }
      // Close on overlay click (click on modal-overlay itself, not its children)
      modal.addEventListener('click', e => {
        if (e.target === modal) {
          closeModal();
        }
      });
      if (modeBtn) {
        modeBtn.addEventListener('click', () => {
          if (!modalPretty || !modalRaw) {
            return;
          }
          if (modalPretty.classList.contains('hidden')) {
            modalPretty.classList.remove('hidden');
            modalRaw.classList.add('hidden');
            modeBtn.textContent = 'Raw';
          } else {
            modalPretty.classList.add('hidden');
            modalRaw.classList.remove('hidden');
            modeBtn.textContent = 'Pretty';
          }
        });
      }
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          try {
            let text = '';
            if (modalRaw && !modalRaw.classList.contains('hidden')) {
              text = modalRaw.textContent || '';
            } else if (modalPretty) {
              text = modalPretty.textContent || '';
            }
            if (text) {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).catch(() => {});
              } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                try {
                  document.execCommand('copy');
                } catch (err) {
                  /* no-op */
                }
                document.body.removeChild(ta);
              }
            }
          } catch (err) {
            /* ignore */
          }
        });
      }
      window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
          closeModal();
        }
      });
    }
  }

  // Initialize
  ensureStructure();
  wireEvents();

  // Wait for auth to be ready before fetching
  function init() {
    fetchUsersMap();
    fetchLogs();
  }

  // Check if we need to wait for auth initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, check if auth is ready
    if (window.authFetch || window.getToken) {
      init();
    } else {
      // Wait a bit for init-shared.js to set up authFetch
      setTimeout(init, 100);
    }
  }
})();

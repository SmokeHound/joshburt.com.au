(function () {
  const FN_BASE = window.FN_BASE || '/.netlify/functions';

  const el = id => document.getElementById(id);

  function formatIso(ts) {
    try {
      if (!ts) {
        return 'Unknown';
      }
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) {
        return String(ts);
      }
      return d.toLocaleString();
    } catch (_) {
      return String(ts || 'Unknown');
    }
  }

  function safeJsonStringify(obj) {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (_) {
      return String(obj);
    }
  }

  async function fetchJson(path) {
    const res = await fetch(`${FN_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = { raw: text };
    }

    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  function renderKeyValue(container, rows) {
    container.innerHTML = '';
    const dl = document.createElement('dl');
    dl.className = 'grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3';

    rows.forEach(({ label, value }) => {
      const dt = document.createElement('dt');
      dt.className = 'text-sm font-medium text-[color:var(--token-text-muted)]';
      dt.textContent = label;

      const dd = document.createElement('dd');
      dd.className = 'text-sm text-[color:var(--token-text-primary)] break-words';
      dd.textContent = value;

      dl.appendChild(dt);
      dl.appendChild(dd);
    });

    container.appendChild(dl);
  }

  function renderHealth(health) {
    const statusEl = el('sysinfo-health-status');
    const healthEl = el('sysinfo-health');
    const rawEl = el('sysinfo-health-raw');

    statusEl.textContent = health && health.status ? String(health.status) : 'Unknown';

    const rows = [
      { label: 'Status', value: String((health && health.status) || 'unknown') },
      { label: 'Environment', value: String((health && health.environment) || 'unknown') },
      { label: 'Version', value: String((health && health.version) || 'unknown') },
      { label: 'Timestamp', value: formatIso(health && health.timestamp) },
      {
        label: 'DB Status',
        value: String((health && health.database && health.database.status) || 'unknown')
      },
      {
        label: 'DB Latency (ms)',
        value: String((health && health.database && health.database.latencyMs) || 0)
      },
      {
        label: 'Process Uptime (s)',
        value: String((health && health.uptime && health.uptime.processSeconds) || 0)
      },
      {
        label: 'Container Uptime (s)',
        value: String((health && health.uptime && health.uptime.containerSeconds) || 0)
      },
      {
        label: 'Heap Used (MB)',
        value: String((health && health.memory && health.memory.heapUsed) || 0)
      },
      {
        label: 'Response Time (ms)',
        value: String((health && health.latencyMs) || 0)
      }
    ];

    renderKeyValue(healthEl, rows);
    rawEl.textContent = safeJsonStringify(health);
  }

  function renderPublicConfig(cfg) {
    const statusEl = el('sysinfo-config-status');
    const cfgEl = el('sysinfo-config');
    const rawEl = el('sysinfo-config-raw');

    const authDisabled = !!(cfg && cfg.auth && cfg.auth.disabled);
    const hasAuth0 = !!(cfg && cfg.auth0 && cfg.auth0.domain && cfg.auth0.clientId);

    statusEl.textContent = 'Loaded';

    const rows = [
      { label: 'Auth Disabled', value: authDisabled ? 'Yes' : 'No' },
      { label: 'Auth0 Enabled', value: hasAuth0 ? 'Yes' : 'No' },
      { label: 'Auth0 Domain', value: (cfg && cfg.auth0 && cfg.auth0.domain) || '—' },
      { label: 'Auth0 Client ID', value: (cfg && cfg.auth0 && cfg.auth0.clientId) || '—' },
      { label: 'Auth0 Audience', value: (cfg && cfg.auth0 && cfg.auth0.audience) || '—' }
    ];

    renderKeyValue(cfgEl, rows);
    rawEl.textContent = safeJsonStringify(cfg);
  }

  function renderClient() {
    const clientEl = el('sysinfo-client');
    const rows = [
      { label: 'Location', value: String(window.location && window.location.href) },
      { label: 'User Agent', value: String(navigator.userAgent || '—') },
      { label: 'Language', value: String(navigator.language || '—') },
      { label: 'Time', value: new Date().toLocaleString() }
    ];
    renderKeyValue(clientEl, rows);
  }

  function setLastUpdated() {
    const last = el('sysinfo-last-updated');
    if (!last) {
      return;
    }
    last.textContent = `Last updated: ${new Date().toLocaleString()}`;
  }

  async function init() {
    renderClient();

    try {
      const health = await fetchJson('/health');
      renderHealth(health);
    } catch (err) {
      el('sysinfo-health-status').textContent = 'Error';
      el('sysinfo-health').innerHTML = `<p class="text-sm text-[color:var(--token-text-muted)]">Failed to load health: ${String(err && err.message ? err.message : err)}</p>`;
      el('sysinfo-health-raw').textContent = safeJsonStringify({ error: String(err && err.message ? err.message : err) });
    }

    try {
      const cfg = await fetchJson('/public-config');
      renderPublicConfig(cfg);
    } catch (err) {
      el('sysinfo-config-status').textContent = 'Error';
      el('sysinfo-config').innerHTML = `<p class="text-sm text-[color:var(--token-text-muted)]">Failed to load public config: ${String(err && err.message ? err.message : err)}</p>`;
      el('sysinfo-config-raw').textContent = safeJsonStringify({ error: String(err && err.message ? err.message : err) });
    }

    setLastUpdated();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

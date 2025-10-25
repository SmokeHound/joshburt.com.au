// assets/js/init-shared.js
(function initShared(){
  // Compute a functions base that works on Netlify and non-Netlify hosts
  (function computeFnBase(){
    var defaultBase = '/.netlify/functions';
    try {
      var host = (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
      if (host.endsWith('netlify.app') || host === 'localhost') {
        window.FN_BASE = defaultBase;
      } else {
        window.FN_BASE = 'https://joshburt.netlify.app/.netlify/functions';
      }
    } catch (e) {
      window.FN_BASE = defaultBase;
    }
  })();
  const FN_BASE = window.FN_BASE; // Set the function base URL
  // Inject shared-config and shared-theme fragments
  function injectFragment(url, filterTagNames){
    return fetch(url).then(r=>r.text()).then(html=>{
      const t=document.createElement('div');
      t.innerHTML=html;
      Array.from(t.children).forEach(c=>{
        if(!filterTagNames || filterTagNames.includes(c.tagName)){
          document.head.appendChild(c.cloneNode(true));
        }
      });
    }).catch(()=>{});
  }
  function applyColors(){
    // Defer to ThemeManager if available (loaded from shared-theme.html)
    if(typeof window !== 'undefined' && window.Theme && typeof window.Theme.applyFromStorage === 'function'){
      try {
        window.Theme.applyFromStorage();
      } catch(e) { /* no-op: ThemeManager failed */ }
    } else {
      // Fallback: apply colors directly (if ThemeManager not loaded yet)
      try{
        const s=JSON.parse(localStorage.getItem('siteSettings')||'{}');
        document.documentElement.style.setProperty('--tw-color-primary', s.primaryColor || '#3b82f6');
        document.documentElement.style.setProperty('--tw-color-secondary', s.secondaryColor || '#10b981');
        document.documentElement.style.setProperty('--tw-color-accent', s.accentColor || '#8b5cf6');
        const theme=s.theme || localStorage.getItem('theme') || 'dark';
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.classList.toggle('light', theme === 'light');
      } catch(e) { /* no-op: invalid or missing settings */ }
    }
  }
  function registerSW(){
    if('serviceWorker' in navigator){
      window.addEventListener('load',()=>{
        navigator.serviceWorker.register('./sw.js').catch(()=>{});
      });
    }
  }
  // Start
  injectFragment('shared-config.html', ['LINK','STYLE','SCRIPT']).then(applyColors);
  injectFragment('shared-theme.html', ['SCRIPT']);
  // Load shared notifications (styles + logic) to centralize all notification UI/styling
  injectFragment('shared-notifications.html', ['STYLE','SCRIPT']);
  applyColors();
  registerSW();

  // Unified token accessor (accessToken only)
  window.getToken = function getToken(){
    try {
      return localStorage.getItem('accessToken') || null;
    } catch (_) {
      return null;
    }
  };

  // Unified refresh token accessor (refreshToken only)
  window.getRefreshToken = function getRefreshToken(){
    try {
      return localStorage.getItem('refreshToken') || null;
    } catch (_) {
      return null;
    }
  };

  // Fetch runtime config (auth disable flag) early
  (async function loadRuntimeFlags(){
    try {
      const base = window.FN_BASE || '/.netlify/functions';
      const res = await fetch(base + '/public-config');
      if (res.ok){
        const cfg = await res.json();
        if (cfg && cfg.auth && typeof cfg.auth.disabled === 'boolean') {
          window.AUTH_DISABLED = cfg.auth.disabled === true;
        }
      }
    } catch(_) { /* ignore config fetch failure */ }
    if (window.AUTH_DISABLED === true) {
      // Ensure a demo user exists for UI that expects a user
      try {
        const existing = JSON.parse(localStorage.getItem('user')||'null');
        if (!existing) {
          const demo = { id: 0, email: 'demo@local', name: 'Demo Admin', role: 'admin' };
          localStorage.setItem('user', JSON.stringify(demo));
          localStorage.setItem('currentUser', JSON.stringify(demo));
        }
      } catch(_) { /* ignore localStorage parse/set errors */ }
    }
  })();

  // Centralized authenticated fetch with auto-refresh and redirect throttling
  // Exposed globally as window.authFetch
  window.authFetch = async function authFetch(input, init){
    try {
      const FN_BASE = window.FN_BASE || '/.netlify/functions';
      const toUrl = (typeof input === 'string') ? input : (input && input.url) || '';
      let token = window.getToken();

      const makeInit = (tok) => {
        const base = init || {};
        const headers = Object.assign({}, base.headers || {});
        if (tok && !headers.Authorization) headers.Authorization = 'Bearer ' + tok;
        return Object.assign({}, base, { headers });
      };

      async function doFetch(tok){
        return fetch(toUrl, makeInit(tok));
      }

      let res = await doFetch(token);
      if (res.status !== 401 && res.status !== 403) return res;
      if (window.AUTH_DISABLED === true) return res;

      // If forbidden (insufficient role), don't redirect here; let caller decide
      if (res.status === 403) {
        return res;
      }

      // Fresh login loop guard: if login just happened, do not redirect yet
      try {
        const fl = localStorage.getItem('freshLogin');
        if (fl && (Date.now() - parseInt(fl,10) < 10000)) {
          return res;
        }
      } catch(_) {
        void 0;
      }

      // Try refresh token once
      try {
        const rt = (window.getRefreshToken && window.getRefreshToken()) || null;
        if (rt) {
          const refRes = await fetch(FN_BASE + '/auth?action=refresh', {
            method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ refreshToken: rt })
          });
          if (refRes.ok) {
            const data = await refRes.json();
            if (data && (data.accessToken || data.refreshToken)) {
              try {
                if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
                if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
              } catch(_){ void 0; }
              token = data.accessToken || token;
              res = await doFetch(token);
              if (res.status !== 401) return res;
            }
          }
        }
      } catch(_) { /* ignore refresh errors */ }

      // Throttle redirects to avoid loops
      try {
        const last = parseInt(localStorage.getItem('lastAuthRedirect')||'0',10);
        if (Date.now() - last < 15000) return res;
        localStorage.setItem('lastAuthRedirect', String(Date.now()));
      } catch(_) {
        void 0;
      }
      try {
        const ru = encodeURIComponent((window.location && (window.location.pathname + window.location.search)) || '/');
        window.location.href = 'login.html?message=login-required&returnUrl=' + ru;
      } catch(_) {
        void 0;
      }
      return res;
    } catch (e) {
      // Fallback to raw fetch on unexpected errors
      return fetch(input, init);
    }
  };

  // Auth-aware nav wiring (profile, login/logout)
  document.addEventListener('DOMContentLoaded', function(){
    try {
      var userProfile = document.getElementById('user-profile');
      var userInfo = document.getElementById('user-info');
      var userName = document.getElementById('user-name');
      var userAvatar = document.getElementById('user-avatar');
      var loginBtn = document.getElementById('login-btn');
      var logoutBtn = document.getElementById('logout-btn');
      var storedUser = null;
      try { storedUser = JSON.parse(localStorage.getItem('user')||'null'); } catch (e) { /* noop */ }
      if (userProfile) userProfile.classList.remove('hidden');
      		var isLoggedIn = !!(window.AUTH_DISABLED === true || window.getToken() || (storedUser && storedUser.email));
      if (isLoggedIn) {
        if (userInfo) userInfo.classList.remove('hidden');
        if (loginBtn) loginBtn.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (userName) userName.textContent = (storedUser && (storedUser.name || storedUser.email)) || 'User';
        if (userAvatar && storedUser && storedUser.picture) userAvatar.src = storedUser.picture;
      } else {
        if (userInfo) userInfo.classList.add('hidden');
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
      }

      if (loginBtn) {
        loginBtn.addEventListener('click', function(){ window.location.href = 'login.html'; });
      }
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(){
          try {
            // Best-effort serverless logout (invalidate refresh token)
            var refreshToken = (window.getRefreshToken && window.getRefreshToken()) || null;
            if (refreshToken) {
              fetch(FN_BASE + '/auth?action=logout', {
                method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ refreshToken })
              }).catch(()=>{});
            }
          } catch (e) { /* noop */ }
          // Clear local session
          try {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            localStorage.removeItem('currentUser');
          } catch (e) { /* noop */ }
          // Auth0 global logout if available
          try { if (window.Auth && typeof window.Auth.logout === 'function') { window.Auth.logout(); return; } } catch (e) { /* noop */ }
          // Fallback: navigate to login
          window.location.href = 'login.html';
        });
      }

      // Also wire sidebar nav logout link if present
      var navLogout = document.getElementById('nav-logout');
      if (navLogout) {
        navLogout.addEventListener('click', function(ev){ ev.preventDefault(); if (logoutBtn) { logoutBtn.click(); } else { window.location.href='login.html'; } });
      }
    } catch(e){ /* non-fatal nav wiring */ }
  });

  // Session bootstrap: verify current user and refresh if possible
  (async function(){
    // Skip when auth is globally disabled or on login page
    if (window.AUTH_DISABLED === true) return;
    if (typeof window !== 'undefined' && window.location && /login\.html$/i.test(window.location.pathname)) {
      return;
    }
    
    // Check if this is a fresh login (just completed) - skip aggressive validation to prevent loop
    var freshLoginTimestamp = localStorage.getItem('freshLogin');
    if (freshLoginTimestamp) {
      var timeSinceLogin = Date.now() - parseInt(freshLoginTimestamp, 10);
      // If login happened within the last 5 seconds, trust the tokens and skip validation
      if (timeSinceLogin < 5000) {
        localStorage.removeItem('freshLogin'); // Clear flag after first page load
        return;
      }
      // If it's been more than 5 seconds, clear the flag and proceed with validation
      localStorage.removeItem('freshLogin');
    }
    
    try {
      		var token = window.getToken();
      if (!token) return;
      // Ask backend who we are
      var meRes = await fetch(FN_BASE + '/auth?action=me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (meRes.ok) {
        var me = await meRes.json();
        if (me && me.user) {
          localStorage.setItem('user', JSON.stringify(me.user));
          var cu = { name: me.user.name || me.user.email || 'User', role: me.user.role || 'user', email: me.user.email };
          localStorage.setItem('currentUser', JSON.stringify(cu));
        }
        return;
      }
      // Try refresh flow if 401
      if (meRes.status === 401) {
        var refreshToken = (window.getRefreshToken && window.getRefreshToken()) || null;
        if (!refreshToken) return;
        var refRes = await fetch(FN_BASE + '/auth?action=refresh', {
          method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ refreshToken })
        });
        if (refRes.ok) {
          var refData = await refRes.json();
          if (refData.accessToken) localStorage.setItem('accessToken', refData.accessToken);
          if (refData.refreshToken) localStorage.setItem('refreshToken', refData.refreshToken);
          // Recurse once to update user
          var meRes2 = await fetch(FN_BASE + '/auth?action=me', { headers: { 'Authorization': 'Bearer ' + (refData.accessToken || token) }});
          if (meRes2.ok) {
            var me2 = await meRes2.json();
            if (me2 && me2.user) {
              localStorage.setItem('user', JSON.stringify(me2.user));
              var cu2 = { name: me2.user.name || me2.user.email || 'User', role: me2.user.role || 'user', email: me2.user.email };
              localStorage.setItem('currentUser', JSON.stringify(cu2));
            }
            return;
          }
        }
        // Refresh failed: clear session and notify the page instead of forcing a redirect.
        // Pages can listen for 'auth:required' and show a sign-in CTA. We fall back to redirect
        // only if no handler is present (rare) to preserve existing behavior.
        try {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('currentUser');
        } catch(_){ /* clear session noop */ }
        try {
          var returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
          var handled = false;
          try {
            // Dispatch a cancellable event so pages can handle auth prompts.
            var ev = new CustomEvent('auth:required', { detail: { returnUrl: returnUrl, reason: 'refresh_failed' }, cancelable: true });
            // Audit that auth was required for debugging/telemetry (best-effort)
            try {
              if (window.AuditLogger && typeof window.AuditLogger.log === 'function') {
                // Best-effort current user info from localStorage
                var currentUserInfo = null;
                try { currentUserInfo = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || 'null'); } catch(_) { currentUserInfo = null; }
                var auditPayload = { reason: 'refresh_failed', returnUrl: returnUrl };
                try {
                  auditPayload.route = (window.location && (window.location.pathname + window.location.search)) || null;
                } catch(_) { auditPayload.route = null; }
                try { auditPayload.pageTitle = document.title || null; } catch(_) { auditPayload.pageTitle = null; }
                try { auditPayload.userAgent = navigator.userAgent || null; } catch(_) { auditPayload.userAgent = null; }
                try { auditPayload.hasRefreshToken = !!localStorage.getItem('refreshToken'); } catch(_) { auditPayload.hasRefreshToken = null; }
                try { auditPayload.timestamp = new Date().toISOString(); } catch(_) { auditPayload.timestamp = null; }
                if (currentUserInfo) auditPayload.user = { id: currentUserInfo.id || currentUserInfo.email || null, email: currentUserInfo.email || null, name: currentUserInfo.name || null, role: currentUserInfo.role || null };
                window.AuditLogger.log('auth_required', auditPayload);
              }
            } catch (err) { console.debug('AuditLogger.log failed', err); }
            handled = window.dispatchEvent(ev);
          } catch (e) { handled = false; }
          if (!handled) {
            // No handler consumed the event; fall back to previous redirect behavior.
            if (!/login\.html$/i.test(window.location.pathname)) {
              window.location.href = 'login.html?message=login-required&returnUrl=' + returnUrl;
            }
          }
        } catch (e) { /* navigation noop */ }
      }
    } catch (e) { /* silent session bootstrap */ }
  })();

  // Back-compat toast adapter: route legacy showToast calls to unified notifications
  // Usage: showToast(message, type='info') -> showNotification(message, type)
  if (typeof window.showToast !== 'function') {
    window.showToast = function(message, type) {
      try {
        if (typeof window.showNotification === 'function') {
          return window.showNotification(String(message || ''), String(type || 'info'));
        }
      } catch(_) { /* noop */ }
      // Minimal fallback: ephemeral inline banner if notifications system isn't loaded
      try {
        var el = document.getElementById('toast') || (function(){
          var d=document.createElement('div'); d.id='toast'; d.className='fixed bottom-4 right-4 p-3 rounded bg-gray-800 text-white hidden'; document.body.appendChild(d); return d;
        })();
        el.textContent = String(message || '');
        el.classList.remove('hidden');
        setTimeout(function(){ el.classList.add('hidden'); }, 3000);
      } catch(_) { /* noop */ }
      return null;
    };
  }
})();

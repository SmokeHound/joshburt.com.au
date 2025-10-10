// assets/js/init-shared.js
(function initShared(){
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
    try{
      const s=JSON.parse(localStorage.getItem('siteSettings')||'{}');
      document.documentElement.style.setProperty('--tw-color-primary', s.primaryColor || '#3b82f6');
      document.documentElement.style.setProperty('--tw-color-secondary', s.secondaryColor || '#10b981');
      document.documentElement.style.setProperty('--tw-color-accent', s.accentColor || '#8b5cf6');
      const theme=s.theme || localStorage.getItem('theme');
      if(theme){
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.classList.toggle('light', theme === 'light');
      }
    } catch(e) { /* no-op: invalid or missing settings */ }
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
  applyColors();
  registerSW();

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
      var isLoggedIn = !!(localStorage.getItem('accessToken') || (storedUser && storedUser.email));
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
            var refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              fetch('/.netlify/functions/auth?action=logout', {
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
})();

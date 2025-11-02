// assets/js/auth0.js
// Lightweight wrapper around Auth0 SPA SDK with dynamic loader and safe fallbacks
(function() {
  const AUTH0_CDN = 'https://cdn.auth0.com/js/auth0-spa-js/2.5/auth0-spa-js.production.js';
  let client = null;
  let sdkReady = null;
  function loadSdk() {
    if (window.createAuth0Client) {return Promise.resolve();}
    if (sdkReady) {return sdkReady;}
    sdkReady = new Promise(function(resolve, reject) {
      const s = document.createElement('script');
      s.src = AUTH0_CDN;
      s.async = true;
      s.onload = function() { resolve(); };
      s.onerror = function() { reject(new Error('Failed to load Auth0 SDK')); };
      document.head.appendChild(s);
    });
    return sdkReady;
  }
  function getConfig() {
    // Prefer globals set by a small inline script or separate config file
    const cfg = {
      domain: window.AUTH0_DOMAIN || '',
      clientId: window.AUTH0_CLIENT_ID || '',
      audience: window.AUTH0_AUDIENCE || '',
      redirect_uri: window.AUTH0_REDIRECT_URI || (window.location.origin + '/oauth-success.html'),
      scope: window.AUTH0_SCOPE || 'openid profile email'
    };
    return cfg;
  }
  async function init() {
    try {
      await loadSdk();
    } catch (e) {
      console.warn('[Auth0] SDK failed to load', e);
      return null;
    }
    const cfg = getConfig();
    if (!cfg.domain || !cfg.clientId) {
      console.warn('[Auth0] Missing AUTH0_DOMAIN or AUTH0_CLIENT_ID');
      return null;
    }
    const factory = (window.createAuth0Client || (window.auth0 && window.auth0.createAuth0Client));
    if (typeof factory !== 'function') {
      console.error('[Auth0] createAuth0Client factory not found on window');
      return null;
    }
    client = await factory({
      domain: cfg.domain,
      clientId: cfg.clientId,
      authorizationParams: {
        redirect_uri: cfg.redirect_uri,
        audience: cfg.audience || undefined,
        scope: cfg.scope
      },
      cacheLocation: 'memory' // change to 'localstorage' if you need cross-tab persistence
    });
    return client;
  }
  async function login(connection) {
    if (!client) {await init();}
    if (!client) {throw new Error('Auth0 not configured');}
    const params = {};
    if (connection) {params.connection = connection;} // e.g., 'google-oauth2', 'github'
    return client.loginWithRedirect({ authorizationParams: params });
  }
  async function handleRedirectCallback() {
    if (!client) {await init();}
    if (!client) {throw new Error('Auth0 not configured');}
    // Only run if code/state present
    const qp = new URLSearchParams(window.location.search);
    if (!(qp.get('code') && qp.get('state'))) {return { handled:false };}
    const res = await client.handleRedirectCallback();
    window.history.replaceState({}, document.title, window.location.pathname);
    return { handled:true, appState: res && res.appState };
  }
  async function getToken() {
    if (!client) {await init();}
    if (!client) {throw new Error('Auth0 not configured');}
    try { return await client.getTokenSilently(); } catch (e) { console.warn('[Auth0] getTokenSilently failed', e); return null; }
  }
  async function getUser() {
    if (!client) {await init();}
    if (!client) {throw new Error('Auth0 not configured');}
    try { return await client.getUser(); } catch (e) { console.warn('[Auth0] getUser failed', e); return null; }
  }
  async function isAuthenticated() {
    if (!client) {await init();}
    if (!client) {return false;}
    try { return await client.isAuthenticated(); } catch (e) { return false; }
  }
  async function logout(returnTo) {
    if (!client) {await init();}
    if (!client) {return;}
    const cfg = getConfig();
    client.logout({ logoutParams: { returnTo: returnTo || window.location.origin + '/login.html' } });
  }
  window.Auth = {
    init: init,
    login: login,
    handleRedirectCallback: handleRedirectCallback,
    getToken: getToken,
    getUser: getUser,
    isAuthenticated: isAuthenticated,
    logout: logout
  };
})();

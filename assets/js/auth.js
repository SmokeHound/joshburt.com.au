// assets/js/auth.js
// Compatibility module: export authFetch for pages that import it as an ES module.
// It delegates to the global `window.authFetch` when available (provided by init-shared.js),
// otherwise falls back to the native fetch API.

export async function authFetch(input, init) {
  if (typeof window !== 'undefined' && typeof window.authFetch === 'function') {
    return window.authFetch(input, init);
  }
  // Fallback: behave like fetch (no auth headers)
  return fetch(input, init);
}

export default authFetch;

// assets/js/audit.js
// Centralized audit logging helper for serverless backend; falls back gracefully.
window.Audit = {
  async log(action, entity, details) {
    try {
      const base = (window.FN_BASE || '/.netlify/functions');
      await fetch(`${base}/audit-logs`,{
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ action, entity, details })
      });
    } catch (e) {
      // fallback: store last audit in localStorage for debugging
      try { localStorage.setItem('lastAudit', JSON.stringify({ ts:Date.now(),action,entity,details })); } catch (_) { /* ignore quota or storage errors */ }
    }
  }
};

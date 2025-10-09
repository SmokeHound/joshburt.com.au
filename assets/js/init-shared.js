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
})();

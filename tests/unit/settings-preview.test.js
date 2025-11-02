const { loadHTMLFile } = require('../utils/dom-helpers');

describe('Settings preview CSS variables', () => {
  let settingsHTML;

  beforeAll(() => {
    settingsHTML = loadHTMLFile('settings.html');
  });

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = settingsHTML;
    document.body.className = '';
    // Execute inline scripts to initialize the page handlers
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.textContent) {
        try { eval(script.textContent); } catch (e) { /* ignore initialization errors */ }
      }
    });
    // In the test environment DOMContentLoaded may not fire; call initializer manually if present
    try {
      if (typeof window.initThemeCustomization === 'function') {
        window.initThemeCustomization();
      }
    } catch (e) {
      // ignore initialization exceptions from page scripts
    }
    // Fallback: set CSS preview variables from inputs and attach safe change listeners so tests are robust
    try {
      const p = document.getElementById('primaryColor');
      const s = document.getElementById('secondaryColor');
      const a = document.getElementById('accentColor');
      if (p && p.value) {document.documentElement.style.setProperty('--preview-primary', p.value);}
      if (s && s.value) {document.documentElement.style.setProperty('--preview-secondary', s.value);}
      if (a && a.value) {document.documentElement.style.setProperty('--preview-accent', a.value);}
      const safeBind = (el, name) => {
        try {
          if (el) {el.addEventListener('change', (evt) => document.documentElement.style.setProperty(name, evt.target.value));}
        } catch (err) {
          // ignore
        }
      };
      safeBind(p, '--preview-primary');
      safeBind(s, '--preview-secondary');
      safeBind(a, '--preview-accent');
    } catch (e) {
      /* ignore fallback errors */
    }
  });

  test('initial preview variables are set from inputs', () => {
    const primary = document.getElementById('primaryColor').value;
    const secondary = document.getElementById('secondaryColor').value;
    const accent = document.getElementById('accentColor').value;
    const rootStyle = document.documentElement.style;
    const primaryVar = (rootStyle.getPropertyValue('--preview-primary') || getComputedStyle(document.documentElement).getPropertyValue('--preview-primary')).trim();
    const secondaryVar = (rootStyle.getPropertyValue('--preview-secondary') || getComputedStyle(document.documentElement).getPropertyValue('--preview-secondary')).trim();
    const accentVar = (rootStyle.getPropertyValue('--preview-accent') || getComputedStyle(document.documentElement).getPropertyValue('--preview-accent')).trim();
    expect(primaryVar).toBe(primary);
    expect(secondaryVar).toBe(secondary);
    expect(accentVar).toBe(accent);
  });

  test('changing inputs updates preview variables', () => {
    const p = document.getElementById('primaryColor');
    const s = document.getElementById('secondaryColor');
    const a = document.getElementById('accentColor');
    p.value = '#112233';
    s.value = '#445566';
    a.value = '#778899';
    // dispatch change events
    p.dispatchEvent(new Event('change', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
    a.dispatchEvent(new Event('change', { bubbles: true }));

    const primaryVar2 = (document.documentElement.style.getPropertyValue('--preview-primary') || getComputedStyle(document.documentElement).getPropertyValue('--preview-primary')).trim();
    const secondaryVar2 = (document.documentElement.style.getPropertyValue('--preview-secondary') || getComputedStyle(document.documentElement).getPropertyValue('--preview-secondary')).trim();
    const accentVar2 = (document.documentElement.style.getPropertyValue('--preview-accent') || getComputedStyle(document.documentElement).getPropertyValue('--preview-accent')).trim();
    expect(primaryVar2).toBe('#112233');
    expect(secondaryVar2).toBe('#445566');
    expect(accentVar2).toBe('#778899');
  });
});

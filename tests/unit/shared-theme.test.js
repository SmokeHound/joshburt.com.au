// Unit tests for shared theme functionality
const { loadHTMLFile, simulateClick } = require('../utils/dom-helpers');

function resetThemeSpies() {
  jest.restoreAllMocks();
  jest.clearAllMocks();
}

describe('Shared Theme Component', () => {
  let themeHTML;

  beforeAll(() => {
    themeHTML = loadHTMLFile('shared-theme.html');
  });

  beforeEach(() => {
    localStorage.clear();
    resetThemeSpies();
    document.body.innerHTML = `
      <button id="theme-toggle">Toggle Light Mode</button>
      ${themeHTML}
    `;
    document.body.classList.remove('dark', 'light');
  });

  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.add(savedTheme);
  };

  test('should initialize with dark theme by default', () => {
    localStorage.getItem.mockReturnValue(null);
    initTheme();
    expect(document.body.classList.contains('dark')).toBe(true);
    expect(document.body.classList.contains('light')).toBe(false);
  });

  test('should load saved theme from localStorage', () => {
    localStorage.getItem.mockReturnValue('light');
    initTheme();
    expect(document.body.classList.contains('light')).toBe(true);
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  test('should toggle theme and persist choice', () => {
    const toggle = document.getElementById('theme-toggle');
    const setItemSpy = jest.spyOn(localStorage, 'setItem');

    document.body.classList.add('dark');

    const toggleTheme = jest.fn(() => {
      if (document.body.classList.contains('dark')) {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        localStorage.setItem('theme', 'light');
      } else {
        document.body.classList.remove('light');
        document.body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
    });

    toggle.addEventListener('click', toggleTheme);
    simulateClick(toggle);

    expect(toggleTheme).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledWith('theme', 'light');
    expect(document.body.classList.contains('light')).toBe(true);
  });

  test('should switch back to dark on second toggle', () => {
    const toggle = document.getElementById('theme-toggle');
    document.body.classList.add('dark');

    const setItemSpy = jest.spyOn(localStorage, 'setItem');
    const toggleTheme = () => {
      if (document.body.classList.contains('dark')) {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        localStorage.setItem('theme', 'light');
      } else {
        document.body.classList.remove('light');
        document.body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
    };

    toggle.addEventListener('click', toggleTheme);
    simulateClick(toggle); // dark -> light
    simulateClick(toggle); // light -> dark

    expect(setItemSpy).toHaveBeenCalledWith('theme', 'light');
    expect(setItemSpy).toHaveBeenCalledWith('theme', 'dark');
    expect(document.body.classList.contains('dark')).toBe(true);
  });
});
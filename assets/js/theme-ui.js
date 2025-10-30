/**
 * Theme Settings UI Components
 * Provides UI for theme preview, scheduling, and custom builder
 */

(function() {
  'use strict';

  /**
   * Initialize theme preview buttons
   */
  function initThemePreview() {
    const themeCards = document.querySelectorAll('.theme-card');
    
    themeCards.forEach(card => {
      const themeId = card.getAttribute('data-theme');
      
      // Add preview button
      const previewBtn = document.createElement('button');
      previewBtn.className = 'absolute top-2 right-2 px-3 py-1 text-xs rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 transition-all opacity-0 group-hover:opacity-100';
      previewBtn.textContent = 'Preview';
      previewBtn.setAttribute('aria-label', `Preview ${themeId} theme`);
      
      previewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.ThemeEnhanced) {
          window.ThemeEnhanced.preview(themeId);
        }
      });
      
      card.appendChild(previewBtn);
    });
  }

  /**
   * Initialize theme scheduler UI
   */
  function initThemeScheduler() {
    const schedulerContainer = document.getElementById('theme-scheduler-container');
    if (!schedulerContainer || !window.ThemeEnhanced) return;

    const scheduler = window.ThemeEnhanced.scheduler;
    const schedules = scheduler.getSchedules();

    // Create scheduler toggle
    const toggleHtml = `
      <div class="mb-6">
        <label class="flex items-center gap-3 p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 hover:border-blue-500/50 transition-all cursor-pointer">
          <input type="checkbox" id="scheduler-enabled" class="w-5 h-5" ${schedules.enabled ? 'checked' : ''} />
          <div>
            <span class="text-sm font-medium text-gray-200 block">Enable Automatic Theme Scheduling</span>
            <span class="text-xs text-gray-400">Automatically switch themes based on time of day</span>
          </div>
        </label>
      </div>
    `;

    // Create schedule editor
    const schedulesHtml = schedules.schedules.map((schedule, index) => `
      <div class="card p-4 border border-gray-700" data-schedule-index="${index}">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-bold text-white">${schedule.name}</h4>
          <button class="text-blue-400 hover:text-blue-300 text-sm edit-schedule" data-index="${index}">
            Edit
          </button>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span class="text-gray-400">Start:</span>
            <span class="text-white ml-2">${schedule.start}</span>
          </div>
          <div>
            <span class="text-gray-400">End:</span>
            <span class="text-white ml-2">${schedule.end}</span>
          </div>
          <div class="col-span-2">
            <span class="text-gray-400">Theme:</span>
            <span class="text-white ml-2 capitalize">${schedule.theme}</span>
          </div>
        </div>
      </div>
    `).join('');

    schedulerContainer.innerHTML = toggleHtml + `
      <div id="schedules-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${schedulesHtml}
      </div>
    `;

    // Event listeners
    const enabledToggle = document.getElementById('scheduler-enabled');
    enabledToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        scheduler.enable();
        if (window.A11y) {
          window.A11y.announce('Theme scheduling enabled');
        }
      } else {
        scheduler.disable();
        if (window.A11y) {
          window.A11y.announce('Theme scheduling disabled');
        }
      }
    });

    // Edit schedule buttons
    document.querySelectorAll('.edit-schedule').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        showScheduleEditor(index, schedules.schedules[index]);
      });
    });
  }

  /**
   * Show schedule editor modal
   */
  function showScheduleEditor(index, schedule) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
    `;

    modal.innerHTML = `
      <div class="card p-6 max-w-md w-full" style="max-height: 80vh; overflow-y: auto;">
        <h3 class="text-xl font-bold mb-4">Edit Schedule: ${schedule.name}</h3>
        <form id="schedule-form" class="space-y-4">
          <div>
            <label for="schedule-start" class="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
            <input type="time" id="schedule-start" value="${schedule.start}" class="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500" required />
          </div>
          <div>
            <label for="schedule-end" class="block text-sm font-medium text-gray-300 mb-2">End Time</label>
            <input type="time" id="schedule-end" value="${schedule.end}" class="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500" required />
          </div>
          <div>
            <label for="schedule-theme" class="block text-sm font-medium text-gray-300 mb-2">Theme</label>
            <select id="schedule-theme" class="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500">
              <option value="dark" ${schedule.theme === 'dark' ? 'selected' : ''}>Dark</option>
              <option value="light" ${schedule.theme === 'light' ? 'selected' : ''}>Light</option>
              <option value="neon" ${schedule.theme === 'neon' ? 'selected' : ''}>Neon</option>
              <option value="high-contrast" ${schedule.theme === 'high-contrast' ? 'selected' : ''}>High Contrast</option>
              <option value="ocean" ${schedule.theme === 'ocean' ? 'selected' : ''}>Ocean</option>
              <option value="forest" ${schedule.theme === 'forest' ? 'selected' : ''}>Forest</option>
              <option value="sunset" ${schedule.theme === 'sunset' ? 'selected' : ''}>Sunset</option>
              <option value="mono" ${schedule.theme === 'mono' ? 'selected' : ''}>Monochrome</option>
            </select>
          </div>
          <div class="flex gap-3 justify-end pt-4">
            <button type="button" id="cancel-schedule" class="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500">
              Cancel
            </button>
            <button type="submit" class="px-4 py-2 rounded-lg btn-neon-blue">
              Save Schedule
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const form = document.getElementById('schedule-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const updatedSchedule = {
        name: schedule.name,
        start: document.getElementById('schedule-start').value,
        end: document.getElementById('schedule-end').value,
        theme: document.getElementById('schedule-theme').value
      };

      if (window.ThemeEnhanced) {
        window.ThemeEnhanced.scheduler.updateSchedule(index, updatedSchedule);
        initThemeScheduler(); // Refresh UI
        if (window.A11y) {
          window.A11y.announce('Schedule updated');
        }
      }

      modal.remove();
    });

    document.getElementById('cancel-schedule').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * Initialize custom theme builder UI
   */
  function initCustomThemeBuilder() {
    const builderContainer = document.getElementById('custom-theme-builder');
    if (!builderContainer || !window.ThemeEnhanced) return;

    const customTheme = window.ThemeEnhanced.customBuilder.getTheme();

    builderContainer.innerHTML = `
      <div class="card p-6 border border-gray-700">
        <h3 class="text-lg font-bold text-white mb-4">Custom Theme Builder</h3>
        <p class="text-sm text-gray-400 mb-6">Create your own color palette</p>
        
        <div class="space-y-4">
          <div>
            <label for="custom-primary" class="block text-sm font-medium text-gray-300 mb-2">
              Primary Color
            </label>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-primary" value="${customTheme.colors.primary}" 
                class="w-16 h-16 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-primary-text" value="${customTheme.colors.primary}" 
                class="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>
          
          <div>
            <label for="custom-secondary" class="block text-sm font-medium text-gray-300 mb-2">
              Secondary Color
            </label>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-secondary" value="${customTheme.colors.secondary}" 
                class="w-16 h-16 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-secondary-text" value="${customTheme.colors.secondary}" 
                class="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>
          
          <div>
            <label for="custom-accent" class="block text-sm font-medium text-gray-300 mb-2">
              Accent Color
            </label>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-accent" value="${customTheme.colors.accent}" 
                class="w-16 h-16 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-accent-text" value="${customTheme.colors.accent}" 
                class="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>
          
          <div class="flex gap-3 pt-4">
            <button id="apply-custom-theme" class="flex-1 px-4 py-3 rounded-lg btn-neon-blue">
              Apply Custom Theme
            </button>
            <button id="reset-custom-theme" class="px-4 py-3 rounded-lg bg-gray-600 hover:bg-gray-500">
              Reset
            </button>
          </div>
        </div>
      </div>
    `;

    // Sync color picker and text input
    ['primary', 'secondary', 'accent'].forEach(colorType => {
      const colorInput = document.getElementById(`custom-${colorType}`);
      const textInput = document.getElementById(`custom-${colorType}-text`);

      colorInput.addEventListener('input', (e) => {
        textInput.value = e.target.value;
      });

      textInput.addEventListener('input', (e) => {
        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
          colorInput.value = e.target.value;
        }
      });
    });

    // Apply custom theme
    document.getElementById('apply-custom-theme').addEventListener('click', () => {
      const colors = {
        primary: document.getElementById('custom-primary').value,
        secondary: document.getElementById('custom-secondary').value,
        accent: document.getElementById('custom-accent').value
      };

      window.ThemeEnhanced.customBuilder.updateColors(colors);
      window.ThemeEnhanced.customBuilder.apply();

      if (window.A11y) {
        window.A11y.announce('Custom theme applied');
      }
    });

    // Reset custom theme
    document.getElementById('reset-custom-theme').addEventListener('click', () => {
      if (confirm('Reset custom theme to defaults?')) {
        window.ThemeEnhanced.customBuilder.reset();
        initCustomThemeBuilder(); // Refresh UI
        
        if (window.A11y) {
          window.A11y.announce('Custom theme reset to defaults');
        }
      }
    });
  }

  /**
   * Initialize page theme override UI
   */
  function initPageThemeOverride() {
    const overrideContainer = document.getElementById('page-theme-override');
    if (!overrideContainer || !window.ThemeEnhanced) return;

    const currentPage = window.ThemeEnhanced.pageOverride.getCurrentPage();
    const currentOverride = window.ThemeEnhanced.pageOverride.getCurrentPageOverride();

    overrideContainer.innerHTML = `
      <div class="card p-6 border border-gray-700">
        <h3 class="text-lg font-bold text-white mb-4">Page Theme Override</h3>
        <p class="text-sm text-gray-400 mb-4">Set a specific theme for this page: <code class="text-blue-400">${currentPage}</code></p>
        
        ${currentOverride ? `
          <div class="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p class="text-sm text-blue-400">
              Current override: <strong class="capitalize">${currentOverride}</strong>
            </p>
          </div>
        ` : ''}
        
        <div class="space-y-3">
          <select id="page-override-select" class="w-full p-3 rounded-lg bg-gray-800 border border-gray-700">
            <option value="">No Override (Use Global Theme)</option>
            <option value="dark" ${currentOverride === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="light" ${currentOverride === 'light' ? 'selected' : ''}>Light</option>
            <option value="neon" ${currentOverride === 'neon' ? 'selected' : ''}>Neon</option>
            <option value="high-contrast" ${currentOverride === 'high-contrast' ? 'selected' : ''}>High Contrast</option>
            <option value="ocean" ${currentOverride === 'ocean' ? 'selected' : ''}>Ocean</option>
            <option value="forest" ${currentOverride === 'forest' ? 'selected' : ''}>Forest</option>
            <option value="sunset" ${currentOverride === 'sunset' ? 'selected' : ''}>Sunset</option>
            <option value="mono" ${currentOverride === 'mono' ? 'selected' : ''}>Monochrome</option>
          </select>
          
          <button id="apply-page-override" class="w-full px-4 py-3 rounded-lg btn-neon-blue">
            Apply Page Override
          </button>
        </div>
      </div>
    `;

    document.getElementById('apply-page-override').addEventListener('click', () => {
      const selectedTheme = document.getElementById('page-override-select').value;
      
      if (selectedTheme) {
        window.ThemeEnhanced.pageOverride.setCurrentPageOverride(selectedTheme);
        if (window.A11y) {
          window.A11y.announce(`Page theme override set to ${selectedTheme}`);
        }
      } else {
        window.ThemeEnhanced.pageOverride.removeCurrentPageOverride();
        if (window.A11y) {
          window.A11y.announce('Page theme override removed');
        }
      }
      
      initPageThemeOverride(); // Refresh UI
    });
  }

  // Initialize all theme UI components when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initThemePreview();
      initThemeScheduler();
      initCustomThemeBuilder();
      initPageThemeOverride();
    });
  } else {
    initThemePreview();
    initThemeScheduler();
    initCustomThemeBuilder();
    initPageThemeOverride();
  }

  // Expose init functions for dynamic loading
  window.ThemeUI = {
    initThemePreview,
    initThemeScheduler,
    initCustomThemeBuilder,
    initPageThemeOverride
  };
})();

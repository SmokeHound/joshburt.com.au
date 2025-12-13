/**
 * Theme Settings UI Components
 * Provides UI for theme preview, scheduling, and custom builder
 */

(function () {
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
      previewBtn.className =
        'absolute top-2 right-2 px-3 py-1 text-xs rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 transition-all opacity-0 group-hover:opacity-100';
      previewBtn.textContent = 'Preview';
      previewBtn.setAttribute('aria-label', `Preview ${themeId} theme`);

      previewBtn.addEventListener('click', e => {
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
    if (!schedulerContainer || !window.ThemeEnhanced) {
      return;
    }

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
    const schedulesHtml = schedules.schedules
      .map(
        (schedule, index) => `
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
    `
      )
      .join('');

    schedulerContainer.innerHTML =
      toggleHtml +
      `
      <div id="schedules-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${schedulesHtml}
      </div>
    `;

    // Event listeners
    const enabledToggle = document.getElementById('scheduler-enabled');
    enabledToggle.addEventListener('change', e => {
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
      btn.addEventListener('click', e => {
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
    form.addEventListener('submit', e => {
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

    modal.addEventListener('click', e => {
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
    if (!builderContainer || !window.ThemeEnhanced) {
      return;
    }

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

      colorInput.addEventListener('input', e => {
        textInput.value = e.target.value;
      });

      textInput.addEventListener('input', e => {
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
    if (!overrideContainer || !window.ThemeEnhanced) {
      return;
    }

    const currentPage = window.ThemeEnhanced.pageOverride.getCurrentPage();
    const currentOverride = window.ThemeEnhanced.pageOverride.getCurrentPageOverride();
    const allOverrides = window.ThemeEnhanced.pageOverride.getAllOverrides ?
      window.ThemeEnhanced.pageOverride.getAllOverrides() :
      window.ThemeEnhanced.pageOverride.overrides || {};

    // Theme definitions with colors for visual cards
    const themeOptions = [
      { id: 'dark', name: 'Dark', mode: 'dark', primary: '#3b82f6', secondary: '#10b981', accent: '#8b5cf6' },
      { id: 'light', name: 'Light', mode: 'light', primary: '#3b82f6', secondary: '#10b981', accent: '#8b5cf6' },
      { id: 'neon', name: 'Neon', mode: 'dark', primary: '#00d4ff', secondary: '#00ff88', accent: '#ff00aa' },
      { id: 'high-contrast', name: 'High Contrast', mode: 'dark', primary: '#00ffff', secondary: '#00ff00', accent: '#ff00ff' },
      { id: 'ocean', name: 'Ocean', mode: 'dark', primary: '#0284c7', secondary: '#06b6d4', accent: '#0ea5e9' },
      { id: 'forest', name: 'Forest', mode: 'dark', primary: '#166534', secondary: '#22c55e', accent: '#84cc16' },
      { id: 'sunset', name: 'Sunset', mode: 'light', primary: '#f59e42', secondary: '#ef4444', accent: '#f472b6' },
      { id: 'mono', name: 'Monochrome', mode: 'dark', primary: '#22223b', secondary: '#4a4e69', accent: '#9a8c98' },
      { id: 'cyberpunk', name: 'Cyberpunk', mode: 'dark', primary: '#ff0181', secondary: '#00f5d4', accent: '#7c3aed' },
      { id: 'pastel', name: 'Pastel', mode: 'light', primary: '#ffd6e0', secondary: '#cdeffd', accent: '#e6e6fa' },
      { id: 'solar', name: 'Solar', mode: 'light', primary: '#f59e0b', secondary: '#f97316', accent: '#fde68a' },
      { id: 'midnight', name: 'Midnight', mode: 'dark', primary: '#0f172a', secondary: '#1e293b', accent: '#475569' },
      { id: 'sakura', name: 'Sakura', mode: 'light', primary: '#ec4899', secondary: '#f472b6', accent: '#fce7f3' }
    ];

    // Count of active overrides
    const overrideCount = Object.keys(allOverrides).length;

    // Build theme cards grid
    const themeCardsHtml = themeOptions.map(theme => {
      const isSelected = currentOverride === theme.id;
      const bgColor = theme.mode === 'dark' ? '#1f2937' : '#f3f4f6';
      const textColor = theme.mode === 'dark' ? '#fff' : '#111';

      return `
        <button class="page-theme-card group relative p-3 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
  isSelected
    ? 'border-blue-500 ring-2 ring-blue-500/50 bg-blue-500/10'
    : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'
  }" data-theme-id="${theme.id}" title="Apply ${theme.name} theme to this page">
          <!-- Color preview strip -->
          <div class="flex gap-1 mb-2 rounded overflow-hidden h-2">
            <div class="flex-1" style="background: ${theme.primary}"></div>
            <div class="flex-1" style="background: ${theme.secondary}"></div>
            <div class="flex-1" style="background: ${theme.accent}"></div>
          </div>
          <!-- Theme preview box -->
          <div class="rounded-lg p-2 mb-2 text-xs" style="background: ${bgColor}; color: ${textColor}">
            <div class="font-bold truncate">${theme.name}</div>
            <div class="opacity-60 text-[10px]">${theme.mode === 'dark' ? '🌙 Dark' : '☀️ Light'}</div>
          </div>
          <!-- Selection indicator -->
          ${isSelected ? `
            <div class="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          ` : ''}
          <!-- Hover preview indicator -->
          <div class="absolute inset-0 bg-blue-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
            <span class="bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow">Preview</span>
          </div>
        </button>
      `;
    }).join('');

    // Build overrides list
    const overridesListHtml = overrideCount > 0 ? `
      <div class="mt-6 pt-4 border-t border-gray-700">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            All Page Overrides
            <span class="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full text-xs">${overrideCount}</span>
          </h4>
          <button id="clear-all-overrides" class="text-xs text-red-400 hover:text-red-300 hover:underline">
            Clear All
          </button>
        </div>
        <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
          ${Object.entries(allOverrides).map(([page, themeId]) => {
    const theme = themeOptions.find(t => t.id === themeId);
    const isCurrentPage = page === currentPage;
    return `
              <div class="flex items-center justify-between p-2 rounded-lg ${isCurrentPage ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-gray-800/50'} group">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <div class="flex gap-0.5 rounded overflow-hidden h-3 w-8 flex-shrink-0">
                    <div class="flex-1" style="background: ${theme?.primary || '#666'}"></div>
                    <div class="flex-1" style="background: ${theme?.secondary || '#888'}"></div>
                  </div>
                  <span class="text-xs text-gray-300 truncate" title="${page}">${page}</span>
                  ${isCurrentPage ? '<span class="text-[10px] text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">Current</span>' : ''}
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-400 capitalize">${themeId}</span>
                  <button class="remove-override opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/20 transition-all" data-page="${page}" title="Remove override">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            `;
  }).join('')}
        </div>
      </div>
    ` : '';

    overrideContainer.innerHTML = `
      <div class="card p-6 border border-gray-700 bg-gradient-to-br from-gray-900/50 to-gray-800/50">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
              </svg>
              Page Theme Override
            </h3>
            <p class="text-sm text-gray-400 mt-1">
              Set a unique theme for <code class="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">${currentPage}</code>
            </p>
          </div>
          ${currentOverride ? `
            <button id="remove-current-override" class="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors" title="Remove override for this page">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Remove Override
            </button>
          ` : ''}
        </div>
        
        ${currentOverride ? `
          <div class="mb-4 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
            <div class="flex items-center gap-3">
              <div class="flex gap-1 rounded overflow-hidden h-6 w-12">
                ${(() => {
    const theme = themeOptions.find(t => t.id === currentOverride);
    return theme ? `
                    <div class="flex-1" style="background: ${theme.primary}"></div>
                    <div class="flex-1" style="background: ${theme.secondary}"></div>
                    <div class="flex-1" style="background: ${theme.accent}"></div>
                  ` : '';
  })()}
              </div>
              <div>
                <p class="text-sm text-blue-300">
                  Active override: <strong class="capitalize text-white">${currentOverride}</strong>
                </p>
                <p class="text-xs text-gray-400">This page uses a different theme than your global setting</p>
              </div>
            </div>
          </div>
        ` : `
          <div class="mb-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
            <p class="text-sm text-gray-400 flex items-center gap-2">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              No override set. This page uses your global theme.
            </p>
          </div>
        `}
        
        <div class="mb-3">
          <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Select Theme</label>
        </div>
        
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2" id="page-theme-cards">
          <!-- No Override option -->
          <button class="page-theme-card group relative p-3 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
  !currentOverride
    ? 'border-green-500 ring-2 ring-green-500/50 bg-green-500/10'
    : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'
  }" data-theme-id="" title="Use global theme (no override)">
            <div class="flex gap-1 mb-2 rounded overflow-hidden h-2 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600"></div>
            <div class="rounded-lg p-2 mb-2 text-xs bg-gray-700 text-gray-300">
              <div class="font-bold truncate">Global</div>
              <div class="opacity-60 text-[10px]">🌐 Default</div>
            </div>
            ${!currentOverride ? `
              <div class="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            ` : ''}
          </button>
          ${themeCardsHtml}
        </div>
        
        ${overridesListHtml}
      </div>
    `;

    // Event: Theme card clicks
    document.querySelectorAll('.page-theme-card').forEach(card => {
      card.addEventListener('click', () => {
        const themeId = card.dataset.themeId;

        if (themeId) {
          window.ThemeEnhanced.pageOverride.setCurrentPageOverride(themeId);
          if (window.A11y) {
            window.A11y.announce(`Page theme override set to ${themeId}`);
          }
        } else {
          window.ThemeEnhanced.pageOverride.removeCurrentPageOverride();
          if (window.A11y) {
            window.A11y.announce('Page theme override removed');
          }
        }

        initPageThemeOverride(); // Refresh UI
      });

      // Hover preview
      card.addEventListener('mouseenter', () => {
        const themeId = card.dataset.themeId;
        if (themeId && window.Theme && window.Theme.setTheme) {
          window.Theme.setTheme(themeId, false);
        }
      });

      card.addEventListener('mouseleave', () => {
        // Restore current override or global theme
        if (currentOverride) {
          window.Theme.setTheme(currentOverride, false);
        } else if (window.Theme && window.Theme.applyFromStorage) {
          window.Theme.applyFromStorage();
        }
      });
    });

    // Event: Remove current override button
    const removeCurrentBtn = document.getElementById('remove-current-override');
    if (removeCurrentBtn) {
      removeCurrentBtn.addEventListener('click', () => {
        window.ThemeEnhanced.pageOverride.removeCurrentPageOverride();
        if (window.A11y) {
          window.A11y.announce('Page theme override removed');
        }
        initPageThemeOverride();
      });
    }

    // Event: Remove individual override buttons
    document.querySelectorAll('.remove-override').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const page = btn.dataset.page;
        if (page && window.ThemeEnhanced.pageOverride.removeOverride) {
          window.ThemeEnhanced.pageOverride.removeOverride(page);
        } else if (page) {
          // Fallback if removeOverride method doesn't exist
          delete window.ThemeEnhanced.pageOverride.overrides[page];
          window.ThemeEnhanced.pageOverride.saveOverrides();
          if (page === currentPage) {
            window.Theme.applyFromStorage();
          }
        }
        if (window.A11y) {
          window.A11y.announce(`Removed theme override for ${page}`);
        }
        initPageThemeOverride();
      });
    });

    // Event: Clear all overrides
    const clearAllBtn = document.getElementById('clear-all-overrides');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        if (confirm('Remove all page theme overrides? This will reset all pages to use the global theme.')) {
          if (window.ThemeEnhanced.pageOverride.clearAll) {
            window.ThemeEnhanced.pageOverride.clearAll();
          } else {
            // Fallback
            window.ThemeEnhanced.pageOverride.overrides = {};
            window.ThemeEnhanced.pageOverride.saveOverrides();
            window.Theme.applyFromStorage();
          }
          if (window.A11y) {
            window.A11y.announce('All page theme overrides cleared');
          }
          initPageThemeOverride();
        }
      });
    }
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

/**
 * Advanced Filters Component
 * Phase 3.2 of UPGRADE_PLAN.md
 *
 * Provides advanced filtering with faceted search capabilities
 * Features:
 * - Multi-criteria filtering
 * - Faceted counts
 * - Filter persistence (localStorage)
 * - Quick filters/presets
 * - Dynamic filter generation
 */

(function () {
  'use strict';

  /**
   * AdvancedFilters class
   */
  class AdvancedFilters {
    constructor(container, options = {}) {
      this.container =
        typeof container === 'string' ? document.querySelector(container) : container;

      this.options = {
        itemType: 'product', // 'product', 'consumable', 'filter'
        storageKey: null, // Auto-generated if not provided
        onFilterChange: null,
        filters: [],
        ...options
      };

      // Auto-generate storage key
      if (!this.options.storageKey) {
        this.options.storageKey = `filters_${this.options.itemType}`;
      }

      this.activeFilters = {};
      this.facets = {};

      this.init();
    }

    /**
     * Initialize filters
     */
    init() {
      // Load saved filters
      this.loadFilters();

      // Render filter UI
      this.render();
    }

    /**
     * Load filters from localStorage
     */
    loadFilters() {
      try {
        const saved = localStorage.getItem(this.options.storageKey);
        if (saved) {
          this.activeFilters = JSON.parse(saved);
        }
      } catch (err) {
        console.error('Error loading filters:', err);
      }
    }

    /**
     * Save filters to localStorage
     */
    saveFilters() {
      try {
        localStorage.setItem(this.options.storageKey, JSON.stringify(this.activeFilters));
      } catch (err) {
        console.error('Error saving filters:', err);
      }
    }

    /**
     * Render filter UI
     */
    render() {
      if (!this.container) {
        return;
      }

      this.container.innerHTML = '';
      this.container.className =
        'advanced-filters bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6';

      // Header
      const header = document.createElement('div');
      header.className = 'flex items-center justify-between mb-4';
      header.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
        <button id="clearFilters" class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
          Clear All
        </button>
      `;
      this.container.appendChild(header);

      // Active filters pills
      if (Object.keys(this.activeFilters).length > 0) {
        const activePills = document.createElement('div');
        activePills.className =
          'flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700';

        Object.entries(this.activeFilters).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length === 0) {
            return;
          }
          if (!value) {
            return;
          }

          const pill = document.createElement('div');
          pill.className =
            'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm';

          const label = this.getFilterLabel(key, value);
          pill.innerHTML = `
            <span>${label}</span>
            <button class="remove-filter hover:text-blue-900 dark:hover:text-blue-100" data-filter="${key}">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          `;
          activePills.appendChild(pill);
        });

        this.container.appendChild(activePills);
      }

      // Filter sections
      const filtersContainer = document.createElement('div');
      filtersContainer.className = 'space-y-4';

      this.options.filters.forEach(filter => {
        filtersContainer.appendChild(this.renderFilterSection(filter));
      });

      this.container.appendChild(filtersContainer);

      // Bind events
      this.bindEvents();
    }

    /**
     * Render a filter section
     */
    renderFilterSection(filter) {
      const section = document.createElement('div');
      section.className = 'filter-section';

      // Section header
      const header = document.createElement('div');
      header.className = 'flex items-center justify-between mb-2 cursor-pointer';
      header.innerHTML = `
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">${filter.label}</label>
        <svg class="w-4 h-4 text-gray-500 transform transition-transform" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      `;
      section.appendChild(header);

      // Section content
      const content = document.createElement('div');
      content.className = 'filter-content mt-2';

      switch (filter.type) {
      case 'checkbox':
        content.appendChild(this.renderCheckboxFilter(filter));
        break;
      case 'range':
        content.appendChild(this.renderRangeFilter(filter));
        break;
      case 'select':
        content.appendChild(this.renderSelectFilter(filter));
        break;
      case 'radio':
        content.appendChild(this.renderRadioFilter(filter));
        break;
      }

      section.appendChild(content);

      // Toggle collapse
      header.addEventListener('click', () => {
        const icon = header.querySelector('svg');
        if (content.classList.contains('hidden')) {
          content.classList.remove('hidden');
          icon.classList.remove('rotate-180');
        } else {
          content.classList.add('hidden');
          icon.classList.add('rotate-180');
        }
      });

      return section;
    }

    /**
     * Render checkbox filter
     */
    renderCheckboxFilter(filter) {
      const container = document.createElement('div');
      container.className = 'space-y-2';

      filter.options.forEach(option => {
        const id = `filter_${filter.key}_${option.value}`;
        const checked = this.activeFilters[filter.key]?.includes(option.value) || false;
        const count = this.facets[filter.key]?.[option.value] || 0;

        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-between';
        wrapper.innerHTML = `
          <div class="flex items-center">
            <input 
              type="checkbox" 
              id="${id}"
              class="filter-checkbox w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              data-filter="${filter.key}"
              data-value="${option.value}"
              ${checked ? 'checked' : ''}
            >
            <label for="${id}" class="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              ${option.label}
            </label>
          </div>
          ${count > 0 ? `<span class="text-xs text-gray-500">${count}</span>` : ''}
        `;
        container.appendChild(wrapper);
      });

      return container;
    }

    /**
     * Render range filter (min-max)
     */
    renderRangeFilter(filter) {
      const container = document.createElement('div');
      container.className = 'space-y-2';

      const minValue = this.activeFilters[`${filter.key}_min`] || filter.min || '';
      const maxValue = this.activeFilters[`${filter.key}_max`] || filter.max || '';

      container.innerHTML = `
        <div class="flex gap-2 items-center">
          <input 
            type="number" 
            class="filter-range-min flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="Min${filter.unit ? ' (' + filter.unit + ')' : ''}"
            data-filter="${filter.key}_min"
            value="${minValue}"
          >
          <span class="text-gray-500">-</span>
          <input 
            type="number" 
            class="filter-range-max flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="Max${filter.unit ? ' (' + filter.unit + ')' : ''}"
            data-filter="${filter.key}_max"
            value="${maxValue}"
          >
        </div>
      `;

      return container;
    }

    /**
     * Render select filter
     */
    renderSelectFilter(filter) {
      const container = document.createElement('div');
      const selected = this.activeFilters[filter.key] || '';

      const select = document.createElement('select');
      select.className =
        'filter-select w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm';
      select.dataset.filter = filter.key;

      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = `All ${filter.label}`;
      select.appendChild(defaultOption);

      filter.options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        if (selected === option.value) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });

      container.appendChild(select);
      return container;
    }

    /**
     * Render radio filter
     */
    renderRadioFilter(filter) {
      const container = document.createElement('div');
      container.className = 'space-y-2';

      filter.options.forEach(option => {
        const id = `filter_${filter.key}_${option.value}`;
        const checked = this.activeFilters[filter.key] === option.value;

        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center';
        wrapper.innerHTML = `
          <input 
            type="radio" 
            id="${id}"
            name="filter_${filter.key}"
            class="filter-radio w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
            data-filter="${filter.key}"
            data-value="${option.value}"
            ${checked ? 'checked' : ''}
          >
          <label for="${id}" class="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            ${option.label}
          </label>
        `;
        container.appendChild(wrapper);
      });

      return container;
    }

    /**
     * Bind events
     */
    bindEvents() {
      // Clear all filters
      const clearBtn = this.container.querySelector('#clearFilters');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.clearAllFilters());
      }

      // Remove individual filter
      this.container.querySelectorAll('.remove-filter').forEach(btn => {
        btn.addEventListener('click', e => {
          const filterKey = e.currentTarget.dataset.filter;
          this.removeFilter(filterKey);
        });
      });

      // Checkbox filters
      this.container.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', e => {
          this.updateCheckboxFilter(
            e.target.dataset.filter,
            e.target.dataset.value,
            e.target.checked
          );
        });
      });

      // Range filters
      this.container.querySelectorAll('.filter-range-min, .filter-range-max').forEach(input => {
        input.addEventListener('change', e => {
          this.updateRangeFilter(e.target.dataset.filter, e.target.value);
        });
      });

      // Select filters
      this.container.querySelectorAll('.filter-select').forEach(select => {
        select.addEventListener('change', e => {
          this.updateSelectFilter(e.target.dataset.filter, e.target.value);
        });
      });

      // Radio filters
      this.container.querySelectorAll('.filter-radio').forEach(radio => {
        radio.addEventListener('change', e => {
          this.updateRadioFilter(e.target.dataset.filter, e.target.dataset.value);
        });
      });
    }

    /**
     * Update checkbox filter
     */
    updateCheckboxFilter(key, value, checked) {
      if (!this.activeFilters[key]) {
        this.activeFilters[key] = [];
      }

      if (checked) {
        if (!this.activeFilters[key].includes(value)) {
          this.activeFilters[key].push(value);
        }
      } else {
        this.activeFilters[key] = this.activeFilters[key].filter(v => v !== value);
      }

      if (this.activeFilters[key].length === 0) {
        delete this.activeFilters[key];
      }

      this.onFilterUpdate();
    }

    /**
     * Update range filter
     */
    updateRangeFilter(key, value) {
      if (value === '' || value === null) {
        delete this.activeFilters[key];
      } else {
        this.activeFilters[key] = value;
      }

      this.onFilterUpdate();
    }

    /**
     * Update select filter
     */
    updateSelectFilter(key, value) {
      if (value === '' || value === null) {
        delete this.activeFilters[key];
      } else {
        this.activeFilters[key] = value;
      }

      this.onFilterUpdate();
    }

    /**
     * Update radio filter
     */
    updateRadioFilter(key, value) {
      this.activeFilters[key] = value;
      this.onFilterUpdate();
    }

    /**
     * Remove a filter
     */
    removeFilter(key) {
      delete this.activeFilters[key];
      this.onFilterUpdate();
      this.render();
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
      this.activeFilters = {};
      this.onFilterUpdate();
      this.render();
    }

    /**
     * Handle filter update
     */
    onFilterUpdate() {
      this.saveFilters();

      if (this.options.onFilterChange) {
        this.options.onFilterChange(this.activeFilters);
      }
    }

    /**
     * Get filter label for display
     */
    getFilterLabel(key, value) {
      // Find the filter definition
      const filter = this.options.filters.find(
        f => f.key === key || f.key === key.replace(/_min|_max/, '')
      );

      if (!filter) {
        return `${key}: ${value}`;
      }

      // Handle range filters
      if (key.endsWith('_min')) {
        return `${filter.label} ≥ ${value}`;
      }
      if (key.endsWith('_max')) {
        return `${filter.label} ≤ ${value}`;
      }

      // Handle array values (checkboxes)
      if (Array.isArray(value)) {
        const labels = value.map(v => {
          const option = filter.options?.find(o => o.value === v);
          return option ? option.label : v;
        });
        return `${filter.label}: ${labels.join(', ')}`;
      }

      // Handle single values
      const option = filter.options?.find(o => o.value === value);
      const label = option ? option.label : value;
      return `${filter.label}: ${label}`;
    }

    /**
     * Get active filters
     */
    getFilters() {
      return { ...this.activeFilters };
    }

    /**
     * Set filters programmatically
     */
    setFilters(filters) {
      this.activeFilters = { ...filters };
      this.saveFilters();
      this.render();
    }

    /**
     * Update facet counts
     */
    updateFacets(facets) {
      this.facets = facets;
      this.render();
    }

    /**
     * Build SQL WHERE clause from filters
     */
    buildWhereClause() {
      const conditions = [];
      const params = [];

      Object.entries(this.activeFilters).forEach(([key, value]) => {
        if (key.endsWith('_min')) {
          const column = key.replace('_min', '');
          conditions.push(`${column} >= $${params.length + 1}`);
          params.push(value);
        } else if (key.endsWith('_max')) {
          const column = key.replace('_max', '');
          conditions.push(`${column} <= $${params.length + 1}`);
          params.push(value);
        } else if (Array.isArray(value) && value.length > 0) {
          conditions.push(`${key} = ANY($${params.length + 1})`);
          params.push(value);
        } else if (value) {
          conditions.push(`${key} = $${params.length + 1}`);
          params.push(value);
        }
      });

      return {
        clause: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
        params
      };
    }
  }

  // Export to window
  window.AdvancedFilters = AdvancedFilters;
})();

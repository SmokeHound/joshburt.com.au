/**
 * Search Autocomplete Component
 * Phase 3.1 of UPGRADE_PLAN.md
 * 
 * Provides real-time search suggestions with keyboard navigation
 * Features:
 * - Real-time suggestions as user types
 * - Keyboard navigation (up/down arrows, enter, escape)
 * - Recent searches support
 * - Click outside to close
 * - Debounced API calls
 */

(function() {
  'use strict';

  const FN_BASE = window.FN_BASE || '/.netlify/functions';
  
  /**
   * SearchAutocomplete class
   */
  class SearchAutocomplete {
    constructor(inputElement, options = {}) {
      this.input = inputElement;
      this.options = {
        minChars: 2,
        debounceMs: 300,
        maxSuggestions: 5,
        onSelect: null,
        ...options
      };
      
      this.container = null;
      this.suggestions = [];
      this.selectedIndex = -1;
      this.debounceTimer = null;
      
      this.init();
    }

    /**
     * Initialize autocomplete
     */
    init() {
      // Create suggestions container
      this.createContainer();
      
      // Bind event listeners
      this.input.addEventListener('input', this.handleInput.bind(this));
      this.input.addEventListener('keydown', this.handleKeydown.bind(this));
      this.input.addEventListener('focus', this.handleFocus.bind(this));
      document.addEventListener('click', this.handleClickOutside.bind(this));
    }

    /**
     * Create suggestions container
     */
    createContainer() {
      this.container = document.createElement('div');
      this.container.className = 'search-autocomplete-container absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden max-h-80 overflow-y-auto';
      this.container.setAttribute('role', 'listbox');
      
      // Insert after input
      this.input.parentNode.style.position = 'relative';
      this.input.parentNode.appendChild(this.container);
    }

    /**
     * Handle input event
     */
    handleInput(e) {
      const query = e.target.value.trim();
      
      // Clear suggestions if query too short
      if (query.length < this.options.minChars) {
        this.hideSuggestions();
        return;
      }
      
      // Debounce API call
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.fetchSuggestions(query);
      }, this.options.debounceMs);
    }

    /**
     * Handle focus event
     */
    handleFocus(e) {
      const query = e.target.value.trim();
      if (query.length >= this.options.minChars) {
        this.fetchSuggestions(query);
      }
    }

    /**
     * Handle keydown for navigation
     */
    handleKeydown(e) {
      if (!this.container.classList.contains('hidden')) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            this.selectNext();
            break;
          case 'ArrowUp':
            e.preventDefault();
            this.selectPrevious();
            break;
          case 'Enter':
            e.preventDefault();
            if (this.selectedIndex >= 0) {
              this.selectSuggestion(this.suggestions[this.selectedIndex]);
            } else {
              // Submit search with current input value
              if (this.options.onSelect) {
                this.options.onSelect({ text: this.input.value, source: 'manual' });
              }
            }
            break;
          case 'Escape':
            this.hideSuggestions();
            break;
        }
      }
    }

    /**
     * Handle click outside to close
     */
    handleClickOutside(e) {
      if (!this.input.contains(e.target) && !this.container.contains(e.target)) {
        this.hideSuggestions();
      }
    }

    /**
     * Fetch suggestions from API
     */
    async fetchSuggestions(query) {
      try {
        const response = await fetch(
          `${FN_BASE}/search?suggest=${encodeURIComponent(query)}&limit=${this.options.maxSuggestions}`
        );
        
        if (!response.ok) {
          console.error('Failed to fetch suggestions:', response.statusText);
          return;
        }
        
        const data = await response.json();
        this.suggestions = data.suggestions || [];
        this.renderSuggestions();
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        this.hideSuggestions();
      }
    }

    /**
     * Render suggestions in container
     */
    renderSuggestions() {
      if (this.suggestions.length === 0) {
        this.hideSuggestions();
        return;
      }
      
      this.container.innerHTML = '';
      this.selectedIndex = -1;
      
      this.suggestions.forEach((suggestion, index) => {
        const item = document.createElement('div');
        item.className = 'search-autocomplete-item px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between';
        item.setAttribute('role', 'option');
        item.setAttribute('data-index', index);
        
        // Suggestion text
        const textSpan = document.createElement('span');
        textSpan.textContent = suggestion.text;
        textSpan.className = 'text-gray-900 dark:text-gray-100';
        item.appendChild(textSpan);
        
        // Source badge
        const badge = document.createElement('span');
        badge.className = 'text-xs px-2 py-1 rounded-full';
        
        switch (suggestion.source) {
          case 'recent':
            badge.textContent = 'Recent';
            badge.className += ' bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            break;
          case 'product':
            badge.textContent = 'Product';
            badge.className += ' bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            break;
          case 'consumable':
            badge.textContent = 'Consumable';
            badge.className += ' bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            break;
          case 'filter':
            badge.textContent = 'Filter';
            badge.className += ' bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            break;
        }
        item.appendChild(badge);
        
        // Click handler
        item.addEventListener('click', () => {
          this.selectSuggestion(suggestion);
        });
        
        this.container.appendChild(item);
      });
      
      this.container.classList.remove('hidden');
    }

    /**
     * Select next suggestion
     */
    selectNext() {
      if (this.selectedIndex < this.suggestions.length - 1) {
        this.selectedIndex++;
        this.updateSelection();
      }
    }

    /**
     * Select previous suggestion
     */
    selectPrevious() {
      if (this.selectedIndex > 0) {
        this.selectedIndex--;
        this.updateSelection();
      } else if (this.selectedIndex === 0) {
        this.selectedIndex = -1;
        this.updateSelection();
      }
    }

    /**
     * Update visual selection
     */
    updateSelection() {
      const items = this.container.querySelectorAll('.search-autocomplete-item');
      items.forEach((item, index) => {
        if (index === this.selectedIndex) {
          item.classList.add('bg-gray-100', 'dark:bg-gray-700');
          item.setAttribute('aria-selected', 'true');
          
          // Update input with selected suggestion
          this.input.value = this.suggestions[index].text;
        } else {
          item.classList.remove('bg-gray-100', 'dark:bg-gray-700');
          item.setAttribute('aria-selected', 'false');
        }
      });
    }

    /**
     * Select a suggestion
     */
    selectSuggestion(suggestion) {
      this.input.value = suggestion.text;
      this.hideSuggestions();
      
      if (this.options.onSelect) {
        this.options.onSelect(suggestion);
      }
    }

    /**
     * Hide suggestions
     */
    hideSuggestions() {
      this.container.classList.add('hidden');
      this.suggestions = [];
      this.selectedIndex = -1;
    }

    /**
     * Destroy autocomplete
     */
    destroy() {
      this.input.removeEventListener('input', this.handleInput);
      this.input.removeEventListener('keydown', this.handleKeydown);
      this.input.removeEventListener('focus', this.handleFocus);
      document.removeEventListener('click', this.handleClickOutside);
      
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      
      clearTimeout(this.debounceTimer);
    }
  }

  // Export to window
  window.SearchAutocomplete = SearchAutocomplete;

  /**
   * Helper function to initialize autocomplete on an input
   */
  window.initSearchAutocomplete = function(selector, options) {
    const input = typeof selector === 'string' 
      ? document.querySelector(selector)
      : selector;
    
    if (!input) {
      console.error('Search input not found:', selector);
      return null;
    }
    
    return new SearchAutocomplete(input, options);
  };

})();

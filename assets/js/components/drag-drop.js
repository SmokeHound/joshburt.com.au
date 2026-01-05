/**
 * Drag and Drop Component
 * Wrapper around SortableJS for drag-and-drop functionality
 *
 * Usage:
 * const dragDrop = new DragDrop('list-id', {
 *   onSort: (event) => console.log('Item moved'),
 *   handle: '.drag-handle',
 *   animation: 150
 * });
 */

class DragDrop {
  constructor(elementId, options = {}) {
    this.element = document.getElementById(elementId);
    if (!this.element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    this.options = {
      animation: options.animation || 150,
      handle: options.handle || null,
      ghostClass: options.ghostClass || 'sortable-ghost',
      chosenClass: options.chosenClass || 'sortable-chosen',
      dragClass: options.dragClass || 'sortable-drag',
      group: options.group || null,
      disabled: options.disabled || false,
      onSort: options.onSort || null,
      onStart: options.onStart || null,
      onEnd: options.onEnd || null,
      onAdd: options.onAdd || null,
      onRemove: options.onRemove || null
    };

    this.sortable = null;
    this.init();
  }

  async init() {
    // Load SortableJS if not already loaded
    if (typeof Sortable === 'undefined') {
      await this.loadSortableJS();
    }

    this.createSortable();
  }

  loadSortableJS() {
    return new Promise((resolve, reject) => {
      // Check if already loading
      if (window.__sortableJSLoading) {
        const checkInterval = setInterval(() => {
          if (typeof Sortable !== 'undefined') {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        return;
      }

      window.__sortableJSLoading = true;

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js';
      script.onload = () => {
        window.__sortableJSLoading = false;
        resolve();
      };
      script.onerror = () => {
        window.__sortableJSLoading = false;
        reject(new Error('Failed to load SortableJS'));
      };
      document.head.appendChild(script);
    });
  }

  createSortable() {
    const sortableOptions = {
      animation: this.options.animation,
      ghostClass: this.options.ghostClass,
      chosenClass: this.options.chosenClass,
      dragClass: this.options.dragClass,
      disabled: this.options.disabled,
      onStart: (event) => {
        if (this.options.onStart) {
          this.options.onStart(event);
        }
      },
      onEnd: (event) => {
        if (this.options.onEnd) {
          this.options.onEnd(event);
        }
      },
      onSort: (event) => {
        if (this.options.onSort) {
          this.options.onSort(event);
        }
      },
      onAdd: (event) => {
        if (this.options.onAdd) {
          this.options.onAdd(event);
        }
      },
      onRemove: (event) => {
        if (this.options.onRemove) {
          this.options.onRemove(event);
        }
      }
    };

    if (this.options.handle) {
      sortableOptions.handle = this.options.handle;
    }

    if (this.options.group) {
      sortableOptions.group = this.options.group;
    }

    // eslint-disable-next-line no-undef
    this.sortable = Sortable.create(this.element, sortableOptions);
  }

  enable() {
    if (this.sortable) {
      this.sortable.option('disabled', false);
    }
  }

  disable() {
    if (this.sortable) {
      this.sortable.option('disabled', true);
    }
  }

  destroy() {
    if (this.sortable) {
      this.sortable.destroy();
      this.sortable = null;
    }
  }

  getOrder() {
    if (!this.sortable) {return [];}
    return this.sortable.toArray();
  }

  setOrder(order) {
    if (!this.sortable) {return;}
    this.sortable.sort(order);
  }
}

// Utility function to add default drag-drop styles
DragDrop.addDefaultStyles = function() {
  if (document.getElementById('drag-drop-styles')) {return;}

  const style = document.createElement('style');
  style.id = 'drag-drop-styles';
  style.textContent = `
    .sortable-ghost {
      opacity: 0.4;
      background: rgba(59, 130, 246, 0.1);
      border: 2px dashed #3b82f6;
    }

    .sortable-chosen {
      cursor: grabbing !important;
    }

    .sortable-drag {
      opacity: 0.8;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }

    .drag-handle {
      cursor: grab;
      user-select: none;
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    [draggable="true"] {
      cursor: move;
    }
  `;
  document.head.appendChild(style);
};

// Auto-add default styles when script loads
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DragDrop.addDefaultStyles());
  } else {
    DragDrop.addDefaultStyles();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DragDrop;
}

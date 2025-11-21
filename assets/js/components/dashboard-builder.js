/**
 * Dashboard Builder Component
 * Provides customizable dashboard with drag-and-drop widget management
 *
 * Usage:
 * const dashboard = new DashboardBuilder('dashboard-container', {
 *   widgets: [...],
 *   columns: 3,
 *   onSave: (layout) => console.log('Saved', layout)
 * });
 */

class DashboardBuilder {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    this.options = {
      widgets: options.widgets || [],
      columns: options.columns || 3,
      gap: options.gap || 16,
      editable: options.editable !== false,
      onSave: options.onSave || null,
      onWidgetAdd: options.onWidgetAdd || null,
      onWidgetRemove: options.onWidgetRemove || null,
      onLayoutChange: options.onLayoutChange || null,
      storageKey: options.storageKey || 'dashboard-layout'
    };

    this.state = {
      editMode: false,
      widgets: [...this.options.widgets],
      layout: []
    };

    this.dragDrop = null;
    this.init();
  }

  init() {
    this.loadLayout();
    this.render();
  }

  loadLayout() {
    try {
      const saved = localStorage.getItem(this.options.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state.layout = parsed.layout || [];

        // Restore widget order if layout exists
        if (this.state.layout.length > 0) {
          const orderedWidgets = [];
          this.state.layout.forEach(widgetId => {
            const widget = this.state.widgets.find(w => w.id === widgetId);
            if (widget) {orderedWidgets.push(widget);}
          });

          // Add any new widgets not in saved layout
          this.state.widgets.forEach(widget => {
            if (!orderedWidgets.find(w => w.id === widget.id)) {
              orderedWidgets.push(widget);
            }
          });

          this.state.widgets = orderedWidgets;
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard layout:', error);
    }
  }

  saveLayout() {
    try {
      const layout = {
        layout: this.state.widgets.map(w => w.id),
        timestamp: Date.now()
      };

      localStorage.setItem(this.options.storageKey, JSON.stringify(layout));

      if (this.options.onSave) {
        this.options.onSave(layout);
      }

      return true;
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
      return false;
    }
  }

  resetLayout() {
    try {
      localStorage.removeItem(this.options.storageKey);
      this.state.widgets = [...this.options.widgets];
      this.state.layout = [];
      this.render();
      return true;
    } catch (error) {
      console.error('Failed to reset dashboard layout:', error);
      return false;
    }
  }

  toggleEditMode() {
    this.state.editMode = !this.state.editMode;
    this.render();
  }

  addWidget(widget) {
    if (!widget.id) {
      widget.id = `widget-${Date.now()}`;
    }

    this.state.widgets.push(widget);
    this.render();

    if (this.options.onWidgetAdd) {
      this.options.onWidgetAdd(widget);
    }
  }

  removeWidget(widgetId) {
    const index = this.state.widgets.findIndex(w => w.id === widgetId);
    if (index > -1) {
      const removed = this.state.widgets.splice(index, 1)[0];
      this.render();

      if (this.options.onWidgetRemove) {
        this.options.onWidgetRemove(removed);
      }
    }
  }

  getWidgets() {
    return this.state.widgets;
  }

  setWidgets(widgets) {
    this.state.widgets = widgets;
    this.render();
  }

  render() {
    const gridCols = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 lg:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
    };

    const gridClass = gridCols[this.options.columns] || gridCols[3];
    const gapClass = `gap-${Math.floor(this.options.gap / 4)}`;

    this.container.innerHTML = `
      <div class="dashboard-builder">
        ${this.renderToolbar()}
        <div id="dashboard-grid" class="grid ${gridClass} ${gapClass} ${this.state.editMode ? 'edit-mode' : ''}">
          ${this.state.widgets.map(widget => this.renderWidget(widget)).join('')}
        </div>
      </div>
    `;

    this.attachEventListeners();

    if (this.state.editMode && this.options.editable) {
      this.initializeDragDrop();
    }
  }

  renderToolbar() {
    if (!this.options.editable) {return '';}

    return `
      <div class="dashboard-toolbar flex items-center justify-between mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div class="flex items-center gap-4">
          <h3 class="text-lg font-semibold text-white">Dashboard</h3>
          ${this.state.editMode ? `
            <span class="px-2 py-1 bg-blue-600 text-white text-xs rounded">Edit Mode</span>
          ` : ''}
        </div>
        <div class="flex gap-2">
          <button class="dashboard-edit-btn px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
            ${this.state.editMode ? 'Done Editing' : 'Edit Dashboard'}
          </button>
          ${this.state.editMode ? `
            <button class="dashboard-save-btn px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors">
              Save Layout
            </button>
            <button class="dashboard-reset-btn px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors">
              Reset
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderWidget(widget) {
    return `
      <div class="dashboard-widget ${widget.className || ''}" data-widget-id="${widget.id}">
        <div class="widget-card bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          ${this.state.editMode ? this.renderWidgetHeader(widget) : ''}
          <div class="widget-content p-6">
            ${widget.render ? widget.render() : widget.content || ''}
          </div>
        </div>
      </div>
    `;
  }

  renderWidgetHeader(widget) {
    return `
      <div class="widget-header flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div class="flex items-center gap-2">
          <span class="drag-handle cursor-move text-gray-400 hover:text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
            </svg>
          </span>
          <span class="text-sm font-medium text-white">${widget.title || 'Widget'}</span>
        </div>
        <button class="widget-remove-btn text-gray-400 hover:text-red-500 transition-colors" data-widget-id="${widget.id}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  }

  attachEventListeners() {
    // Edit button
    const editBtn = this.container.querySelector('.dashboard-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.toggleEditMode());
    }

    // Save button
    const saveBtn = this.container.querySelector('.dashboard-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (this.saveLayout()) {
          this.showNotification('Dashboard layout saved', 'success');
        } else {
          this.showNotification('Failed to save layout', 'error');
        }
      });
    }

    // Reset button
    const resetBtn = this.container.querySelector('.dashboard-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the dashboard to default layout?')) {
          if (this.resetLayout()) {
            this.showNotification('Dashboard layout reset', 'success');
          }
        }
      });
    }

    // Remove widget buttons
    const removeButtons = this.container.querySelectorAll('.widget-remove-btn');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const widgetId = btn.getAttribute('data-widget-id');
        if (confirm('Remove this widget from the dashboard?')) {
          this.removeWidget(widgetId);
        }
      });
    });
  }

  async initializeDragDrop() {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) {return;}

    // Load DragDrop component if not already loaded
    if (typeof DragDrop === 'undefined') {
      console.warn('DragDrop component not loaded. Drag functionality will be disabled.');
      return;
    }

    // Destroy existing instance
    if (this.dragDrop) {
      this.dragDrop.destroy();
    }

    // Create new drag-drop instance
    // eslint-disable-next-line no-undef
    this.dragDrop = new DragDrop('dashboard-grid', {
      handle: '.drag-handle',
      animation: 150,
      onSort: () => {
        this.updateWidgetOrder();
        if (this.options.onLayoutChange) {
          this.options.onLayoutChange(this.getWidgets());
        }
      }
    });
  }

  updateWidgetOrder() {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) {return;}

    const widgetElements = grid.querySelectorAll('.dashboard-widget');
    const newOrder = [];

    widgetElements.forEach(el => {
      const widgetId = el.getAttribute('data-widget-id');
      const widget = this.state.widgets.find(w => w.id === widgetId);
      if (widget) {
        newOrder.push(widget);
      }
    });

    this.state.widgets = newOrder;
  }

  showNotification(message, type = 'info') {
    // Use the existing notification system if available
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  destroy() {
    if (this.dragDrop) {
      this.dragDrop.destroy();
    }
    this.container.innerHTML = '';
  }
}

// Utility function to add dashboard styles
DashboardBuilder.addDefaultStyles = function() {
  if (document.getElementById('dashboard-builder-styles')) {return;}

  const style = document.createElement('style');
  style.id = 'dashboard-builder-styles';
  style.textContent = `
    .dashboard-widget {
      transition: all 0.2s ease;
    }

    .dashboard-grid.edit-mode .dashboard-widget {
      cursor: move;
    }

    .widget-card {
      transition: all 0.2s ease;
      height: 100%;
    }

    .dashboard-grid.edit-mode .widget-card:hover {
      border-color: #3b82f6;
      box-shadow: 0 4px 20px rgba(59, 130, 246, 0.2);
    }

    .drag-handle {
      cursor: grab;
    }

    .drag-handle:active {
      cursor: grabbing;
    }
  `;
  document.head.appendChild(style);
};

// Auto-add default styles when script loads
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DashboardBuilder.addDefaultStyles());
  } else {
    DashboardBuilder.addDefaultStyles();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardBuilder;
}

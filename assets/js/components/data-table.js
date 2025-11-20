/**
 * Data Table Component
 * Provides sorting, filtering, and pagination for tabular data
 * 
 * Usage:
 * const table = new DataTable('table-id', {
 *   data: [...],
 *   columns: [...],
 *   pageSize: 10,
 *   sortable: true,
 *   filterable: true
 * });
 */

class DataTable {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    this.options = {
      data: options.data || [],
      columns: options.columns || [],
      pageSize: options.pageSize || 10,
      sortable: options.sortable !== false,
      filterable: options.filterable !== false,
      paginated: options.paginated !== false,
      selectable: options.selectable || false,
      onRowClick: options.onRowClick || null,
      onSelectionChange: options.onSelectionChange || null,
      className: options.className || '',
    };

    this.state = {
      currentPage: 1,
      sortColumn: null,
      sortDirection: 'asc',
      filterText: '',
      selectedRows: new Set(),
    };

    this.init();
  }

  init() {
    this.render();
  }

  setData(data) {
    this.options.data = data;
    this.state.currentPage = 1;
    this.state.selectedRows.clear();
    this.render();
  }

  getData() {
    return this.options.data;
  }

  getSelectedRows() {
    return Array.from(this.state.selectedRows).map(index => this.options.data[index]);
  }

  clearSelection() {
    this.state.selectedRows.clear();
    this.render();
  }

  filterData(data) {
    if (!this.state.filterText) return data;

    const filterLower = this.state.filterText.toLowerCase();
    return data.filter(row => {
      return this.options.columns.some(col => {
        const value = this.getCellValue(row, col);
        return String(value).toLowerCase().includes(filterLower);
      });
    });
  }

  sortData(data) {
    if (!this.state.sortColumn) return data;

    const sorted = [...data].sort((a, b) => {
      const aVal = this.getCellValue(a, this.state.sortColumn);
      const bVal = this.getCellValue(b, this.state.sortColumn);

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return this.state.sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  paginateData(data) {
    if (!this.options.paginated) return data;

    const start = (this.state.currentPage - 1) * this.options.pageSize;
    const end = start + this.options.pageSize;
    return data.slice(start, end);
  }

  getCellValue(row, column) {
    if (typeof column.field === 'function') {
      return column.field(row);
    }
    return row[column.field];
  }

  handleSort(column) {
    if (!column.sortable && column.sortable !== undefined) return;
    if (!this.options.sortable) return;

    if (this.state.sortColumn === column) {
      this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.sortColumn = column;
      this.state.sortDirection = 'asc';
    }

    this.render();
  }

  handleFilter(event) {
    this.state.filterText = event.target.value;
    this.state.currentPage = 1;
    this.render();
  }

  handlePageChange(page) {
    this.state.currentPage = page;
    this.render();
  }

  handleRowSelect(index, originalIndex) {
    if (this.state.selectedRows.has(originalIndex)) {
      this.state.selectedRows.delete(originalIndex);
    } else {
      this.state.selectedRows.add(originalIndex);
    }
    this.render();
    
    if (this.options.onSelectionChange) {
      this.options.onSelectionChange(this.getSelectedRows());
    }
  }

  handleRowClick(row, index) {
    if (this.options.onRowClick) {
      this.options.onRowClick(row, index);
    }
  }

  render() {
    const filtered = this.filterData(this.options.data);
    const sorted = this.sortData(filtered);
    const paginated = this.paginateData(sorted);

    const totalPages = this.options.paginated
      ? Math.ceil(filtered.length / this.options.pageSize)
      : 1;

    this.container.innerHTML = `
      <div class="data-table-wrapper ${this.options.className}">
        ${this.renderFilter()}
        <div class="overflow-x-auto">
          ${this.renderTable(paginated, filtered)}
        </div>
        ${this.renderPagination(totalPages, filtered.length)}
      </div>
    `;

    this.attachEventListeners();
  }

  renderFilter() {
    if (!this.options.filterable) return '';

    return `
      <div class="mb-4">
        <input
          type="text"
          class="data-table-filter w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          placeholder="Search..."
          value="${this.state.filterText}"
        />
      </div>
    `;
  }

  renderTable(data, allFilteredData) {
    const tableClass = `data-table w-full border-collapse ${this.options.selectable ? 'selectable' : ''}`;
    
    return `
      <table class="${tableClass}">
        <thead>
          <tr class="bg-gray-800 border-b border-gray-700">
            ${this.options.selectable ? '<th class="p-3 text-left w-12"></th>' : ''}
            ${this.options.columns.map(col => this.renderHeaderCell(col)).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.length > 0 
            ? data.map((row, idx) => this.renderRow(row, idx, allFilteredData)).join('')
            : `<tr><td colspan="${this.options.columns.length + (this.options.selectable ? 1 : 0)}" class="p-8 text-center text-gray-400">No data available</td></tr>`
          }
        </tbody>
      </table>
    `;
  }

  renderHeaderCell(column) {
    const sortable = this.options.sortable && (column.sortable !== false);
    const isSorted = this.state.sortColumn === column;
    const sortIcon = isSorted 
      ? (this.state.sortDirection === 'asc' ? '↑' : '↓')
      : '';

    return `
      <th
        class="p-3 text-left ${sortable ? 'cursor-pointer hover:bg-gray-700' : ''}"
        ${sortable ? `data-sort-field="${column.field}"` : ''}
      >
        <div class="flex items-center gap-2">
          <span>${column.label}</span>
          ${sortable ? `<span class="sort-indicator text-blue-400">${sortIcon}</span>` : ''}
        </div>
      </th>
    `;
  }

  renderRow(row, index, allFilteredData) {
    const originalIndex = this.options.data.indexOf(allFilteredData[index + (this.state.currentPage - 1) * this.options.pageSize]);
    const isSelected = this.state.selectedRows.has(originalIndex);
    const rowClass = `border-b border-gray-700 hover:bg-gray-800 transition-colors ${isSelected ? 'selected bg-blue-900/30' : ''}`;

    return `
      <tr class="${rowClass}" data-row-index="${index}" data-original-index="${originalIndex}">
        ${this.options.selectable ? `
          <td class="p-3">
            <input
              type="checkbox"
              class="row-selector form-checkbox h-5 w-5 text-blue-600 rounded border-gray-600 bg-gray-700"
              ${isSelected ? 'checked' : ''}
            />
          </td>
        ` : ''}
        ${this.options.columns.map(col => this.renderCell(row, col)).join('')}
      </tr>
    `;
  }

  renderCell(row, column) {
    const value = this.getCellValue(row, column);
    const formatted = column.render ? column.render(value, row) : value;

    return `
      <td class="p-3 ${column.className || ''}">
        ${formatted !== null && formatted !== undefined ? formatted : ''}
      </td>
    `;
  }

  renderPagination(totalPages, totalItems) {
    if (!this.options.paginated || totalPages <= 1) return '';

    const maxButtons = 5;
    let startPage = Math.max(1, this.state.currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return `
      <div class="flex items-center justify-between mt-4 text-sm">
        <div class="text-gray-400">
          Showing ${(this.state.currentPage - 1) * this.options.pageSize + 1} to ${Math.min(this.state.currentPage * this.options.pageSize, totalItems)} of ${totalItems} entries
        </div>
        <div class="flex gap-2">
          <button
            class="pagination-btn px-3 py-1 bg-gray-800 border border-gray-600 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            data-page="${this.state.currentPage - 1}"
            ${this.state.currentPage === 1 ? 'disabled' : ''}
          >
            Previous
          </button>
          ${pages.map(page => `
            <button
              class="pagination-btn px-3 py-1 border rounded ${page === this.state.currentPage 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-gray-800 border-gray-600 hover:bg-gray-700'}"
              data-page="${page}"
            >
              ${page}
            </button>
          `).join('')}
          <button
            class="pagination-btn px-3 py-1 bg-gray-800 border border-gray-600 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            data-page="${this.state.currentPage + 1}"
            ${this.state.currentPage === totalPages ? 'disabled' : ''}
          >
            Next
          </button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Filter input
    const filterInput = this.container.querySelector('.data-table-filter');
    if (filterInput) {
      filterInput.addEventListener('input', (e) => this.handleFilter(e));
    }

    // Sort headers
    const sortHeaders = this.container.querySelectorAll('th[data-sort-field]');
    sortHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const field = header.getAttribute('data-sort-field');
        const column = this.options.columns.find(col => col.field === field);
        if (column) this.handleSort(column);
      });
    });

    // Pagination buttons
    const paginationBtns = this.container.querySelectorAll('.pagination-btn');
    paginationBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.getAttribute('data-page'), 10);
        if (!isNaN(page) && page > 0) {
          this.handlePageChange(page);
        }
      });
    });

    // Row selection
    if (this.options.selectable) {
      const rowSelectors = this.container.querySelectorAll('.row-selector');
      rowSelectors.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const row = e.target.closest('tr');
          const index = parseInt(row.getAttribute('data-row-index'), 10);
          const originalIndex = parseInt(row.getAttribute('data-original-index'), 10);
          this.handleRowSelect(index, originalIndex);
        });
      });
    }

    // Row clicks
    const rows = this.container.querySelectorAll('tbody tr');
    rows.forEach(row => {
      row.addEventListener('click', (e) => {
        // Don't trigger if clicking checkbox
        if (e.target.type === 'checkbox') return;
        
        const index = parseInt(row.getAttribute('data-row-index'), 10);
        const filtered = this.filterData(this.options.data);
        const sorted = this.sortData(filtered);
        const actualIndex = (this.state.currentPage - 1) * this.options.pageSize + index;
        if (sorted[actualIndex]) {
          this.handleRowClick(sorted[actualIndex], actualIndex);
        }
      });
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataTable;
}

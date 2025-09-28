// Consumables Product Management Page Logic
// Loads, adds, edits, deletes consumable products from API or local JSON

// (Identical to previous logic, just filename changed)
document.addEventListener('DOMContentLoaded', function() {
  const tableContainer = document.getElementById('products-table-container');
  const addBtn = document.getElementById('addProductBtn');
  const modal = document.getElementById('product-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('product-form');
  const cancelModal = document.getElementById('cancel-modal');
  const productsCount = document.getElementById('products-count');

  let products = [];
  let editingId = null;

  // Utility
  function showModal(edit = false, product = {}) {
    modal.classList.remove('hidden');
    modalTitle.textContent = edit ? 'Edit Product' : 'Add Product';
    form.reset();
    editingId = edit ? product.id : null;
    document.getElementById('product-id').value = product.id || '';
    document.getElementById('product-name').value = product.name || '';
    document.getElementById('product-type').value = product.type || '';
    document.getElementById('product-category').value = product.category || '';
    document.getElementById('product-code').value = product.code || '';
  }
  function hideModal() {
    modal.classList.add('hidden');
    editingId = null;
  }

  // CRUD
  async function loadProducts() {
    try {
      // Try API first
      const res = await fetch('/.netlify/functions/consumables');
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      products = Array.isArray(data) ? data : (data.products || []);
    } catch (e) {
      // Fallback to local
      const res = await fetch('data/consumables.json');
      const data = await res.json();
      products = Array.isArray(data) ? data : (data.products || []);
    }
    renderTable();
  }

  function renderTable() {
    productsCount.textContent = `${products.length} products`;
    if (!products.length) {
      tableContainer.innerHTML = '<div class="p-6 text-center text-gray-500">No consumable products found.</div>';
      return;
    }
    tableContainer.innerHTML = `
      <table class="min-w-full bg-white dark:bg-gray-800 rounded shadow">
        <thead>
          <tr>
            <th class="p-2 text-left">Name</th>
            <th class="p-2 text-left">Type</th>
            <th class="p-2 text-left">Category</th>
            <th class="p-2 text-left">Code</th>
            <th class="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p => `
            <tr>
              <td class="p-2">${escapeHtml(p.name)}</td>
              <td class="p-2">${escapeHtml(p.type)}</td>
              <td class="p-2">${escapeHtml(p.category)}</td>
              <td class="p-2">${escapeHtml(p.code)}</td>
              <td class="p-2">
                <button class="text-blue-600 hover:underline mr-2" data-edit="${p.id}">Edit</button>
                <button class="text-red-600 hover:underline" data-delete="${p.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    // Attach edit/delete
    tableContainer.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => onEdit(btn.getAttribute('data-edit')));
    });
    tableContainer.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => onDelete(btn.getAttribute('data-delete')));
    });
  }

  function onEdit(id) {
    const product = products.find(p => String(p.id) === String(id));
    if (product) showModal(true, product);
  }
  function onDelete(id) {
    if (!confirm('Delete this product?')) return;
    products = products.filter(p => String(p.id) !== String(id));
    renderTable();
    saveProducts();
  }
  function onAdd() {
    showModal(false);
  }
  function onSubmit(e) {
    e.preventDefault();
    const id = editingId || Date.now();
    const name = document.getElementById('product-name').value.trim();
    const type = document.getElementById('product-type').value.trim();
    const category = document.getElementById('product-category').value.trim();
    const code = document.getElementById('product-code').value.trim();
    if (!name || !type || !category) return;
    if (editingId) {
      // Edit
      const idx = products.findIndex(p => String(p.id) === String(editingId));
      if (idx > -1) products[idx] = { id, name, type, category, code };
    } else {
      // Add
      products.push({ id, name, type, category, code });
    }
    renderTable();
    saveProducts();
    hideModal();
  }
  function saveProducts() {
    // Try to save to API, else localStorage
    // (API not implemented, so fallback)
    localStorage.setItem('consumablesProducts', JSON.stringify(products));
  }

  // Modal events
  addBtn.addEventListener('click', onAdd);
  cancelModal.addEventListener('click', hideModal);
  form.addEventListener('submit', onSubmit);
  modal.addEventListener('click', e => { if (e.target === modal) hideModal(); });

  // Escape HTML
  function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
  }

  // Load from localStorage if present
  function loadFromLocal() {
    const local = localStorage.getItem('consumablesProducts');
    if (local) {
      try {
        products = JSON.parse(local);
        renderTable();
        return true;
      } catch {}
    }
    return false;
  }

  // Init
  if (!loadFromLocal()) loadProducts();
});

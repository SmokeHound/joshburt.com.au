// Consumables Product Management Page Logic
// Loads, adds, edits, deletes consumable products from API with fallback to local JSON

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

  // API Functions
  async function loadProducts() {
    try {
      showToast('Loading consumables...', 'info');
      const res = await fetch('/.netlify/functions/consumables');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      products = Array.isArray(data) ? data : (data.products || []);
      renderTable();
      showToast(`Loaded ${products.length} consumables from database`, 'success');
    } catch (e) {
      console.error('Failed to load from API:', e);
      showToast('Database unavailable, loading from local files...', 'error');
      // Fallback to local JSON
      try {
        const res = await fetch('data/consumables.json');
        const data = await res.json();
        products = Array.isArray(data) ? data : (data.products || []);
        renderTable();
        showToast(`Loaded ${products.length} consumables from local files`, 'success');
      } catch (localError) {
        console.error('Failed to load from local files:', localError);
        showToast('Failed to load consumables data', 'error');
      }
    }
  }

  async function saveProductToAPI(productData, isUpdate = false) {
    try {
      const url = '/.netlify/functions/consumables';
      const method = isUpdate ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API save error:', error);
      throw error;
    }
  }

  async function deleteProductFromAPI(productId) {
    try {
      const response = await fetch('/.netlify/functions/consumables', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: productId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API delete error:', error);
      throw error;
    }
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
  
  async function onDelete(id) {
    if (!confirm('Delete this product?')) return;
    
    try {
      await deleteProductFromAPI(id);
      showToast('Consumable deleted successfully!', 'success');
      await loadProducts(); // Reload from API
    } catch (error) {
      showToast(`Error deleting consumable: ${error.message}`, 'error');
      console.error('Delete error:', error);
    }
  }
  
  function onAdd() {
    showModal(false);
  }
  
  async function onSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('product-name').value.trim();
    const type = document.getElementById('product-type').value.trim();
    const category = document.getElementById('product-category').value.trim();
    const code = document.getElementById('product-code').value.trim();
    
    if (!name || !type || !category) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    
    const productData = { name, type, category, code };
    
    try {
      if (editingId) {
        // Edit
        productData.id = editingId;
        await saveProductToAPI(productData, true);
        showToast('Consumable updated successfully!', 'success');
      } else {
        // Add
        await saveProductToAPI(productData, false);
        showToast('Consumable added successfully!', 'success');
      }
      
      hideModal();
      await loadProducts(); // Reload from API
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
      console.error('Save error:', error);
    }
  }

  // Toast notification utility
  function showToast(message, type = 'info') {
    // Create toast if it doesn't exist
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'fixed bottom-4 right-4 p-4 text-white rounded shadow-lg transition-opacity duration-300 hidden';
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `fixed bottom-4 right-4 p-4 text-white rounded shadow-lg transition-opacity duration-300 ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
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

  // Init
  loadProducts();
});

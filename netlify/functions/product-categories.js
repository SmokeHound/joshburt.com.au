// Netlify Function: Product Categories CRUD
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');

exports.handler = withHandler(async function(event) {
  await database.connect();

  const method = event.httpMethod;
  if (method === 'GET') return handleGet(event);
  if (method === 'POST') return handlePost(event);
  if (method === 'PUT') return handlePut(event);
  if (method === 'DELETE') return handleDelete(event);
  return error(405, 'Method Not Allowed');

  async function handleGet(event) {
    // Categories can be read by all authenticated users
    const { user, response: authResponse } = await requirePermission(event, 'products', 'read');
    if (authResponse) return authResponse;
    
    try {
      const params = event.queryStringParameters || {};
      const { is_active, include_product_count } = params;

      let query = 'SELECT * FROM product_categories WHERE 1=1';
      const queryParams = [];

      if (is_active !== undefined) {
        query += ' AND is_active = ?';
        queryParams.push(is_active === 'true' || is_active === true);
      }

      query += ' ORDER BY display_order, name';

      const categories = await database.all(query, queryParams);

      // Optionally include product count per category
      if (include_product_count === 'true') {
        for (const category of categories) {
          const countResult = await database.get(
            'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
            [category.id]
          );
          category.product_count = countResult.count || 0;
        }
      }

      return ok(categories);
    } catch (e) {
      console.error('GET /product-categories error:', e);
      return error(500, 'Failed to fetch categories');
    }
  }

  async function handlePost(event) {
    // Only admins and managers can create categories
    const { user, response: authResponse } = await requirePermission(event, 'products', 'create');
    if (authResponse) return authResponse;
    
    try {
      const body = parseBody(event);
      const { name, description, parent_id, display_order, is_active } = body;
      
      if (!name) {
        return error(400, 'Missing required field: name');
      }

      const query = `
        INSERT INTO product_categories (name, description, parent_id, display_order, is_active)
        VALUES (?, ?, ?, ?, ?)
      `;
      const params = [
        name,
        description || null,
        parent_id || null,
        display_order || 0,
        is_active !== undefined ? is_active : true
      ];
      
      const result = await database.run(query, params);
      
      return ok({ 
        id: result.id,
        message: 'Category created successfully',
        category: { id: result.id, name, description, parent_id, display_order, is_active }
      }, 201);
    } catch (e) {
      console.error('POST /product-categories error:', e);
      if (e.message && e.message.includes('UNIQUE constraint')) {
        return error(409, 'Category name already exists');
      }
      return error(500, 'Failed to create category');
    }
  }

  async function handlePut(event) {
    // Only admins and managers can update categories
    const { user, response: authResponse } = await requirePermission(event, 'products', 'update');
    if (authResponse) return authResponse;
    
    try {
      const body = parseBody(event);
      const { id, name, description, parent_id, display_order, is_active } = body;
      
      if (!id || !name) {
        return error(400, 'Missing required fields: id, name');
      }

      const query = `
        UPDATE product_categories 
        SET name = ?, description = ?, parent_id = ?, display_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const params = [
        name,
        description || null,
        parent_id || null,
        display_order || 0,
        is_active !== undefined ? is_active : true,
        id
      ];
      
      const result = await database.run(query, params);
      
      if (result.changes === 0) {
        return error(404, 'Category not found');
      }

      return ok({
        message: 'Category updated successfully',
        category: { id, name, description, parent_id, display_order, is_active }
      });
    } catch (e) {
      console.error('PUT /product-categories error:', e);
      if (e.message && e.message.includes('UNIQUE constraint')) {
        return error(409, 'Category name already exists');
      }
      return error(500, 'Failed to update category');
    }
  }

  async function handleDelete(event) {
    // Only admins can delete categories
    const { user, response: authResponse } = await requirePermission(event, 'products', 'delete');
    if (authResponse) return authResponse;
    
    try {
      const { id } = parseBody(event);
      
      if (!id) {
        return error(400, 'Missing required field: id');
      }

      // Check if category has products
      const productCheck = await database.get(
        'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
        [id]
      );

      if (productCheck.count > 0) {
        return error(400, `Cannot delete category with ${productCheck.count} associated products`);
      }

      const result = await database.run('DELETE FROM product_categories WHERE id = ?', [id]);
      
      if (result.changes === 0) {
        return error(404, 'Category not found');
      }

      return ok({ message: 'Category deleted successfully' });
    } catch (e) {
      console.error('DELETE /product-categories error:', e);
      return error(500, 'Failed to delete category');
    }
  }
});

// Netlify Function: Full CRUD /netlify/functions/products
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const { logAudit } = require('../../utils/audit');

exports.handler = withHandler(async function(event) {
  // Initialize database connection (idempotent)
  await database.connect();

  const method = event.httpMethod;
  if (method === 'GET') return handleGet(event);
  if (method === 'POST') return handlePost(event);
  if (method === 'PUT') return handlePut(event);
  if (method === 'DELETE') return handleDelete(event);
  return error(405, 'Method Not Allowed');

  async function handleGet(event) {
    // Products can be read by all authenticated users
    const { user, response: authResponse } = await requirePermission(event, 'products', 'read');
    if (authResponse) return authResponse;
    
    try {
      const params = event.queryStringParameters || {};
      const {
        search,
        category_id,
        type,
        is_active,
        page = 1,
        limit = 50
      } = params;

      // Build query with filters
      let query = 'SELECT p.*, pc.name as category_name FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.id WHERE 1=1';
      const queryParams = [];

      // Search functionality (full-text search on name, description, specs)
      if (search) {
        query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.specs LIKE ? OR p.code LIKE ?)';
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      // Filter by category
      if (category_id) {
        query += ' AND p.category_id = ?';
        queryParams.push(parseInt(category_id));
      }

      // Filter by type (legacy support)
      if (type) {
        query += ' AND p.type = ?';
        queryParams.push(type);
      }

      // Filter by active status
      if (is_active !== undefined) {
        query += ' AND p.is_active = ?';
        queryParams.push(is_active === 'true' || is_active === true);
      }

      // Add ordering
      query += ' ORDER BY p.name';

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ' LIMIT ? OFFSET ?';
      queryParams.push(parseInt(limit), offset);

      const products = await database.all(query, queryParams);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM products p WHERE 1=1';
      const countParams = [];
      
      if (search) {
        countQuery += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.specs LIKE ? OR p.code LIKE ?)';
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
      if (category_id) {
        countQuery += ' AND p.category_id = ?';
        countParams.push(parseInt(category_id));
      }
      if (type) {
        countQuery += ' AND p.type = ?';
        countParams.push(type);
      }
      if (is_active !== undefined) {
        countQuery += ' AND p.is_active = ?';
        countParams.push(is_active === 'true' || is_active === true);
      }

      const countResult = await database.get(countQuery, countParams);
      const total = countResult.total || 0;

      return ok({
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (e) {
      console.error('GET /products error:', e);
      return error(500, 'Failed to fetch products');
    }
  }

  async function handlePost(event) {
    // Only admins and managers can create products
    const { user, response: authResponse } = await requirePermission(event, 'products', 'create');
    if (authResponse) return authResponse;
    
    try {
      const body = parseBody(event);
      const { name, code, type, specs, description, image, category_id, stock_quantity, is_active } = body;
      if (!name || !code || !type) {
        return error(400, 'Missing required fields: name, code, type');
      }
      const query = `
        INSERT INTO products (name, code, type, specs, description, image, category_id, stock_quantity, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        name, 
        code, 
        type, 
        specs || '', 
        description || '', 
        image || '',
        category_id || null,
        stock_quantity || 0,
        is_active !== undefined ? is_active : true
      ];
      const result = await database.run(query, params);
      
      // Log product creation
      await logAudit(event, {
        action: 'product.create',
        userId: user.id,
        details: {
          productId: result.id,
          name,
          code,
          type,
          categoryId: category_id
        }
      });
      
      return ok({ 
        id: result.id,
        message: 'Product created successfully',
        product: { id: result.id, name, code, type, specs, description, image, category_id, stock_quantity, is_active }
      }, 201);
    } catch (e) {
      console.error('POST /products error:', e);
      if (e.message && e.message.includes('UNIQUE constraint')) {
        return error(409, 'Product code already exists');
      }
      return error(500, 'Failed to create product');
    }
  }

  async function handlePut(event) {
    // Only admins and managers can update products
    const { user, response: authResponse } = await requirePermission(event, 'products', 'update');
    if (authResponse) return authResponse;
    
    try {
      const body = parseBody(event);
      const { id, name, code, type, specs, description, image, category_id, stock_quantity, is_active } = body;
      if (!id || !name || !code || !type) {
        return error(400, 'Missing required fields: id, name, code, type');
      }
      const query = `
        UPDATE products 
        SET name = ?, code = ?, type = ?, specs = ?, description = ?, image = ?, 
            category_id = ?, stock_quantity = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const params = [
        name, 
        code, 
        type, 
        specs || '', 
        description || '', 
        image || '', 
        category_id || null,
        stock_quantity !== undefined ? stock_quantity : 0,
        is_active !== undefined ? is_active : true,
        id
      ];
      const result = await database.run(query, params);
      if (result.changes === 0) {
        return error(404, 'Product not found');
      }
      
      return ok({
        message: 'Product updated successfully',
        product: { id, name, code, type, specs, description, image, category_id, stock_quantity, is_active }
      });
    } catch (e) {
      console.error('PUT /products error:', e);
      if (e.message && e.message.includes('UNIQUE constraint')) {
        return error(409, 'Product code already exists');
      }
      return error(500, 'Failed to update product');
    }
  }

  async function handleDelete(event) {
    // Only admins can delete products
    const { user, response: authResponse } = await requirePermission(event, 'products', 'delete');
    if (authResponse) return authResponse;
    
    try {
      const { id } = parseBody(event);
      if (!id) return error(400, 'Missing required field: id');
      const result = await database.run('DELETE FROM products WHERE id = ?', [id]);
      if (result.changes === 0) return error(404, 'Product not found');
      
      return ok({ message: 'Product deleted successfully' });
    } catch (e) {
      console.error('DELETE /products error:', e);
      return error(500, 'Failed to delete product');
    }
  }
});
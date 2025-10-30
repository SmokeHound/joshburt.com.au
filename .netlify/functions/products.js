// Netlify Function: Full CRUD /.netlify/functions/products
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const cache = require('../../utils/cache');

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
      const type = event.queryStringParameters?.type;
      const cacheKey = type ? `type:${type}` : 'all';
      
      // Try cache first (2 minute TTL)
      const cachedProducts = cache.get('products', cacheKey);
      if (cachedProducts) {
        return ok(cachedProducts, 200, { 'X-Cache': 'HIT' });
      }
      
      let query = 'SELECT * FROM products ORDER BY name';
      let params = [];
      // Optional filter by type
      if (type) {
        query = 'SELECT * FROM products WHERE type = ? ORDER BY name';
        params = [type];
      }
      const products = await database.all(query, params);
      
      // Cache for 2 minutes (120 seconds)
      cache.set('products', cacheKey, products, 120);
      
      return ok(products, 200, { 'X-Cache': 'MISS' });
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
      const { name, code, type, specs, description, image } = body;
      if (!name || !code || !type) {
        return error(400, 'Missing required fields: name, code, type');
      }
      const query = `
        INSERT INTO products (name, code, type, specs, description, image)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const params = [name, code, type, specs || '', description || '', image || ''];
      const result = await database.run(query, params);
      
      // Invalidate products cache on create
      cache.clearNamespace('products');
      
      return ok({ 
        id: result.id,
        message: 'Product created successfully',
        product: { id: result.id, name, code, type, specs, description, image }
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
      const { id, name, code, type, specs, description, image } = body;
      if (!id || !name || !code || !type) {
        return error(400, 'Missing required fields: id, name, code, type');
      }
      const query = `
        UPDATE products 
        SET name = ?, code = ?, type = ?, specs = ?, description = ?, image = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const params = [name, code, type, specs || '', description || '', image || '', id];
      const result = await database.run(query, params);
      if (result.changes === 0) {
        return error(404, 'Product not found');
      }
      
      // Invalidate products cache on update
      cache.clearNamespace('products');
      
      return ok({
        message: 'Product updated successfully',
        product: { id, name, code, type, specs, description, image }
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
      
      // Invalidate products cache on delete
      cache.clearNamespace('products');
      
      return ok({ message: 'Product deleted successfully' });
    } catch (e) {
      console.error('DELETE /products error:', e);
      return error(500, 'Failed to delete product');
    }
  }
});
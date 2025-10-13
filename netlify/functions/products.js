const { withHandler, json, error, parseBody, requireAuth, corsHeaders } = require('../../utils/fn');
const { database } = require('../../config/database');

async function listProducts(event) {
  try {
    const q = (event.queryStringParameters && (event.queryStringParameters.q || event.queryStringParameters.search)) || '';
    const type = event.queryStringParameters && event.queryStringParameters.type;
    const where = [];
    const params = [];
    if (q) { 
      const pat = `%${String(q).toLowerCase()}%`;
      where.push('(LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(type) LIKE ?)'); 
      params.push(pat, pat, pat); 
    }
    if (type) { where.push('type = ?'); params.push(type); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Left join inventory to get stock
    const sql = `
      SELECT p.id, p.name, p.code, p.type, p.specs, p.description, p.image,
             p.model_qty, p.soh, COALESCE(i.stock_count, p.soh) AS currentStock
      FROM products p
      LEFT JOIN inventory i ON i.item_type = 'product' AND i.item_id = p.id
      ${whereSql}
      ORDER BY p.name ASC
    `;
    const rows = await database.all(sql, params);
    return json(200, Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error('listProducts', e);
    return error(500, 'Failed to fetch products');
  }
}

async function createProduct(event, user) {
  try {
    const body = parseBody(event);
    const { name, code, type, specs = '', description = '', image = '', model_qty, currentStock } = body;
    if (!name || !code || !type || !specs) return error(400, 'Missing required fields');

    const sohVal = (typeof currentStock === 'number') ? Math.max(0, currentStock) : null;
    const insert = await database.run(
      'INSERT INTO products (name, code, type, specs, description, image, model_qty, soh) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, code, type, specs, description, image, (typeof model_qty === 'number' ? model_qty : null), sohVal]
    );
    const id = insert.id;
    if (typeof currentStock === 'number') {
      // Upsert inventory
      await upsertInventory('product', id, Math.max(0, currentStock));
    }
    const created = await database.get(
      'SELECT p.*, COALESCE(i.stock_count, p.soh) AS currentStock FROM products p LEFT JOIN inventory i ON i.item_type = ? AND i.item_id = p.id WHERE p.id = ?',
      ['product', id]
    );
    return json(201, created);
  } catch (e) {
    console.error('createProduct', e);
    return error(500, 'Failed to create product');
  }
}

async function updateProduct(event, user) {
  try {
    const body = parseBody(event);
    const { id, name, code, type, specs, description, image, model_qty, currentStock } = body;
    if (!id) return error(400, 'Product id is required');

    // Build dynamic update
    const sets = [];
    const params = [];
    if (name !== undefined) { sets.push('name = ?'); params.push(name); }
    if (code !== undefined) { sets.push('code = ?'); params.push(code); }
    if (type !== undefined) { sets.push('type = ?'); params.push(type); }
    if (specs !== undefined) { sets.push('specs = ?'); params.push(specs); }
    if (description !== undefined) { sets.push('description = ?'); params.push(description); }
    if (image !== undefined) { sets.push('image = ?'); params.push(image); }
    if (model_qty !== undefined) { sets.push('model_qty = ?'); params.push(model_qty); }
    if (currentStock !== undefined) { sets.push('soh = ?'); params.push(Math.max(0, parseInt(currentStock, 10) || 0)); }
    if (sets.length) {
      params.push(id);
      await database.run(`UPDATE products SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    }
    if (currentStock !== undefined) {
      await upsertInventory('product', id, Math.max(0, parseInt(currentStock, 10) || 0));
    }
    const updated = await database.get(
      'SELECT p.*, COALESCE(i.stock_count, p.soh) AS currentStock FROM products p LEFT JOIN inventory i ON i.item_type = ? AND i.item_id = p.id WHERE p.id = ?',
      ['product', id]
    );
    return json(200, updated || { id });
  } catch (e) {
    console.error('updateProduct', e);
    return error(500, 'Failed to update product');
  }
}

async function deleteProduct(event, user) {
  try {
    const body = parseBody(event);
    const { id } = body;
    if (!id) return error(400, 'Product id is required');
    await database.run('DELETE FROM products WHERE id = ?', [id]);
    await database.run('DELETE FROM inventory WHERE item_type = \'product\' AND item_id = ?', [id]);
    return json(200, { ok: true });
  } catch (e) {
    console.error('deleteProduct', e);
    return error(500, 'Failed to delete product');
  }
}

async function upsertInventory(itemType, itemId, stock) {
  // Try update first
  const updated = await database.run(
    'UPDATE inventory SET stock_count = ? WHERE item_type = ? AND item_id = ?',
    [stock, itemType, itemId]
  );
  if (updated && updated.changes > 0) return;
  // Insert if not existing
  try {
    await database.run(
      'INSERT INTO inventory (item_type, item_id, stock_count) VALUES (?, ?, ?)',
      [itemType, itemId, stock]
    );
  } catch (e) {
    // Handle race: try update again
    await database.run(
      'UPDATE inventory SET stock_count = ? WHERE item_type = ? AND item_id = ?',
      [stock, itemType, itemId]
    );
  }
}

exports.handler = withHandler(async (event) => {
  // CORS preflight handled by withHandler
  // Support pseudo-subpath for import: /.netlify/functions/products/import
  if (event.path && /\/products\/import$/i.test(event.path)) {
    return error(405, 'Use dedicated import function or POST CSV not supported here');
  }

  if (event.httpMethod === 'GET') {
    return listProducts(event);
  }
  if (event.httpMethod === 'POST') {
    const { user, response } = await requireAuth(event, ['admin', 'manager']);
    if (response) return response;
    return createProduct(event, user);
  }
  if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
    const { user, response } = await requireAuth(event, ['admin', 'manager']);
    if (response) return response;
    return updateProduct(event, user);
  }
  if (event.httpMethod === 'DELETE') {
    const { user, response } = await requireAuth(event, ['admin', 'manager']);
    if (response) return response;
    return deleteProduct(event, user);
  }

  return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
});

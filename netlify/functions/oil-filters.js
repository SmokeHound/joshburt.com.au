// Netlify Function: Full CRUD /.netlify/functions/oil-filters
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { logAudit } = require('../../utils/audit');
const { requirePermission } = require('../../utils/http');

exports.handler = withHandler(async function(event){
  await database.connect();
  const method = event.httpMethod;
  if (method === 'GET') return handleGet(event);
  if (method === 'POST') return handlePost(event);
  if (method === 'PUT') return handlePut(event);
  if (method === 'DELETE') return handleDelete(event);
  return error(405, 'Method Not Allowed');

  async function handleGet(event) {
    try {
      let query = 'SELECT * FROM oil_filters WHERE is_active = true ORDER BY name';
      let params = [];
      
      // Optional filters
      const { type, search, include_inactive } = event.queryStringParameters || {};
      
      if (include_inactive === 'true') {
        query = 'SELECT * FROM oil_filters ORDER BY name';
      }
      
      if (type && include_inactive === 'true') {
        query = 'SELECT * FROM oil_filters WHERE type = ? ORDER BY name';
        params = [type];
      } else if (type) {
        query = 'SELECT * FROM oil_filters WHERE type = ? AND is_active = true ORDER BY name';
        params = [type];
      }
      
      if (search) {
        if (type) {
          query = 'SELECT * FROM oil_filters WHERE type = ? AND (name LIKE ? OR code LIKE ? OR description LIKE ?) AND is_active = true ORDER BY name';
          params = [type, `%${search}%`, `%${search}%`, `%${search}%`];
        } else {
          query = 'SELECT * FROM oil_filters WHERE (name LIKE ? OR code LIKE ? OR description LIKE ?) AND is_active = true ORDER BY name';
          params = [`%${search}%`, `%${search}%`, `%${search}%`];
        }
      }
      
      const filters = await database.all(query, params);
      return ok(filters);
    } catch (e) {
      console.error('GET /oil-filters error:', e);
      return error(500, 'Failed to fetch oil filters');
    }
  }

  async function handlePost(event) {
    try {
      const { user, response: authResponse } = await requirePermission(event, 'oil_filters', 'create');
      if (authResponse) return authResponse;
      
      const body = parseBody(event);
      const { name, code, type, description, model_qty, stock_quantity, reorder_point } = body;
      
      if (!name || !code || !type) {
        return error(400, 'Missing required fields: name, code, type');
      }
      
      const query = `
        INSERT INTO oil_filters (name, code, type, description, model_qty, stock_quantity, reorder_point)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        name, 
        code, 
        type, 
        description || '', 
        model_qty || 0,
        stock_quantity || 0,
        reorder_point || 0
      ];
      
      const result = await database.run(query, params);
      await logAudit(event, { 
        action: 'oil_filter.create', 
        userId: user && user.id, 
        details: { id: result.id, name, code, type } 
      });
      
      return ok({
        id: result.id,
        message: 'Oil filter created successfully',
        filter: { id: result.id, name, code, type, description, model_qty, stock_quantity, reorder_point }
      }, 201);
    } catch (e) {
      console.error('POST /oil-filters error:', e);
      if (e.message && e.message.includes('UNIQUE constraint')) {
        return error(409, 'Oil filter code already exists');
      }
      return error(500, 'Failed to create oil filter');
    }
  }

  async function handlePut(event) {
    try {
      const { user, response: authResponse } = await requirePermission(event, 'oil_filters', 'update');
      if (authResponse) return authResponse;
      
      const body = parseBody(event);
      const { id, name, code, type, description, model_qty, stock_quantity, reorder_point, is_active } = body;
      
      if (!id || !name || !code || !type) {
        return error(400, 'Missing required fields: id, name, code, type');
      }
      
      const query = `
        UPDATE oil_filters 
        SET name = ?, code = ?, type = ?, description = ?, model_qty = ?, stock_quantity = ?, reorder_point = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const params = [
        name, 
        code, 
        type, 
        description || '', 
        model_qty || 0,
        stock_quantity || 0,
        reorder_point || 0,
        is_active !== undefined ? is_active : true,
        id
      ];
      
      const result = await database.run(query, params);
      if (result.changes === 0) return error(404, 'Oil filter not found');
      
      await logAudit(event, { 
        action: 'oil_filter.update', 
        userId: user && user.id, 
        details: { id, name, code, type } 
      });
      
      return ok({
        message: 'Oil filter updated successfully',
        filter: { id, name, code, type, description, model_qty, stock_quantity, reorder_point, is_active }
      });
    } catch (e) {
      console.error('PUT /oil-filters error:', e);
      if (e.message && e.message.includes('UNIQUE constraint')) {
        return error(409, 'Oil filter code already exists');
      }
      return error(500, 'Failed to update oil filter');
    }
  }

  async function handleDelete(event) {
    try {
      const { user, response: authResponse } = await requirePermission(event, 'oil_filters', 'delete');
      if (authResponse) return authResponse;
      
      const { id } = parseBody(event);
      if (!id) return error(400, 'Missing required field: id');
      
      const existing = await database.get('SELECT name, code FROM oil_filters WHERE id = ?', [id]);
      if (!existing) return error(404, 'Oil filter not found');
      
      const result = await database.run('DELETE FROM oil_filters WHERE id = ?', [id]);
      
      await logAudit(event, { 
        action: 'oil_filter.delete', 
        userId: user && user.id, 
        details: { id, name: existing.name, code: existing.code } 
      });
      
      return ok({ message: 'Oil filter deleted successfully' });
    } catch (e) {
      console.error('DELETE /oil-filters error:', e);
      return error(500, 'Failed to delete oil filter');
    }
  }
});

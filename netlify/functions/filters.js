// Netlify Function: Full CRUD /.netlify/functions/filters
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { logAudit } = require('../../utils/audit');
const { requirePermission } = require('../../utils/http');
const cache = require('../../utils/cache');

exports.handler = withHandler(async function (event) {
  await database.connect();
  const method = event.httpMethod;
  if (method === 'GET') return handleGet(event);
  if (method === 'POST') return handlePost(event);
  if (method === 'PUT') return handlePut(event);
  if (method === 'DELETE') return handleDelete(event);
  return error(405, 'Method Not Allowed');

  async function handleGet(event) {
    try {
      // Optional filters
      const { type, search, include_inactive } = event.queryStringParameters || {};
      
      // Generate cache key based on query parameters
      const cacheKey = `list:${type || 'all'}:${search || 'none'}:${include_inactive || 'false'}`;
      
      // Try cache first (2 minute TTL)
      const cached = cache.get('filters', cacheKey);
      if (cached) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            ...require('../../utils/http').corsHeaders
          },
          body: cached
        };
      }
      
      let query = 'SELECT * FROM filters WHERE is_active = true ORDER BY name';
      let params = [];

      if (include_inactive === 'true') {
        query = 'SELECT * FROM filters ORDER BY name';
      }

      if (type && include_inactive === 'true') {
        query = 'SELECT * FROM filters WHERE type = ? ORDER BY name';
        params = [type];
      } else if (type) {
        query = 'SELECT * FROM filters WHERE type = ? AND is_active = true ORDER BY name';
        params = [type];
      }

      if (search) {
        if (type) {
          query =
            'SELECT * FROM filters WHERE type = ? AND (name LIKE ? OR code LIKE ? OR description LIKE ?) AND is_active = true ORDER BY name';
          params = [type, `%${search}%`, `%${search}%`, `%${search}%`];
        } else {
          query =
            'SELECT * FROM filters WHERE (name LIKE ? OR code LIKE ? OR description LIKE ?) AND is_active = true ORDER BY name';
          params = [`%${search}%`, `%${search}%`, `%${search}%`];
        }
      }

      const filters = await database.all(query, params);
      
      // Cache the result for 2 minutes (120 seconds)
      const dataString = JSON.stringify(filters);
      cache.set('filters', cacheKey, dataString, 120);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
          ...require('../../utils/http').corsHeaders
        },
        body: dataString
      };
    } catch (e) {
      console.error('GET /filters error:', e);
      return error(500, 'Failed to fetch filters');
    }
  }

  async function handlePost(event) {
    try {
      const { user, response: authResponse } = await requirePermission(event, 'filters', 'create');
      if (authResponse) return authResponse;

      const body = parseBody(event);
      const { name, code, type, description, model_qty, stock_quantity, reorder_point } = body;

      if (!name || !code || !type) {
        return error(400, 'Missing required fields: name, code, type');
      }

      const query = `
        INSERT INTO filters (name, code, type, description, model_qty, stock_quantity, reorder_point)
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
        action: 'filter.create',
        userId: user && user.id,
        details: { id: result.id, name, code, type }
      });

      // Invalidate filters cache on create
      cache.clearNamespace('filters');

      return ok(
        {
          id: result.id,
          message: 'Filter created successfully',
          filter: {
            id: result.id,
            name,
            code,
            type,
            description,
            model_qty,
            stock_quantity,
            reorder_point
          }
        },
        201
      );
    } catch (e) {
      console.error('POST /filters error:', e);
      if (e.message && e.message.includes('UNIQUE constraint')) {
        return error(409, 'Filter code already exists');
      }
      return error(500, 'Failed to create filter');
    }
  }

  async function handlePut(event) {
    try {
      const { user, response: authResponse } = await requirePermission(event, 'filters', 'update');
      if (authResponse) return authResponse;

      const body = parseBody(event);
      const {
        id,
        name,
        code,
        type,
        description,
        model_qty,
        stock_quantity,
        reorder_point,
        is_active
      } = body;

      if (!id || !name || !code || !type) {
        return error(400, 'Missing required fields: id, name, code, type');
      }

      const query = `
        UPDATE filters 
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
      if (result.changes === 0) return error(404, 'Filter not found');

      await logAudit(event, {
        action: 'filter.update',
        userId: user && user.id,
        details: { id, name, code, type }
      });

      // Invalidate filters cache on update
      cache.clearNamespace('filters');

      return ok({
        message: 'Filter updated successfully',
        filter: {
          id,
          name,
          code,
          type,
          description,
          model_qty,
          stock_quantity,
          reorder_point,
          is_active
        }
      });
    } catch (e) {
      console.error('PUT /filters error:', e);
      if (e.message && e.message.includes('UNIQUE constraint')) {
        return error(409, 'Filter code already exists');
      }
      return error(500, 'Failed to update filter');
    }
  }

  async function handleDelete(event) {
    try {
      const { user, response: authResponse } = await requirePermission(event, 'filters', 'delete');
      if (authResponse) return authResponse;

      const { id } = parseBody(event);
      if (!id) return error(400, 'Missing required field: id');

      const existing = await database.get('SELECT name, code FROM filters WHERE id = ?', [id]);
      if (!existing) return error(404, 'Filter not found');

      const result = await database.run('DELETE FROM filters WHERE id = ?', [id]);

      await logAudit(event, {
        action: 'filter.delete',
        userId: user && user.id,
        details: { id, name: existing.name, code: existing.code }
      });

      // Invalidate filters cache on delete
      cache.clearNamespace('filters');

      return ok({ message: 'Filter deleted successfully' });
    } catch (e) {
      console.error('DELETE /filters error:', e);
      return error(500, 'Failed to delete filter');
    }
  }
});

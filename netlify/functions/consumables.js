// Netlify Function: Full CRUD /.netlify/functions/consumables
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
      const { type, category } = event.queryStringParameters || {};

      // Generate cache key based on filters
      const cacheKey = `list:${type || 'all'}:${category || 'all'}`;

      // Try cache first (2 minute TTL)
      const cached = cache.get('consumables', cacheKey);
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

      let query = 'SELECT * FROM consumables ORDER BY name';
      let params = [];
      if (type && category) {
        query = 'SELECT * FROM consumables WHERE type = ? AND category = ? ORDER BY name';
        params = [type, category];
      } else if (type) {
        query = 'SELECT * FROM consumables WHERE type = ? ORDER BY name';
        params = [type];
      } else if (category) {
        query = 'SELECT * FROM consumables WHERE category = ? ORDER BY name';
        params = [category];
      }
      const consumables = await database.all(query, params);

      // Cache the result for 2 minutes (120 seconds)
      const dataString = JSON.stringify(consumables);
      cache.set('consumables', cacheKey, dataString, 120);

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
      console.error('GET /consumables error:', e);
      return error(500, 'Failed to fetch consumables');
    }
  }

  async function handlePost(event) {
    try {
      const { user, response: authResponse } = await requirePermission(
        event,
        'consumables',
        'create'
      );
      if (authResponse) return authResponse;

      const body = parseBody(event);
      const { name, code, type, category, description } = body;
      if (!name || !type || !category) {
        return error(400, 'Missing required fields: name, type, category');
      }
      const query = `
        INSERT INTO consumables (name, code, type, category, description)
        VALUES (?, ?, ?, ?, ?)
      `;
      const params = [name, code || '', type, category, description || ''];
      const result = await database.run(query, params);
      await logAudit(event, {
        action: 'consumable.create',
        userId: user && user.id,
        details: { id: result.id, name, code, type, category }
      });

      // Invalidate consumables cache on create
      cache.clearNamespace('consumables');

      return ok(
        {
          id: result.id,
          message: 'Consumable created successfully',
          consumable: { id: result.id, name, code, type, category, description }
        },
        201
      );
    } catch (e) {
      console.error('POST /consumables error:', e);
      if (e.message && e.message.includes('UNIQUE constraint')) {
        return error(409, 'Consumable code already exists');
      }
      return error(500, 'Failed to create consumable');
    }
  }

  async function handlePut(event) {
    try {
      const { user, response: authResponse } = await requirePermission(
        event,
        'consumables',
        'update'
      );
      if (authResponse) return authResponse;

      const body = parseBody(event);
      const { id, name, code, type, category, description } = body;
      if (!id || !name || !type || !category) {
        return error(400, 'Missing required fields: id, name, type, category');
      }
      const query = `
        UPDATE consumables 
        SET name = ?, code = ?, type = ?, category = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const params = [name, code || '', type, category, description || '', id];
      const result = await database.run(query, params);
      if (result.changes === 0) return error(404, 'Consumable not found');
      await logAudit(event, {
        action: 'consumable.update',
        userId: user && user.id,
        details: { id, name, code, type, category }
      });

      // Invalidate consumables cache on update
      cache.clearNamespace('consumables');

      return ok({
        message: 'Consumable updated successfully',
        consumable: { id, name, code, type, category, description }
      });
    } catch (e) {
      console.error('PUT /consumables error:', e);
      if (e.message && e.message.includes('UNIQUE constraint')) {
        return error(409, 'Consumable code already exists');
      }
      return error(500, 'Failed to update consumable');
    }
  }

  async function handleDelete(event) {
    try {
      const { user, response: authResponse } = await requirePermission(
        event,
        'consumables',
        'delete'
      );
      if (authResponse) return authResponse;

      const { id } = parseBody(event);
      if (!id) return error(400, 'Missing required field: id');
      const existing = await database.get('SELECT name, code FROM consumables WHERE id = ?', [id]);
      if (!existing) return error(404, 'Consumable not found');
      const result = await database.run('DELETE FROM consumables WHERE id = ?', [id]);
      await logAudit(event, {
        action: 'consumable.delete',
        userId: user && user.id,
        details: { id, name: existing.name, code: existing.code }
      });

      // Invalidate consumables cache on delete
      cache.clearNamespace('consumables');

      return ok({ message: 'Consumable deleted successfully' });
    } catch (e) {
      console.error('DELETE /consumables error:', e);
      return error(500, 'Failed to delete consumable');
    }
  }
});

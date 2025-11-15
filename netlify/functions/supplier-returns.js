// Netlify Function: Full CRUD /.netlify/functions/supplier-returns
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { logAudit } = require('../../utils/audit');
const { requirePermission } = require('../../utils/http');

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
      const { user, response: authResponse } = await requirePermission(event, 'returns', 'read');
      if (authResponse) return authResponse;

      let query = 'SELECT * FROM supplier_returns ORDER BY return_date DESC';
      let params = [];

      // Optional filters
      const { status, supplier, date_from, date_to, search } = event.queryStringParameters || {};

      const conditions = [];

      if (status) {
        conditions.push('status = ?');
        params.push(status);
      }

      if (supplier) {
        conditions.push('supplier = ?');
        params.push(supplier);
      }

      if (date_from) {
        conditions.push('return_date >= ?');
        params.push(date_from);
      }

      if (date_to) {
        conditions.push('return_date <= ?');
        params.push(date_to);
      }

      if (search) {
        conditions.push(
          '(part_code LIKE ? OR part_name LIKE ? OR supplier LIKE ? OR inv_number LIKE ?)'
        );
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (conditions.length > 0) {
        query = `SELECT * FROM supplier_returns WHERE ${conditions.join(' AND ')} ORDER BY return_date DESC`;
      }

      const returns = await database.all(query, params);
      return ok(returns);
    } catch (e) {
      console.error('GET /supplier-returns error:', e);
      return error(500, 'Failed to fetch supplier returns');
    }
  }

  async function handlePost(event) {
    try {
      const { user, response: authResponse } = await requirePermission(event, 'returns', 'create');
      if (authResponse) return authResponse;

      const body = parseBody(event);
      const {
        return_date,
        inv_number,
        supplier,
        part_code,
        part_name,
        quantity,
        unit_price,
        return_reason,
        status,
        tracking_number,
        notes,
        credit_date,
        credit_number,
        credit_amount
      } = body;

      if (
        !return_date ||
        !supplier ||
        !part_code ||
        !part_name ||
        !quantity ||
        !unit_price ||
        !return_reason ||
        !status
      ) {
        return error(
          400,
          'Missing required fields: return_date, supplier, part_code, part_name, quantity, unit_price, return_reason, status'
        );
      }

      // Validate status
      const validStatuses = [
        'pending_shipment',
        'in_transit',
        'received_by_supplier',
        'under_review',
        'approved',
        'credited',
        'rejected'
      ];
      if (!validStatuses.includes(status)) {
        return error(400, 'Invalid status value');
      }

      // Validate return reason
      const validReasons = [
        'defective',
        'wrong_part',
        'warranty',
        'excess_stock',
        'customer_return',
        'other'
      ];
      if (!validReasons.includes(return_reason)) {
        return error(400, 'Invalid return_reason value');
      }

      // Validate credit requirements
      if (status === 'credited' && (!credit_date || !credit_amount)) {
        return error(400, 'credit_date and credit_amount are required when status is credited');
      }

      const query = `
        INSERT INTO supplier_returns (
          return_date, inv_number, supplier, part_code, part_name, 
          quantity, unit_price, return_reason, status, tracking_number, 
          notes, credit_date, credit_number, credit_amount, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        return_date,
        inv_number || null,
        supplier,
        part_code,
        part_name,
        quantity,
        unit_price,
        return_reason,
        status,
        tracking_number || null,
        notes || null,
        credit_date || null,
        credit_number || null,
        credit_amount || null,
        user && user.id
      ];

      const result = await database.run(query, params);

      await logAudit(event, {
        action: 'supplier_return.create',
        userId: user && user.id,
        details: { id: result.id, part_code, supplier, status }
      });

      // Fetch the created record to return with calculated total_value
      const created = await database.get('SELECT * FROM supplier_returns WHERE id = ?', [
        result.id
      ]);

      return ok(
        {
          id: result.id,
          message: 'Supplier return created successfully',
          return: created
        },
        201
      );
    } catch (e) {
      console.error('POST /supplier-returns error:', e);
      return error(500, 'Failed to create supplier return');
    }
  }

  async function handlePut(event) {
    try {
      const { user, response: authResponse } = await requirePermission(event, 'returns', 'update');
      if (authResponse) return authResponse;

      const body = parseBody(event);
      const {
        id,
        return_date,
        inv_number,
        supplier,
        part_code,
        part_name,
        quantity,
        unit_price,
        return_reason,
        status,
        tracking_number,
        notes,
        credit_date,
        credit_number,
        credit_amount
      } = body;

      if (
        !id ||
        !return_date ||
        !supplier ||
        !part_code ||
        !part_name ||
        !quantity ||
        !unit_price ||
        !return_reason ||
        !status
      ) {
        return error(
          400,
          'Missing required fields: id, return_date, supplier, part_code, part_name, quantity, unit_price, return_reason, status'
        );
      }

      // Validate status
      const validStatuses = [
        'pending_shipment',
        'in_transit',
        'received_by_supplier',
        'under_review',
        'approved',
        'credited',
        'rejected'
      ];
      if (!validStatuses.includes(status)) {
        return error(400, 'Invalid status value');
      }

      // Validate return reason
      const validReasons = [
        'defective',
        'wrong_part',
        'warranty',
        'excess_stock',
        'customer_return',
        'other'
      ];
      if (!validReasons.includes(return_reason)) {
        return error(400, 'Invalid return_reason value');
      }

      // Validate credit requirements
      if (status === 'credited' && (!credit_date || !credit_amount)) {
        return error(400, 'credit_date and credit_amount are required when status is credited');
      }

      const query = `
        UPDATE supplier_returns 
        SET return_date = ?, inv_number = ?, supplier = ?, part_code = ?, part_name = ?,
            quantity = ?, unit_price = ?, return_reason = ?, status = ?, tracking_number = ?,
            notes = ?, credit_date = ?, credit_number = ?, credit_amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const params = [
        return_date,
        inv_number || null,
        supplier,
        part_code,
        part_name,
        quantity,
        unit_price,
        return_reason,
        status,
        tracking_number || null,
        notes || null,
        credit_date || null,
        credit_number || null,
        credit_amount || null,
        id
      ];

      const result = await database.run(query, params);
      if (result.changes === 0) return error(404, 'Supplier return not found');

      await logAudit(event, {
        action: 'supplier_return.update',
        userId: user && user.id,
        details: { id, part_code, supplier, status }
      });

      // Fetch updated record with calculated total_value
      const updated = await database.get('SELECT * FROM supplier_returns WHERE id = ?', [id]);

      return ok({
        message: 'Supplier return updated successfully',
        return: updated
      });
    } catch (e) {
      console.error('PUT /supplier-returns error:', e);
      return error(500, 'Failed to update supplier return');
    }
  }

  async function handleDelete(event) {
    try {
      const { user, response: authResponse } = await requirePermission(event, 'returns', 'delete');
      if (authResponse) return authResponse;

      const { id } = parseBody(event);
      if (!id) return error(400, 'Missing required field: id');

      const existing = await database.get(
        'SELECT part_code, supplier FROM supplier_returns WHERE id = ?',
        [id]
      );
      if (!existing) return error(404, 'Supplier return not found');

      const result = await database.run('DELETE FROM supplier_returns WHERE id = ?', [id]);

      await logAudit(event, {
        action: 'supplier_return.delete',
        userId: user && user.id,
        details: { id, part_code: existing.part_code, supplier: existing.supplier }
      });

      return ok({ message: 'Supplier return deleted successfully' });
    } catch (e) {
      console.error('DELETE /supplier-returns error:', e);
      return error(500, 'Failed to delete supplier return');
    }
  }
});

// Netlify Function: CRUD & management /.netlify/functions/users
const bcrypt = require('bcryptjs');
const { database } = require('../../config/database');
const { parseBody, requireAuth } = require('../../utils/http');
const { getPagination, withHandler, ok, error } = require('../../utils/fn');
const { logAudit } = require('../../utils/audit');

function requireRole(user, roles) { return !!user && roles.includes(user.role); }

exports.handler = withHandler(async (event) => {
  const method = event.httpMethod;
  const pathParts = event.path.split('/').filter(Boolean);
  const maybeId = pathParts[pathParts.length - 1];
  const isStats = pathParts.includes('stats') && pathParts.includes('overview');
  const body = parseBody(event);

  // Stats endpoint: /users/stats/overview
  if (isStats) {
    const { user, response } = await requireAuth(event, ['admin','manager']);
    if (response) return response;
    const stats = await database.all(`SELECT 
      COUNT(*) as total_users,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
      SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
      SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as manager_users,
      SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regular_users,
      SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) as verified_users
    FROM users`);
    return ok({ stats: stats[0] || {} });
  }

  // Collection endpoints (no id)
  if (!/^[0-9]+$/.test(maybeId)) {
    if (method === 'GET') {
      const { user, response } = await requireAuth(event, ['admin','manager']);
      if (response) return response;
      const { page = 1, limit = 10, search = '', role = '' } = event.queryStringParameters || {};
      const offset = (page - 1) * limit;
      let query = 'SELECT id, email, name, role, is_active, email_verified, created_at FROM users';
      let countQuery = 'SELECT COUNT(*) as total FROM users';
      const params = []; const countParams = [];
      if (search) {
        query += ' WHERE (name LIKE ? OR email LIKE ?)';
        countQuery += ' WHERE (name LIKE ? OR email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`); countParams.push(`%${search}%`, `%${search}%`);
      }
      if (role) {
        const whereClause = search ? ' AND' : ' WHERE';
        query += `${whereClause} role = ?`; countQuery += `${whereClause} role = ?`;
        params.push(role); countParams.push(role);
      }
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit, 10), offset);
      const [usersList, countResult] = await Promise.all([
        database.all(query, params),
        database.get(countQuery, countParams)
      ]);
      return ok({ users: usersList, pagination: { page: parseInt(page,10), limit: parseInt(limit,10), total: countResult.total, pages: Math.ceil(countResult.total / limit) } });
    }
    if (method === 'POST') {
      const { user, response } = await requireAuth(event, ['admin']);
      if (response) return response;
      const { email, password, name, role = 'user' } = body;
      if (!email || !password || !name) return error(400, 'Validation failed');
      if (!['user','manager','admin'].includes(role)) return error(400, 'Invalid role');
      const existing = await database.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) return error(409, 'User already exists with this email');
      const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
      const hash = await bcrypt.hash(password, rounds);
      const result = await database.run('INSERT INTO users (email, name, password_hash, role, email_verified) VALUES (?, ?, ?, ?, ?)', [email, name, hash, role, 1]);
      const newUser = await database.get('SELECT id, email, name, role, is_active, email_verified, created_at FROM users WHERE id = ?', [result.id]);
      // Audit
      await logAudit(event, { action: 'user.create', userId: user.id, details: { id: result.id, email, role } });
      return ok({ message: 'User created successfully', user: newUser }, 201);
    }
    return error(405, 'Method not allowed');
  }

  // Individual resource by numeric id
  const id = parseInt(maybeId, 10);
  if (Number.isNaN(id)) return error(400, 'Invalid user id');

  if (method === 'GET') {
    const { user, response } = await requireAuth(event, ['admin','manager']);
    if (response) return response;
    const u = await database.get('SELECT id, email, name, role, is_active, email_verified, avatar_url, created_at, updated_at FROM users WHERE id = ?', [id]);
    if (!u) return error(404, 'User not found');
    return ok({ user: u });
  }

  if (method === 'PUT' || method === 'PATCH') {
    const { user, response } = await requireAuth(event, null);
    if (response) return response;
    const isOwn = user.id === id; const isAdmin = user.role === 'admin';
    if (!isOwn && !isAdmin) return error(403, 'Insufficient permissions');
    const { name, role, is_active } = body;
    if (!isAdmin && (role !== undefined || is_active !== undefined)) return error(403, 'Cannot modify role or status');
    const updates = []; const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (role !== undefined && isAdmin) { if (!['user','manager','admin'].includes(role)) return error(400, 'Invalid role'); updates.push('role = ?'); values.push(role); }
    if (is_active !== undefined && isAdmin) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (!updates.length) return error(400, 'No valid updates provided');
    updates.push('updated_at = CURRENT_TIMESTAMP'); values.push(id);
    await database.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    const updated = await database.get('SELECT id, email, name, role, is_active, email_verified, updated_at FROM users WHERE id = ?', [id]);
    // Audit
    await logAudit(event, { action: 'user.update', userId: user.id, details: { id, isOwn, fields: updates.map(f=>f.split('=')[0].trim()) } });
    return ok({ message: 'User updated successfully', user: updated });
  }

  if (method === 'DELETE') {
    const { user, response } = await requireAuth(event, ['admin']);
    if (response) return response;
    if (user.id === id) return error(400, 'Cannot delete your own account');
    const exists = await database.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!exists) return error(404, 'User not found');
    await database.run('DELETE FROM refresh_tokens WHERE user_id = ?', [id]);
    await database.run('DELETE FROM users WHERE id = ?', [id]);
    // Audit
    await logAudit(event, { action: 'user.delete', userId: user.id, details: { id } });
    return ok({ message: 'User deleted successfully' });
  }

  return error(405, 'Method not allowed');
});

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { database } = require('../../config/database');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

const respond = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', ...corsHeaders }, body: JSON.stringify(body) });

async function authUser(event) {
  try {
    const auth = event.headers.authorization || event.headers.Authorization;
    if (!auth) return null;
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await database.get('SELECT id, email, name, role, is_active FROM users WHERE id = ?', [decoded.userId]);
    if (!user || !user.is_active) return null;
    return user;
  } catch { return null; }
}

function requireRole(user, roles) {
  if (!user) return false; return roles.includes(user.role);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders };
  const method = event.httpMethod;
  const pathParts = event.path.split('/').filter(Boolean); // ...functions, users, maybe id or stats
  const maybeId = pathParts[pathParts.length - 1];
  const isStats = pathParts.includes('stats') && pathParts.includes('overview');
  let body = {}; if (event.body) { try { body = JSON.parse(event.body); } catch(e){ /* ignore parse error */ } }
  const user = await authUser(event);

  try {
    // Stats endpoint: /users/stats/overview
    if (isStats) {
      if (!requireRole(user, ['admin','manager'])) return respond(403, { error: 'Insufficient permissions' });
      const stats = await database.all(`SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
        SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as manager_users,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regular_users,
        SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) as verified_users,
        SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) as new_users_30d
      FROM users`);
      return respond(200, { stats: stats[0] });
    }

    // Collection endpoints (no id)
    if (!/^[0-9]+$/.test(maybeId)) {
      if (method === 'GET') {
        if (!requireRole(user, ['admin','manager'])) return respond(403, { error: 'Insufficient permissions' });
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
        params.push(parseInt(limit), (page - 1) * limit);
        const [usersList, countResult] = await Promise.all([
          database.all(query, params),
          database.get(countQuery, countParams)
        ]);
        return respond(200, { users: usersList, pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult.total, pages: Math.ceil(countResult.total / limit) } });
      }
      if (method === 'POST') {
        if (!requireRole(user, ['admin'])) return respond(403, { error: 'Insufficient permissions' });
        const { email, password, name, role = 'user' } = body;
        if (!email || !password || !name) return respond(400, { error: 'Validation failed' });
        if (!['user','manager','admin'].includes(role)) return respond(400, { error: 'Invalid role' });
        const existing = await database.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) return respond(409, { error: 'User already exists with this email' });
        const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const hash = await bcrypt.hash(password, rounds);
        const result = await database.run('INSERT INTO users (email, name, password_hash, role, email_verified) VALUES (?, ?, ?, ?, ?)', [email, name, hash, role, 1]);
        const newUser = await database.get('SELECT id, email, name, role, is_active, email_verified, created_at FROM users WHERE id = ?', [result.id]);
        return respond(201, { message: 'User created successfully', user: newUser });
      }
      return respond(405, { error: 'Method not allowed' });
    }

    // Individual resource by numeric id
    const id = parseInt(maybeId, 10);
    if (Number.isNaN(id)) return respond(400, { error: 'Invalid user id' });

    if (method === 'GET') {
      if (!requireRole(user, ['admin','manager'])) return respond(403, { error: 'Insufficient permissions' });
      const u = await database.get('SELECT id, email, name, role, is_active, email_verified, avatar_url, created_at, updated_at FROM users WHERE id = ?', [id]);
      if (!u) return respond(404, { error: 'User not found' });
      return respond(200, { user: u });
    }
    if (method === 'PUT') {
      if (!user) return respond(401, { error: 'Authentication required' });
      const isOwn = user.id === id; const isAdmin = user.role === 'admin';
      if (!isOwn && !isAdmin) return respond(403, { error: 'Insufficient permissions' });
      const { name, role, is_active } = body;
      if (!isAdmin && (role !== undefined || is_active !== undefined)) return respond(403, { error: 'Cannot modify role or status' });
      const updates = []; const values = [];
      if (name !== undefined) { updates.push('name = ?'); values.push(name); }
      if (role !== undefined && isAdmin) { if (!['user','manager','admin'].includes(role)) return respond(400, { error: 'Invalid role' }); updates.push('role = ?'); values.push(role); }
      if (is_active !== undefined && isAdmin) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
      if (!updates.length) return respond(400, { error: 'No valid updates provided' });
      updates.push('updated_at = CURRENT_TIMESTAMP'); values.push(id);
      await database.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
      const updated = await database.get('SELECT id, email, name, role, is_active, email_verified, updated_at FROM users WHERE id = ?', [id]);
      return respond(200, { message: 'User updated successfully', user: updated });
    }
    if (method === 'DELETE') {
      if (!user || user.role !== 'admin') return respond(403, { error: 'Insufficient permissions' });
      if (user.id === id) return respond(400, { error: 'Cannot delete your own account' });
      const exists = await database.get('SELECT id FROM users WHERE id = ?', [id]);
      if (!exists) return respond(404, { error: 'User not found' });
      await database.run('DELETE FROM refresh_tokens WHERE user_id = ?', [id]);
      await database.run('DELETE FROM users WHERE id = ?', [id]);
      return respond(200, { message: 'User deleted successfully' });
    }
    // Password change: treat query param action=password or /users/{id}/password not implemented for brevity
    return respond(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Users function error', error);
    return respond(500, { error: 'Internal server error' });
  }
};

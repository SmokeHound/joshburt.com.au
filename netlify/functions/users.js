// Netlify Function: CRUD & management /.netlify/functions/users
const bcrypt = require('bcryptjs');
const { database, initializeDatabase } = require('../../config/database');
const { corsHeaders, parseBody, requireAuth, requirePermission } = require('../../utils/http');
const { getPagination, withHandler, ok, error } = require('../../utils/fn');
const { validatePassword } = require('../../utils/password');
const { isValidRole, hasPermission } = require('../../utils/rbac');
const { logAudit } = require('../../utils/audit');
const fs = require('fs');
const path = require('path');

// Predetermined avatar selection (fixed set of allowed URLs) - local assets
const PRESET_AVATARS = [
  '/assets/images/avatars/avatar-1.svg',
  '/assets/images/avatars/avatar-2.svg',
  '/assets/images/avatars/avatar-3.svg',
  '/assets/images/avatars/avatar-4.svg',
  '/assets/images/avatars/avatar-5.svg',
  '/assets/images/avatars/avatar-6.svg',
  '/assets/images/avatars/avatar-7.svg',
  '/assets/images/avatars/avatar-8.svg',
  '/assets/images/avatars/avatar-9.svg',
  '/assets/images/avatars/avatar-10.svg',
  '/assets/images/avatars/avatar-11.svg',
  '/assets/images/avatars/avatar-12.svg'
];

let dbInitialized = false;
exports.handler = withHandler(async event => {
  // Connect and initialize database (once per cold start)
  if (!dbInitialized) {
    await database.connect();
    try {
      await initializeDatabase();
    } catch (e) {
      // Log initialization errors but continue if tables already exist
      if (e.message && !e.message.includes('already exists')) {
        console.warn('Database initialization warning:', e.message);
      }
    }
    dbInitialized = true;
  }

  const method = event.httpMethod;
  const pathParts = event.path.split('/').filter(Boolean);
  const maybeId = pathParts[pathParts.length - 1];
  const isStats = pathParts.includes('stats') && pathParts.includes('overview');
  const body = parseBody(event);

  try {
    // Avatar selection endpoint: /users/:id/avatar
    if (pathParts.length >= 2 && pathParts[pathParts.length - 1] === 'avatar') {
      const idPart = pathParts[pathParts.length - 2];
      const uploadId = parseInt(idPart, 10);
      if (Number.isNaN(uploadId)) {
        return error(400, 'Invalid user id for avatar selection');
      }
      if (method !== 'POST' && method !== 'PUT') {
        return error(405, 'Method not allowed');
      }

      // Require authentication and permission (self or admin)
      const { user, response: authResponse } = await requireAuth(event);
      if (authResponse) {
        return authResponse;
      }
      const isOwn = user.id === uploadId;
      const canUpdate = isOwn || hasPermission(user, 'users', 'update');
      if (!canUpdate) {
        return error(403, 'Insufficient permissions');
      }

      // Support two modes: preset url OR dynamic initials
      const { avatarUrl, avatarType, initials, theme, style } = body || {};

      let storedUrl = null;

      if (avatarType === 'initials') {
        // Validate initials and options
        const safeInitials = String(initials || '')
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .slice(0, 3);
        if (!safeInitials) {
          return error(400, 'Missing or invalid initials');
        }
        const safeTheme = theme === 'light' || theme === 'dark' ? theme : 'dark';
        const safeStyle = style === 'outline' || style === 'solid' ? style : 'solid';
        storedUrl = `/.netlify/functions/avatar-initials?i=${encodeURIComponent(safeInitials)}&t=${safeTheme}&s=${safeStyle}`;
      } else {
        // Expect JSON body with avatarUrl (one of predetermined options)
        if (!avatarUrl || typeof avatarUrl !== 'string') {
          return error(400, 'Missing avatarUrl');
        }
        // Strip query if present
        const base = avatarUrl.split('?')[0];
        if (!PRESET_AVATARS.includes(base)) {
          return error(400, 'Invalid avatar selection');
        }
        // Append cache-busting based on file mtime
        try {
          const filename = path.basename(base);
          const filePath = path.join(__dirname, '../../assets/images/avatars', filename);
          const stat = fs.statSync(filePath);
          const v = Math.floor(stat.mtimeMs);
          storedUrl = `${base}?v=${v}`;
        } catch (fsErr) {
          // Fallback to base if fs lookup fails
          storedUrl = base;
        }
      }

      // Update DB with avatar URL and audit
      await database.run(
        'UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [storedUrl, uploadId]
      );
      const updated = await database.get(
        'SELECT id, email, name, role, is_active, email_verified, avatar_url, updated_at FROM users WHERE id = ?',
        [uploadId]
      );
      await logAudit(event, {
        action: 'user.avatar.select',
        userId: user.id,
        details: { targetUserId: uploadId, avatar: storedUrl }
      });
      return ok({ message: 'Avatar selected', user: updated });
    }

    // Email verification management: /users/:id/verify-email (POST - admin only)
    if (pathParts.length >= 3 && pathParts[pathParts.length - 1] === 'verify-email') {
      const idPart = pathParts[pathParts.length - 2];
      const targetUserId = parseInt(idPart, 10);
      if (Number.isNaN(targetUserId)) {
        return error(400, 'Invalid user id');
      }
      if (method !== 'POST') {
        return error(405, 'Method not allowed');
      }

      // Admin only
      const { user, response: authResponse } = await requirePermission(event, 'users', 'update');
      if (authResponse) {
        return authResponse;
      }

      const targetUser = await database.get(
        'SELECT id, email, name, email_verified FROM users WHERE id = ?',
        [targetUserId]
      );
      if (!targetUser) {
        return error(404, 'User not found');
      }

      if (targetUser.email_verified) {
        return error(400, 'Email already verified');
      }

      // Manually verify email
      await database.run(
        'UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?',
        [targetUserId]
      );

      // Track attempt
      try {
        await database.run(
          'INSERT INTO email_verification_attempts (user_id, email, attempt_type, success, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
          [
            targetUserId,
            targetUser.email,
            'admin_manual',
            1,
            event.headers['x-forwarded-for'] || 'admin',
            event.headers['user-agent'] || null
          ]
        );
      } catch (e) {
        console.error('Failed to track manual verification:', e);
      }

      await logAudit(event, {
        action: 'user.email.manually_verified',
        userId: user.id,
        details: { targetUserId, email: targetUser.email, verifiedBy: user.email }
      });

      return ok({
        message: 'Email verified successfully',
        user: { id: targetUser.id, email: targetUser.email, email_verified: true }
      });
    }

    // Get verification attempts: /users/:id/verification-attempts (GET - admin only)
    if (pathParts.length >= 3 && pathParts[pathParts.length - 1] === 'verification-attempts') {
      const idPart = pathParts[pathParts.length - 2];
      const targetUserId = parseInt(idPart, 10);
      if (Number.isNaN(targetUserId)) {
        return error(400, 'Invalid user id');
      }
      if (method !== 'GET') {
        return error(405, 'Method not allowed');
      }

      // Admin only
      const { user, response: authResponse } = await requirePermission(event, 'users', 'read');
      if (authResponse) {
        return authResponse;
      }

      const attempts = await database.all(
        'SELECT id, email, attempt_type, success, ip_address, created_at FROM email_verification_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [targetUserId]
      );

      return ok({ attempts });
    }

    // Stats endpoint: /users/stats/overview
    if (isStats) {
      const { user, response: authResponse } = await requirePermission(event, 'users', 'stats');
      if (authResponse) {
        return authResponse;
      }

      const stats = await database.all(`SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
        SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as manager_users,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regular_users,
        SUM(CASE WHEN email_verified = TRUE THEN 1 ELSE 0 END) as verified_users,
        SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as new_users_30d
      FROM users`);
      return ok({ stats: stats[0] });
    }

    // Collection endpoints (no id)
    if (!/^[0-9]+$/.test(maybeId)) {
      if (method === 'GET') {
        const { user, response: authResponse } = await requirePermission(event, 'users', 'list');
        if (authResponse) {
          return authResponse;
        }

        const { page, limit, offset } = getPagination(event.queryStringParameters || {}, {
          page: 1,
          limit: 10
        });
        const search = (event.queryStringParameters && event.queryStringParameters.search) || '';
        const role = (event.queryStringParameters && event.queryStringParameters.role) || '';
        let query =
          'SELECT id, email, name, role, is_active, email_verified, created_at, last_login FROM users';
        let countQuery = 'SELECT COUNT(*) as total FROM users';
        const params = [];
        const countParams = [];
        if (search) {
          query += ' WHERE (name LIKE ? OR email LIKE ?)';
          countQuery += ' WHERE (name LIKE ? OR email LIKE ?)';
          params.push(`%${search}%`, `%${search}%`);
          countParams.push(`%${search}%`, `%${search}%`);
        }
        if (role) {
          const whereClause = search ? ' AND' : ' WHERE';
          query += `${whereClause} role = ?`;
          countQuery += `${whereClause} role = ?`;
          params.push(role);
          countParams.push(role);
        }
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        const [usersList, countResult] = await Promise.all([
          database.all(query, params),
          database.get(countQuery, countParams)
        ]);
        return ok({
          users: usersList,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult.total,
            pages: Math.ceil(countResult.total / limit)
          }
        });
      }
      if (method === 'POST') {
        const { user, response: authResponse } = await requirePermission(event, 'users', 'create');
        if (authResponse) {
          return authResponse;
        }

        const { email, password, name, role = 'user' } = body;
        if (!email || !password || !name) {
          return error(400, 'Validation failed');
        }

        // Validate role
        if (!isValidRole(role)) {
          return error(400, 'Invalid role');
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          return error(400, 'Password does not meet requirements', {
            errors: passwordValidation.errors
          });
        }

        const existing = await database.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
          return error(409, 'User already exists with this email');
        }
        const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const hash = await bcrypt.hash(password, rounds);
        const result = await database.run(
          'INSERT INTO users (email, name, password_hash, role, email_verified) VALUES (?, ?, ?, ?, ?)',
          [email, name, hash, role, 1]
        );
        const newUser = await database.get(
          'SELECT id, email, name, role, is_active, email_verified, created_at, last_login FROM users WHERE id = ?',
          [result.id]
        );
        await logAudit(event, {
          action: 'user.create',
          userId: user.id,
          details: { targetUserId: result.id, email, name, role }
        });
        return ok({ message: 'User created successfully', user: newUser }, 201);
      }
      return error(405, 'Method not allowed');
    }

    // Individual resource by numeric id
    const id = parseInt(maybeId, 10);
    if (Number.isNaN(id)) {
      return error(400, 'Invalid user id');
    }

    if (method === 'GET') {
      const { user, response: authResponse } = await requirePermission(event, 'users', 'read');
      if (authResponse) {
        return authResponse;
      }

      const u = await database.get(
        'SELECT id, email, name, role, is_active, email_verified, avatar_url, created_at, updated_at, last_login FROM users WHERE id = ?',
        [id]
      );
      if (!u) {
        return error(404, 'User not found');
      }
      return ok({ user: u });
    }
    if (method === 'PUT') {
      // For updates, users can update themselves OR admins can update anyone
      const { user, response: authResponse } = await requireAuth(event);
      if (authResponse) {
        return authResponse;
      }

      const isOwn = user.id === id;
      const canUpdate = isOwn || hasPermission(user, 'users', 'update');

      if (!canUpdate) {
        return error(403, 'Insufficient permissions');
      }

      const { name, role, is_active } = body;

      // Only admins can modify role or is_active
      if (
        !hasPermission(user, 'users', 'update') &&
        (role !== undefined || is_active !== undefined)
      ) {
        return error(403, 'Cannot modify role or status');
      }

      const updates = [];
      const values = [];
      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }

      if (role !== undefined && hasPermission(user, 'users', 'update')) {
        if (!isValidRole(role)) {
          return error(400, 'Invalid role');
        }
        updates.push('role = ?');
        values.push(role);
      }

      if (is_active !== undefined && hasPermission(user, 'users', 'update')) {
        updates.push('is_active = ?');
        values.push(is_active ? 1 : 0);
      }

      if (!updates.length) {
        return error(400, 'No valid updates provided');
      }
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      await database.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
      const updated = await database.get(
        'SELECT id, email, name, role, is_active, email_verified, updated_at, last_login FROM users WHERE id = ?',
        [id]
      );
      const auditDetails = { targetUserId: id };
      if (name !== undefined) {
        auditDetails.name = name;
      }
      if (role !== undefined) {
        auditDetails.role = role;
      }
      if (is_active !== undefined) {
        auditDetails.is_active = is_active;
      }
      await logAudit(event, { action: 'user.update', userId: user.id, details: auditDetails });
      return ok({ message: 'User updated successfully', user: updated });
    }
    if (method === 'DELETE') {
      const { user, response: authResponse } = await requirePermission(event, 'users', 'delete');
      if (authResponse) {
        return authResponse;
      }

      if (user.id === id) {
        return error(400, 'Cannot delete your own account');
      }
      const exists = await database.get('SELECT id, email FROM users WHERE id = ?', [id]);
      if (!exists) {
        return error(404, 'User not found');
      }
      await database.run('DELETE FROM refresh_tokens WHERE user_id = ?', [id]);
      await database.run('DELETE FROM users WHERE id = ?', [id]);
      await logAudit(event, {
        action: 'user.delete',
        userId: user.id,
        details: { targetUserId: id, email: exists.email }
      });
      return ok({ message: 'User deleted successfully' });
    }
    // Password change: not implemented
    return error(405, 'Method not allowed');
  } catch (err) {
    console.error('Users function error', err);
    return error(500, 'Internal server error');
  }
});

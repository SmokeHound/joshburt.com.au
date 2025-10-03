const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const { database } = require('../config/database');
const { authenticateToken, requireAdmin, requireManagerOrAdmin, auditLog } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - List all users (Admin/Manager only)
router.get('/', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, email, name, role, is_active, email_verified, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    const params = [];
    const countParams = [];

    // Add search filter
    if (search) {
      query += ' WHERE (name LIKE ? OR email LIKE ?)';
      countQuery += ' WHERE (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    // Add role filter
    if (role) {
      const whereClause = search ? ' AND' : ' WHERE';
      query += `${whereClause} role = ?`;
      countQuery += `${whereClause} role = ?`;
      params.push(role);
      countParams.push(role);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [users, countResult] = await Promise.all([
      database.all(query, params),
      database.get(countQuery, countParams)
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// GET /api/users/:id - Get user by ID (Admin/Manager only)
router.get('/:id', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await database.get(
      'SELECT id, email, name, role, is_active, email_verified, avatar_url, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

// POST /api/users - Create new user (Admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('role').isIn(['user', 'manager', 'admin']),
], auditLog('user_create'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, name, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await database.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await database.run(
      'INSERT INTO users (email, name, password_hash, role, email_verified) VALUES (?, ?, ?, ?, ?)',
      [email, name, passwordHash, role, 1]
    );

    const newUser = await database.get(
      'SELECT id, email, name, role, is_active, email_verified, created_at FROM users WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update user (Admin only, or user updating themselves)
router.put('/:id', authenticateToken, [
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
  body('role').optional().isIn(['user', 'manager', 'admin']),
  body('is_active').optional().isBoolean(),
], auditLog('user_update'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { name, role, is_active } = req.body;

    // Check if user exists
    const existingUser = await database.get('SELECT id, role, is_active FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Authorization check
    const isOwnProfile = parseInt(id) === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Regular users can only update their own name
    if (!isAdmin && (role !== undefined || is_active !== undefined)) {
      return res.status(403).json({ error: 'Cannot modify role or status' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    // Track audit actions
    const auditActions = [];
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (role !== undefined && isAdmin) {
      updates.push('role = ?');
      values.push(role);
      if (role !== existingUser.role) {
        auditActions.push({ action: 'user_role_change', details: { from: existingUser.role, to: role } });
      }
    }
    if (is_active !== undefined && isAdmin) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
      if (is_active !== !!existingUser.is_active) {
        auditActions.push({ action: is_active ? 'user_unlock' : 'user_lock', details: { from: !!existingUser.is_active, to: !!is_active } });
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    await database.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    // Write extra audit logs for lock/unlock/role change
    for (const entry of auditActions) {
      try {
        await require('../middleware/auth').auditLog(entry.action)({
          user: req.user,
          body: entry.details,
          ip: req.ip,
          get: (h) => req.get(h)
        }, { status: () => ({ json: () => {} }) }, () => {});
      } catch (e) {
        console.error('Audit log error:', e);
      }
    }
    const updatedUser = await database.get(
      'SELECT id, email, name, role, is_active, email_verified, updated_at FROM users WHERE id = ?',
      [id]
    );
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, auditLog('user_delete'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const existingUser = await database.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete related data first (due to foreign key constraints)
    await database.run('DELETE FROM refresh_tokens WHERE user_id = ?', [id]);
    await database.run('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PUT /api/users/:id/password - Change user password
router.put('/:id/password', authenticateToken, [
  body('currentPassword').notEmpty().if(req => req.user.id === parseInt(req.params.id)),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
], auditLog('password_change'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Authorization check
    const isOwnProfile = parseInt(id) === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get user
    const user = await database.get('SELECT id, password_hash FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password for own profile
    if (isOwnProfile) {
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await database.run(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, id]
    );

    // Invalidate all refresh tokens for this user
    await database.run('DELETE FROM refresh_tokens WHERE user_id = ?', [id]);

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/users/stats - Get user statistics (Admin/Manager only)
router.get('/stats/overview', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const stats = await database.all(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
        SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as manager_users,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regular_users,
        SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) as verified_users,
        SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) as new_users_30d
      FROM users
    `);

    res.json({ stats: stats[0] });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve user statistics' });
  }
});

module.exports = router;
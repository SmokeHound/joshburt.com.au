const jwt = require('jsonwebtoken');
const { database } = require('../config/database');

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await database.get(
      'SELECT id, email, name, role, is_active, email_verified FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

// Check if user has admin role
const requireAdmin = requireRole(['admin']);

// Check if user has admin or manager role
const requireManagerOrAdmin = requireRole(['admin', 'manager']);

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await database.get(
        'SELECT id, email, name, role, is_active FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (user && user.is_active) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  
  next();
};

// Log user actions for audit trail
const auditLog = (action) => {
  return async (req, res, next) => {
    try {
      const userId = req.user ? req.user.id : null;
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      await database.run(
        'INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
        [userId, action, JSON.stringify(req.body), ip, userAgent]
      );
    } catch (error) {
      console.error('Audit log error:', error);
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireManagerOrAdmin,
  optionalAuth,
  auditLog
};
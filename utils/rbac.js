// Role-Based Access Control (RBAC) utilities
// Defines permissions and provides authorization helpers

/**
 * Role hierarchy and permissions
 * 
 * Roles (in order of privilege):
 * - admin: Full system access
 * - manager: Content management and user viewing
 * - user: Basic access, read-only for most resources
 */

const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user'
};

/**
 * Permission definitions for each resource
 * Defines which roles can perform which actions
 */
const PERMISSIONS = {
  users: {
    create: ['admin'],
    read: ['admin', 'manager'],
    update: ['admin'], // Users can update themselves via special logic
    delete: ['admin'],
    list: ['admin', 'manager'],
    stats: ['admin', 'manager']
  },
  products: {
    create: ['admin', 'manager'],
    read: ['admin', 'manager', 'user'],
    update: ['admin', 'manager'],
    delete: ['admin'],
    list: ['admin', 'manager', 'user']
  },
  consumables: {
    create: ['admin', 'manager'],
    read: ['admin', 'manager', 'user'],
    update: ['admin', 'manager'],
    delete: ['admin'],
    list: ['admin', 'manager', 'user']
  },
  orders: {
    create: ['admin', 'manager', 'user'],
    read: ['admin', 'manager'],
    update: ['admin', 'manager'],
    delete: ['admin'],
    list: ['admin', 'manager'],
    approve: ['admin', 'manager']
  },
  inventory: {
    create: ['admin', 'manager'],
    read: ['admin', 'manager'],
    update: ['admin', 'manager'],
    delete: ['admin'],
    list: ['admin', 'manager']
  },
  auditLogs: {
    read: ['admin'],
    list: ['admin']
  },
  settings: {
    read: ['admin'],
    update: ['admin']
  },
  categories: {
    create: ['admin', 'manager'],
    read: ['admin', 'manager', 'user'],
    update: ['admin', 'manager'],
    delete: ['admin'],
    list: ['admin', 'manager', 'user']
  }
};

/**
 * Check if a user has permission to perform an action on a resource
 * @param {object} user - User object with role property
 * @param {string} resource - Resource name (e.g., 'products', 'users')
 * @param {string} action - Action name (e.g., 'create', 'read', 'update', 'delete')
 * @returns {boolean} - True if user has permission
 */
function hasPermission(user, resource, action) {
  if (!user || !user.role) return false;
  
  const resourcePerms = PERMISSIONS[resource];
  if (!resourcePerms) return false;
  
  const allowedRoles = resourcePerms[action];
  if (!allowedRoles) return false;
  
  return allowedRoles.includes(user.role);
}

/**
 * Check if user has one of the specified roles
 * @param {object} user - User object with role property
 * @param {string[]} roles - Array of role names
 * @returns {boolean} - True if user has one of the roles
 */
function hasRole(user, roles) {
  if (!user || !user.role) return false;
  return roles.includes(user.role);
}

/**
 * Validate that a role value is valid
 * @param {string} role - Role to validate
 * @returns {boolean} - True if role is valid
 */
function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

/**
 * Get all valid roles
 * @returns {string[]} - Array of valid role names
 */
function getAllRoles() {
  return Object.values(ROLES);
}

module.exports = {
  ROLES,
  PERMISSIONS,
  hasPermission,
  hasRole,
  isValidRole,
  getAllRoles
};

// Unit tests for utils/rbac.js
const { 
  ROLES, 
  PERMISSIONS, 
  hasPermission, 
  hasRole, 
  isValidRole, 
  getAllRoles 
} = require('../../utils/rbac');

describe('RBAC Utilities', () => {
  describe('ROLES constant', () => {
    test('should define all role types', () => {
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.MANAGER).toBe('manager');
      expect(ROLES.USER).toBe('user');
    });
  });

  describe('PERMISSIONS constant', () => {
    test('should define permissions for all resources', () => {
      expect(PERMISSIONS.users).toBeDefined();
      expect(PERMISSIONS.products).toBeDefined();
      expect(PERMISSIONS.orders).toBeDefined();
      expect(PERMISSIONS.consumables).toBeDefined();
      expect(PERMISSIONS.inventory).toBeDefined();
      expect(PERMISSIONS.auditLogs).toBeDefined();
      expect(PERMISSIONS.settings).toBeDefined();
      expect(PERMISSIONS.categories).toBeDefined();
    });

    test('should define CRUD actions for users resource', () => {
      expect(PERMISSIONS.users.create).toEqual(['admin']);
      expect(PERMISSIONS.users.read).toEqual(['admin', 'manager']);
      expect(PERMISSIONS.users.update).toEqual(['admin']);
      expect(PERMISSIONS.users.delete).toEqual(['admin']);
      expect(PERMISSIONS.users.list).toEqual(['admin', 'manager']);
    });

    test('should allow all roles to read products', () => {
      expect(PERMISSIONS.products.read).toEqual(['admin', 'manager', 'user']);
    });

    test('should restrict audit logs to admin only', () => {
      expect(PERMISSIONS.auditLogs.read).toEqual(['admin']);
      expect(PERMISSIONS.auditLogs.list).toEqual(['admin']);
    });
  });

  describe('hasPermission', () => {
    test('should return false for null or undefined user', () => {
      expect(hasPermission(null, 'products', 'read')).toBe(false);
      expect(hasPermission(undefined, 'products', 'read')).toBe(false);
    });

    test('should return false for user without role', () => {
      expect(hasPermission({}, 'products', 'read')).toBe(false);
      expect(hasPermission({ name: 'John' }, 'products', 'read')).toBe(false);
    });

    test('should return false for non-existent resource', () => {
      const user = { role: 'admin' };
      expect(hasPermission(user, 'nonexistent', 'read')).toBe(false);
    });

    test('should return false for non-existent action', () => {
      const user = { role: 'admin' };
      expect(hasPermission(user, 'products', 'nonexistent')).toBe(false);
    });

    test('should allow admin to create users', () => {
      const admin = { role: 'admin' };
      expect(hasPermission(admin, 'users', 'create')).toBe(true);
    });

    test('should prevent manager from creating users', () => {
      const manager = { role: 'manager' };
      expect(hasPermission(manager, 'users', 'create')).toBe(false);
    });

    test('should allow manager to read users', () => {
      const manager = { role: 'manager' };
      expect(hasPermission(manager, 'users', 'read')).toBe(true);
    });

    test('should allow all roles to read products', () => {
      expect(hasPermission({ role: 'admin' }, 'products', 'read')).toBe(true);
      expect(hasPermission({ role: 'manager' }, 'products', 'read')).toBe(true);
      expect(hasPermission({ role: 'user' }, 'products', 'read')).toBe(true);
    });

    test('should prevent user from deleting products', () => {
      const user = { role: 'user' };
      expect(hasPermission(user, 'products', 'delete')).toBe(false);
    });

    test('should allow admin and manager to update products', () => {
      expect(hasPermission({ role: 'admin' }, 'products', 'update')).toBe(true);
      expect(hasPermission({ role: 'manager' }, 'products', 'update')).toBe(true);
      expect(hasPermission({ role: 'user' }, 'products', 'update')).toBe(false);
    });

    test('should allow users to create orders', () => {
      expect(hasPermission({ role: 'user' }, 'orders', 'create')).toBe(true);
      expect(hasPermission({ role: 'manager' }, 'orders', 'create')).toBe(true);
      expect(hasPermission({ role: 'admin' }, 'orders', 'create')).toBe(true);
    });

    test('should prevent users from approving orders', () => {
      expect(hasPermission({ role: 'user' }, 'orders', 'approve')).toBe(false);
      expect(hasPermission({ role: 'manager' }, 'orders', 'approve')).toBe(true);
      expect(hasPermission({ role: 'admin' }, 'orders', 'approve')).toBe(true);
    });

    test('should restrict audit log access to admin only', () => {
      expect(hasPermission({ role: 'admin' }, 'auditLogs', 'read')).toBe(true);
      expect(hasPermission({ role: 'manager' }, 'auditLogs', 'read')).toBe(false);
      expect(hasPermission({ role: 'user' }, 'auditLogs', 'read')).toBe(false);
    });

    test('should restrict settings access to admin only', () => {
      expect(hasPermission({ role: 'admin' }, 'settings', 'read')).toBe(true);
      expect(hasPermission({ role: 'admin' }, 'settings', 'update')).toBe(true);
      expect(hasPermission({ role: 'manager' }, 'settings', 'update')).toBe(false);
    });
  });

  describe('hasRole', () => {
    test('should return false for null or undefined user', () => {
      expect(hasRole(null, ['admin'])).toBe(false);
      expect(hasRole(undefined, ['admin'])).toBe(false);
    });

    test('should return false for user without role', () => {
      expect(hasRole({}, ['admin'])).toBe(false);
      expect(hasRole({ name: 'John' }, ['admin'])).toBe(false);
    });

    test('should return true if user has one of the specified roles', () => {
      expect(hasRole({ role: 'admin' }, ['admin'])).toBe(true);
      expect(hasRole({ role: 'admin' }, ['admin', 'manager'])).toBe(true);
      expect(hasRole({ role: 'manager' }, ['admin', 'manager'])).toBe(true);
    });

    test('should return false if user does not have any specified role', () => {
      expect(hasRole({ role: 'user' }, ['admin', 'manager'])).toBe(false);
      expect(hasRole({ role: 'manager' }, ['admin'])).toBe(false);
    });

    test('should handle single role in array', () => {
      expect(hasRole({ role: 'admin' }, ['admin'])).toBe(true);
      expect(hasRole({ role: 'user' }, ['admin'])).toBe(false);
    });

    test('should handle multiple roles in array', () => {
      expect(hasRole({ role: 'user' }, ['admin', 'manager', 'user'])).toBe(true);
    });
  });

  describe('isValidRole', () => {
    test('should return true for valid roles', () => {
      expect(isValidRole('admin')).toBe(true);
      expect(isValidRole('manager')).toBe(true);
      expect(isValidRole('user')).toBe(true);
    });

    test('should return false for invalid roles', () => {
      expect(isValidRole('superadmin')).toBe(false);
      expect(isValidRole('guest')).toBe(false);
      expect(isValidRole('')).toBe(false);
      expect(isValidRole(null)).toBe(false);
      expect(isValidRole(undefined)).toBe(false);
    });

    test('should be case-sensitive', () => {
      expect(isValidRole('Admin')).toBe(false);
      expect(isValidRole('ADMIN')).toBe(false);
      expect(isValidRole('admin')).toBe(true);
    });
  });

  describe('getAllRoles', () => {
    test('should return an array of all valid roles', () => {
      const roles = getAllRoles();
      expect(Array.isArray(roles)).toBe(true);
      expect(roles).toContain('admin');
      expect(roles).toContain('manager');
      expect(roles).toContain('user');
      expect(roles.length).toBe(3);
    });

    test('should return a new array each time', () => {
      const roles1 = getAllRoles();
      const roles2 = getAllRoles();
      expect(roles1).toEqual(roles2);
      expect(roles1).not.toBe(roles2); // Different references
    });
  });
});

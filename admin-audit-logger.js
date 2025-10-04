// Admin Audit Logging System
class AdminAuditLogger {
  constructor() {
    this.logKey = 'adminAuditLogs';
    this.maxLogs = 1000; // Keep last 1000 log entries
    this.initialize();
  }

  initialize() {
    // Ensure audit logs storage exists
    if (!localStorage.getItem(this.logKey)) {
      localStorage.setItem(this.logKey, JSON.stringify([]));
    }
  }

  log(action, details = {}, userId = null) {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const user = userId || currentUser.email || 'unknown';
        
    const logEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      userId: user,
      userRole: currentUser.role || 'user',
      action: action,
      details: details,
      ipAddress: 'localhost', // Would be real IP in production
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    };

    const logs = this.getLogs();
    logs.unshift(logEntry); // Add to beginning

    // Keep only the most recent logs
    if (logs.length > this.maxLogs) {
      logs.splice(this.maxLogs);
    }

    localStorage.setItem(this.logKey, JSON.stringify(logs));
    this.broadcastLogEvent(logEntry);
        
    return logEntry;
  }

  getLogs(filters = {}) {
    const logs = JSON.parse(localStorage.getItem(this.logKey) || '[]');
        
    let filteredLogs = logs;

    // Apply filters
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= endDate);
    }

    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => 
        log.userId.toLowerCase().includes(filters.userId.toLowerCase())
      );
    }

    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(filters.action.toLowerCase())
      );
    }

    if (filters.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit);
    }

    return filteredLogs;
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('adminSessionId');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('adminSessionId', sessionId);
    }
    return sessionId;
  }

  broadcastLogEvent(logEntry) {
    // Broadcast to other tabs/windows
    window.dispatchEvent(new CustomEvent('adminAuditLog', { 
      detail: logEntry 
    }));
  }

  exportLogs(format = 'csv', filters = {}) {
    const logs = this.getLogs(filters);
        
    if (format === 'csv') {
      return this.exportToCSV(logs);
    } else if (format === 'json') {
      return this.exportToJSON(logs);
    }
  }

  exportToCSV(logs) {
    let csv = 'Timestamp,User ID,User Role,Action,Details,IP Address,Session ID\n';
        
    logs.forEach(log => {
      const details = JSON.stringify(log.details).replace(/"/g, '""');
      csv += `"${log.timestamp}","${log.userId}","${log.userRole}","${log.action}","${details}","${log.ipAddress}","${log.sessionId}"\n`;
    });
        
    return csv;
  }

  exportToJSON(logs) {
    return JSON.stringify(logs, null, 2);
  }

  clearLogs(olderThanDays = null) {
    if (olderThanDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            
      const logs = this.getLogs();
      const filteredLogs = logs.filter(log => 
        new Date(log.timestamp) > cutoffDate
      );
            
      localStorage.setItem(this.logKey, JSON.stringify(filteredLogs));
      this.log('audit_logs_cleaned', { 
        olderThanDays, 
        removedCount: logs.length - filteredLogs.length 
      });
            
      return logs.length - filteredLogs.length;
    } else {
      localStorage.setItem(this.logKey, JSON.stringify([]));
      return true;
    }
  }

  getLogStats() {
    const logs = this.getLogs();
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
    const stats = {
      total: logs.length,
      last24Hours: logs.filter(log => new Date(log.timestamp) > dayAgo).length,
      lastWeek: logs.filter(log => new Date(log.timestamp) > weekAgo).length,
      topActions: {},
      topUsers: {},
      oldestLog: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
      newestLog: logs.length > 0 ? logs[0].timestamp : null
    };

    // Calculate top actions
    logs.forEach(log => {
      stats.topActions[log.action] = (stats.topActions[log.action] || 0) + 1;
      stats.topUsers[log.userId] = (stats.topUsers[log.userId] || 0) + 1;
    });

    return stats;
  }

  // Pre-defined action types for consistency
  static get ACTIONS() {
    return {
      LOGIN: 'user_login',
      LOGOUT: 'user_logout',
      SETTINGS_CHANGE: 'settings_changed',
      USER_CREATE: 'user_created',
      USER_UPDATE: 'user_updated',
      USER_DELETE: 'user_deleted',
      ORDER_CREATE: 'order_created',
      ORDER_UPDATE: 'order_updated',
      ORDER_DELETE: 'order_deleted',
      EXPORT_DATA: 'data_exported',
      IMPORT_DATA: 'data_imported',
      SYSTEM_CONFIG: 'system_config_changed',
      SECURITY_EVENT: 'security_event',
      ERROR_OCCURRED: 'error_occurred'
    };
  }
}

// Initialize global audit logger
window.adminAuditLogger = new AdminAuditLogger();

// Auto-track page visits
window.addEventListener('load', () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  if (currentUser.email) {
    window.adminAuditLogger.log(AdminAuditLogger.ACTIONS.LOGIN, {
      page: window.location.pathname,
      referrer: document.referrer
    });
  }
});

// Track settings changes
window.addEventListener('storage', (e) => {
  if (e.key === 'siteSettings') {
    window.adminAuditLogger.log(AdminAuditLogger.ACTIONS.SETTINGS_CHANGE, {
      key: e.key,
      oldValue: e.oldValue ? JSON.parse(e.oldValue) : null,
      newValue: e.newValue ? JSON.parse(e.newValue) : null
    });
  }
});

// Track unhandled errors
window.addEventListener('error', (e) => {
  window.adminAuditLogger.log(AdminAuditLogger.ACTIONS.ERROR_OCCURRED, {
    message: e.message,
    filename: e.filename,
    line: e.lineno,
    column: e.colno,
    stack: e.error ? e.error.stack : null
  });
});
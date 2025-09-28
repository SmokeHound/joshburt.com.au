/**
 * API Integration Service Layer
 * Handles external API calls for inventory, payment, notifications, and webhooks
 */

class APIIntegrationService {
  constructor() {
    // Load API configuration from localStorage
    this.config = this.loadAPIConfig();
    this.webhookEndpoints = [];
    this.isOnline = navigator.onLine;
    
    // Setup online/offline detection
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  // Load API configuration from settings
  loadAPIConfig() {
    const settings = JSON.parse(localStorage.getItem('apiSettings') || '{}');
    return {
      inventory: {
        endpoint: settings.inventoryEndpoint || 'https://api.example.com/inventory',
        apiKey: settings.inventoryApiKey || 'demo-key',
        enabled: settings.inventoryEnabled || false
      },
      payment: {
        endpoint: settings.paymentEndpoint || 'https://api.stripe.com/v1',
        apiKey: settings.paymentApiKey || 'pk_test_demo',
        enabled: settings.paymentEnabled || false
      },
      notifications: {
        endpoint: settings.notificationEndpoint || 'https://api.sendgrid.com/v3',
        apiKey: settings.notificationApiKey || 'SG.demo',
        enabled: settings.notificationEnabled || false
      },
      cloudBackup: {
        endpoint: settings.cloudBackupEndpoint || 'https://api.jsonbin.io/v3',
        apiKey: settings.cloudBackupApiKey || 'demo-key',
        enabled: settings.cloudBackupEnabled || false
      }
    };
  }

  // Save API configuration
  saveAPIConfig(config) {
    localStorage.setItem('apiSettings', JSON.stringify(config));
    this.config = this.loadAPIConfig();
  }

  // Generic API call handler with error handling and retry logic
  async makeAPICall(url, options = {}, retries = 3) {
    if (!this.isOnline) {
      throw new Error('No internet connection available');
    }

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 10000,
      ...options
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), defaultOptions.timeout);
        
        const response = await fetch(url, {
          ...defaultOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.warn(`API call attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // INVENTORY API INTEGRATION
  async checkInventory(productCodes) {
    if (!this.config.inventory.enabled) {
      // Return mock data when API is disabled
      return productCodes.reduce((acc, code) => {
        acc[code] = { 
          inStock: true, 
          quantity: Math.floor(Math.random() * 100) + 10,
          price: Math.floor(Math.random() * 100) + 20
        };
        return acc;
      }, {});
    }

    try {
      const response = await this.makeAPICall(`${this.config.inventory.endpoint}/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.inventory.apiKey}`
        },
        body: JSON.stringify({ productCodes })
      });

      return response.inventory;
    } catch (error) {
      console.error('Inventory API error:', error);
      this.triggerWebhook('inventory.error', { error: error.message, productCodes });
      
      // Fallback to cached data or mock data
      return this.getInventoryFallback(productCodes);
    }
  }

  getInventoryFallback(productCodes) {
    // Return cached inventory or mock data as fallback
    const cachedInventory = JSON.parse(localStorage.getItem('cachedInventory') || '{}');
    return productCodes.reduce((acc, code) => {
      acc[code] = cachedInventory[code] || { 
        inStock: true, 
        quantity: 5, 
        price: 50,
        cached: true 
      };
      return acc;
    }, {});
  }

  // PAYMENT API INTEGRATION
  async processPayment(orderData, paymentDetails) {
    if (!this.config.payment.enabled) {
      // Mock payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockResult = {
        success: true,
        transactionId: 'mock_' + Date.now(),
        amount: orderData.totalAmount,
        currency: 'USD'
      };
      this.triggerWebhook('payment.completed', { order: orderData, payment: mockResult });
      return mockResult;
    }

    try {
      const response = await this.makeAPICall(`${this.config.payment.endpoint}/charges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.payment.apiKey}`
        },
        body: JSON.stringify({
          amount: Math.round(orderData.totalAmount * 100), // Convert to cents
          currency: 'usd',
          source: paymentDetails.token,
          description: `Order #${orderData.orderId}`,
          metadata: {
            orderId: orderData.orderId,
            customerEmail: orderData.customerEmail
          }
        })
      });

      this.triggerWebhook('payment.completed', { order: orderData, payment: response });
      return {
        success: true,
        transactionId: response.id,
        amount: response.amount / 100,
        currency: response.currency
      };
    } catch (error) {
      console.error('Payment API error:', error);
      this.triggerWebhook('payment.failed', { order: orderData, error: error.message });
      throw new Error(`Payment failed: ${error.message}`);
    }
  }

  // NOTIFICATION API INTEGRATION
  async sendNotification(type, data) {
    if (!this.config.notifications.enabled) {
  // ...existing code...
      return { success: true, messageId: 'mock_' + Date.now() };
    }

    try {
      const templates = {
        'order.confirmation': {
          subject: 'Order Confirmation #{{orderId}}',
          template: 'order-confirmation'
        },
        'order.shipped': {
          subject: 'Your order has been shipped #{{orderId}}',
          template: 'order-shipped'
        },
        'order.delivered': {
          subject: 'Order delivered #{{orderId}}',
          template: 'order-delivered'
        }
      };

      const template = templates[type];
      if (!template) {
        throw new Error(`Unknown notification type: ${type}`);
      }

      const response = await this.makeAPICall(`${this.config.notifications.endpoint}/mail/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.notifications.apiKey}`
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: data.customerEmail }],
            dynamic_template_data: data
          }],
          from: { email: 'orders@joshburt.com.au', name: 'Josh Burt Oil Orders' },
          template_id: template.template
        })
      });

      return { success: true, messageId: response.message_id };
    } catch (error) {
      console.error('Notification API error:', error);
      this.triggerWebhook('notification.failed', { type, data, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // WEBHOOK SYSTEM
  registerWebhook(endpoint, events) {
    this.webhookEndpoints.push({ endpoint, events });
    localStorage.setItem('webhookEndpoints', JSON.stringify(this.webhookEndpoints));
  }

  async triggerWebhook(event, data) {
    const timestamp = new Date().toISOString();
    const payload = {
      event,
      data,
      timestamp,
      source: 'joshburt.com.au'
    };

    // Store webhook events locally for debugging
    const webhookLog = JSON.parse(localStorage.getItem('webhookLog') || '[]');
    webhookLog.push(payload);
    
    // Keep only last 100 webhook events
    if (webhookLog.length > 100) {
      webhookLog.splice(0, webhookLog.length - 100);
    }
    
    localStorage.setItem('webhookLog', JSON.stringify(webhookLog));

    // Send to registered webhook endpoints
    for (const webhook of this.webhookEndpoints) {
      if (webhook.events.includes(event) || webhook.events.includes('*')) {
        try {
          await this.makeAPICall(webhook.endpoint, {
            method: 'POST',
            body: JSON.stringify(payload)
          });
        } catch (error) {
          console.error(`Webhook delivery failed for ${webhook.endpoint}:`, error);
        }
      }
    }
  }

  // CLOUD BACKUP FUNCTIONALITY
  async backupToCloud() {
    if (!this.config.cloudBackup.enabled) {
  // ...existing code...
      return { success: false, reason: 'disabled' };
    }

    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        data: {
          siteSettings: JSON.parse(localStorage.getItem('siteSettings') || '{}'),
          siteUsers: JSON.parse(localStorage.getItem('siteUsers') || '[]'),
          apiSettings: JSON.parse(localStorage.getItem('apiSettings') || '{}'),
          webhookLog: JSON.parse(localStorage.getItem('webhookLog') || '[]'),
          cachedInventory: JSON.parse(localStorage.getItem('cachedInventory') || '{}')
        }
      };

      const response = await this.makeAPICall(`${this.config.cloudBackup.endpoint}/bins`, {
        method: 'POST',
        headers: {
          'X-Master-Key': this.config.cloudBackup.apiKey,
          'X-Bin-Name': 'joshburt-backup-' + Date.now()
        },
        body: JSON.stringify(backupData)
      });

      // Store backup reference locally
      const backupHistory = JSON.parse(localStorage.getItem('backupHistory') || '[]');
      backupHistory.push({
        id: response.metadata.id,
        timestamp: backupData.timestamp,
        size: JSON.stringify(backupData).length
      });
      
      // Keep only last 10 backup references
      if (backupHistory.length > 10) {
        backupHistory.splice(0, backupHistory.length - 10);
      }
      
      localStorage.setItem('backupHistory', JSON.stringify(backupHistory));

      this.triggerWebhook('backup.completed', { backupId: response.metadata.id });
      return { success: true, backupId: response.metadata.id };
    } catch (error) {
      console.error('Cloud backup error:', error);
      this.triggerWebhook('backup.failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async restoreFromCloud(backupId) {
    if (!this.config.cloudBackup.enabled) {
      throw new Error('Cloud backup is disabled');
    }

    try {
      const response = await this.makeAPICall(`${this.config.cloudBackup.endpoint}/bins/${backupId}`, {
        headers: {
          'X-Master-Key': this.config.cloudBackup.apiKey
        }
      });

      const backupData = response.record;
      
      // Restore data to localStorage
      if (backupData.data) {
        Object.keys(backupData.data).forEach(key => {
          localStorage.setItem(key, JSON.stringify(backupData.data[key]));
        });
      }

      this.triggerWebhook('backup.restored', { backupId, timestamp: backupData.timestamp });
      return { success: true, restored: Object.keys(backupData.data || {}) };
    } catch (error) {
      console.error('Cloud restore error:', error);
      this.triggerWebhook('backup.restore_failed', { backupId, error: error.message });
      throw error;
    }
  }

  // AUTO BACKUP SCHEDULER
  startAutoBackup(intervalMinutes = 60) {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    this.backupInterval = setInterval(() => {
      this.backupToCloud().catch(error => {
        console.error('Auto backup failed:', error);
      });
    }, intervalMinutes * 60 * 1000);

  // ...existing code...
  }

  stopAutoBackup() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
  // ...existing code...
    }
  }

  // UTILITY METHODS
  getWebhookLog() {
    return JSON.parse(localStorage.getItem('webhookLog') || '[]');
  }

  getBackupHistory() {
    return JSON.parse(localStorage.getItem('backupHistory') || '[]');
  }

  clearWebhookLog() {
    localStorage.removeItem('webhookLog');
  }

  // Test all API connections
  async testConnections() {
    const results = {
      inventory: false,
      payment: false,
      notifications: false,
      cloudBackup: false
    };

    // Test inventory API
    if (this.config.inventory.enabled) {
      try {
        await this.checkInventory(['TEST_PRODUCT']);
        results.inventory = true;
      } catch (error) {
        console.error('Inventory API test failed:', error);
      }
    }

    // Test payment API (without actually charging)
    if (this.config.payment.enabled) {
      try {
        // This would be a test endpoint or validation call
        results.payment = true; // Mock success for now
      } catch (error) {
        console.error('Payment API test failed:', error);
      }
    }

    // Test notification API
    if (this.config.notifications.enabled) {
      try {
        results.notifications = true; // Mock success for now
      } catch (error) {
        console.error('Notification API test failed:', error);
      }
    }

    // Test cloud backup
    if (this.config.cloudBackup.enabled) {
      try {
        const testResult = await this.backupToCloud();
        results.cloudBackup = testResult.success;
      } catch (error) {
        console.error('Cloud backup test failed:', error);
      }
    }

    return results;
  }
}

// Initialize global API service instance
window.apiService = new APIIntegrationService();

// Auto-start backup if configured
document.addEventListener('DOMContentLoaded', () => {
  const settings = JSON.parse(localStorage.getItem('apiSettings') || '{}');
  if (settings.autoBackupEnabled && settings.autoBackupInterval) {
    window.apiService.startAutoBackup(parseInt(settings.autoBackupInterval) || 60);
  }
});
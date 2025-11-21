/**
 * Custom Monitoring & Metrics Collection
 * Collects and aggregates application metrics without third-party tools
 */

const fs = require('fs').promises;
const path = require('path');

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: [],
      errors: [],
      performance: [],
      database: []
    };
    this.metricsFile = path.join(__dirname, '../data/metrics.json');
  }

  /**
   * Record an HTTP request metric
   */
  recordRequest(data) {
    const metric = {
      timestamp: new Date().toISOString(),
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
      responseTime: data.responseTime,
      userAgent: data.userAgent,
      ip: data.ip
    };

    this.metrics.requests.push(metric);
    this.trimMetrics('requests', 1000); // Keep last 1000 requests
  }

  /**
   * Record an error
   */
  recordError(data) {
    const metric = {
      timestamp: new Date().toISOString(),
      type: data.type || 'error',
      message: data.message,
      stack: data.stack,
      endpoint: data.endpoint,
      userId: data.userId,
      severity: data.severity || 'medium'
    };

    this.metrics.errors.push(metric);
    this.trimMetrics('errors', 500); // Keep last 500 errors
  }

  /**
   * Record a performance metric
   */
  recordPerformance(data) {
    const metric = {
      timestamp: new Date().toISOString(),
      operation: data.operation,
      duration: data.duration,
      metadata: data.metadata || {}
    };

    this.metrics.performance.push(metric);
    this.trimMetrics('performance', 1000);
  }

  /**
   * Record a database metric
   */
  recordDatabase(data) {
    const metric = {
      timestamp: new Date().toISOString(),
      query: data.query,
      duration: data.duration,
      rows: data.rows,
      error: data.error
    };

    this.metrics.database.push(metric);
    this.trimMetrics('database', 500);
  }

  /**
   * Trim metrics array to max length
   */
  trimMetrics(type, maxLength) {
    if (this.metrics[type].length > maxLength) {
      this.metrics[type] = this.metrics[type].slice(-maxLength);
    }
  }

  /**
   * Get metrics summary
   */
  getSummary(timeWindow = 3600000) {
    // Default: last hour
    const now = Date.now();
    const cutoff = now - timeWindow;

    const recentRequests = this.metrics.requests.filter(
      m => new Date(m.timestamp).getTime() > cutoff
    );

    const recentErrors = this.metrics.errors.filter(m => new Date(m.timestamp).getTime() > cutoff);

    const recentPerformance = this.metrics.performance.filter(
      m => new Date(m.timestamp).getTime() > cutoff
    );

    // Calculate request rate
    const requestRate = recentRequests.length / (timeWindow / 1000 / 60); // per minute

    // Calculate error rate
    const errorRate = (recentErrors.length / Math.max(recentRequests.length, 1)) * 100;

    // Calculate average response time
    const avgResponseTime =
      recentRequests.length > 0
        ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length
        : 0;

    // Status code distribution
    const statusCodes = {};
    recentRequests.forEach(r => {
      const code = r.statusCode;
      statusCodes[code] = (statusCodes[code] || 0) + 1;
    });

    // Error severity distribution
    const errorsBySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    recentErrors.forEach(e => {
      errorsBySeverity[e.severity] = (errorsBySeverity[e.severity] || 0) + 1;
    });

    return {
      timeWindow: timeWindow / 1000 / 60, // in minutes
      requests: {
        total: recentRequests.length,
        rate: Math.round(requestRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        statusCodes
      },
      errors: {
        total: recentErrors.length,
        rate: Math.round(errorRate * 100) / 100,
        bySeverity: errorsBySeverity
      },
      performance: {
        operations: recentPerformance.length,
        avgDuration:
          recentPerformance.length > 0
            ? Math.round(
              recentPerformance.reduce((sum, p) => sum + p.duration, 0) / recentPerformance.length
            )
            : 0
      }
    };
  }

  /**
   * Check alert thresholds
   */
  checkAlerts() {
    const summary = this.getSummary(300000); // Last 5 minutes
    const alerts = [];

    // Alert: High error rate
    if (summary.errors.rate > 5) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `Error rate is ${summary.errors.rate.toFixed(2)}% (threshold: 5%)`,
        value: summary.errors.rate,
        threshold: 5
      });
    }

    // Alert: Slow response time
    if (summary.requests.avgResponseTime > 3000) {
      alerts.push({
        type: 'slow_response_time',
        severity: 'warning',
        message: `Average response time is ${summary.requests.avgResponseTime}ms (threshold: 3000ms)`,
        value: summary.requests.avgResponseTime,
        threshold: 3000
      });
    }

    // Alert: High request rate (possible attack)
    if (summary.requests.rate > 1000) {
      alerts.push({
        type: 'high_request_rate',
        severity: 'warning',
        message: `Request rate is ${summary.requests.rate.toFixed(2)}/min (threshold: 1000/min)`,
        value: summary.requests.rate,
        threshold: 1000
      });
    }

    // Alert: Critical errors
    if (summary.errors.bySeverity.critical > 0) {
      alerts.push({
        type: 'critical_errors',
        severity: 'critical',
        message: `${summary.errors.bySeverity.critical} critical errors in the last 5 minutes`,
        value: summary.errors.bySeverity.critical
      });
    }

    return alerts;
  }

  /**
   * Get detailed metrics for a specific endpoint
   */
  getEndpointMetrics(endpoint, timeWindow = 3600000) {
    const now = Date.now();
    const cutoff = now - timeWindow;

    const requests = this.metrics.requests.filter(
      m => m.endpoint === endpoint && new Date(m.timestamp).getTime() > cutoff
    );

    if (requests.length === 0) {
      return null;
    }

    const responseTimes = requests.map(r => r.responseTime);
    responseTimes.sort((a, b) => a - b);

    return {
      endpoint,
      totalRequests: requests.length,
      avgResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)],
      statusCodes: requests.reduce((acc, r) => {
        acc[r.statusCode] = (acc[r.statusCode] || 0) + 1;
        return acc;
      }, {})
    };
  }

  /**
   * Persist metrics to file
   */
  async save() {
    try {
      await fs.mkdir(path.dirname(this.metricsFile), { recursive: true });
      await fs.writeFile(this.metricsFile, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  /**
   * Load metrics from file
   */
  async load() {
    try {
      const data = await fs.readFile(this.metricsFile, 'utf8');
      this.metrics = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or invalid - start fresh
      this.metrics = {
        requests: [],
        errors: [],
        performance: [],
        database: []
      };
    }
  }
}

// Singleton instance
let instance = null;

function getMetricsCollector() {
  if (!instance) {
    instance = new MetricsCollector();
  }
  return instance;
}

module.exports = {
  MetricsCollector,
  getMetricsCollector
};

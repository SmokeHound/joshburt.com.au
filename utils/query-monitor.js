/**
 * Query Performance Monitoring Utility
 * Tracks query execution times and provides performance insights
 */

// In-memory storage for query metrics (per-instance)
const queryMetrics = new Map();
const slowQueryThreshold = 100; // milliseconds
const slowQueries = [];
const maxSlowQueries = 100; // Keep last 100 slow queries

/**
 * Track a query execution
 * @param {string} query - SQL query
 * @param {number} duration - Execution time in milliseconds
 * @param {Array} params - Query parameters
 */
function trackQuery(query, duration, params = []) {
  // Normalize query (remove parameter values for grouping)
  const normalizedQuery = normalizeQuery(query);

  // Get or create metric entry
  let metric = queryMetrics.get(normalizedQuery);
  if (!metric) {
    metric = {
      query: normalizedQuery,
      count: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      avgDuration: 0,
      lastExecuted: null
    };
    queryMetrics.set(normalizedQuery, metric);
  }

  // Update metrics
  metric.count++;
  metric.totalDuration += duration;
  metric.minDuration = Math.min(metric.minDuration, duration);
  metric.maxDuration = Math.max(metric.maxDuration, duration);
  metric.avgDuration = metric.totalDuration / metric.count;
  metric.lastExecuted = new Date().toISOString();

  // Track slow queries
  if (duration > slowQueryThreshold) {
    slowQueries.unshift({
      query: normalizedQuery,
      duration,
      params: params.map(p =>
        typeof p === 'string' && p.length > 100 ? p.substring(0, 100) + '...' : p
      ),
      timestamp: new Date().toISOString()
    });

    // Limit slow query storage
    if (slowQueries.length > maxSlowQueries) {
      slowQueries.pop();
    }
  }
}

/**
 * Normalize query by removing specific parameter values
 * @param {string} query - SQL query
 * @returns {string} - Normalized query
 */
function normalizeQuery(query) {
  // Remove extra whitespace and normalize
  return query.replace(/\s+/g, ' ').trim().substring(0, 200); // Limit length for storage
}

/**
 * Get all query metrics
 * @returns {Array} - Array of query metrics
 */
function getMetrics() {
  return Array.from(queryMetrics.values()).sort((a, b) => b.totalDuration - a.totalDuration); // Sort by total duration
}

/**
 * Get slow queries
 * @param {number} limit - Max number of slow queries to return
 * @returns {Array} - Array of slow queries
 */
function getSlowQueries(limit = 50) {
  return slowQueries.slice(0, limit);
}

/**
 * Get top queries by specific metric
 * @param {string} metric - Metric to sort by (count, totalDuration, avgDuration, maxDuration)
 * @param {number} limit - Max number of queries to return
 * @returns {Array} - Array of top queries
 */
function getTopQueries(metric = 'totalDuration', limit = 10) {
  const validMetrics = ['count', 'totalDuration', 'avgDuration', 'maxDuration'];
  if (!validMetrics.includes(metric)) {
    throw new Error(`Invalid metric: ${metric}. Valid metrics: ${validMetrics.join(', ')}`);
  }

  return Array.from(queryMetrics.values())
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, limit);
}

/**
 * Get summary statistics
 * @returns {object} - Summary statistics
 */
function getSummary() {
  const metrics = Array.from(queryMetrics.values());

  if (metrics.length === 0) {
    return {
      totalQueries: 0,
      uniqueQueries: 0,
      totalDuration: 0,
      avgDuration: 0,
      slowQueryCount: slowQueries.length,
      slowQueryThreshold
    };
  }

  const totalQueries = metrics.reduce((sum, m) => sum + m.count, 0);
  const totalDuration = metrics.reduce((sum, m) => sum + m.totalDuration, 0);

  return {
    totalQueries,
    uniqueQueries: metrics.length,
    totalDuration: Math.round(totalDuration),
    avgDuration: Math.round(totalDuration / totalQueries),
    slowQueryCount: slowQueries.length,
    slowQueryThreshold
  };
}

/**
 * Reset all metrics
 */
function reset() {
  queryMetrics.clear();
  slowQueries.length = 0;
}

/**
 * Wrapper to monitor a database query
 * @param {Function} queryFn - Function that executes the query
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} - Query result
 */
async function monitor(queryFn, query, params = []) {
  const startTime = Date.now();

  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    trackQuery(query, duration, params);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    trackQuery(query, duration, params);
    throw error;
  }
}

module.exports = {
  trackQuery,
  getMetrics,
  getSlowQueries,
  getTopQueries,
  getSummary,
  reset,
  monitor,
  slowQueryThreshold
};

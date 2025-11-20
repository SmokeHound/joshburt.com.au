/**
 * Unit tests for query-monitor utility
 */

const queryMonitor = require('../../utils/query-monitor');

describe('Query Monitor Utility', () => {
  beforeEach(() => {
    queryMonitor.reset();
  });

  describe('trackQuery', () => {
    it('should track query execution', () => {
      queryMonitor.trackQuery('SELECT * FROM products', 50, []);

      const metrics = queryMonitor.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].count).toBe(1);
      expect(metrics[0].totalDuration).toBe(50);
    });

    it('should aggregate metrics for same query', () => {
      queryMonitor.trackQuery('SELECT * FROM products', 50, []);
      queryMonitor.trackQuery('SELECT * FROM products', 60, []);

      const metrics = queryMonitor.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].count).toBe(2);
      expect(metrics[0].totalDuration).toBe(110);
      expect(metrics[0].avgDuration).toBe(55);
    });

    it('should track min and max durations', () => {
      queryMonitor.trackQuery('SELECT * FROM products', 50, []);
      queryMonitor.trackQuery('SELECT * FROM products', 150, []);
      queryMonitor.trackQuery('SELECT * FROM products', 30, []);

      const metrics = queryMonitor.getMetrics();
      expect(metrics[0].minDuration).toBe(30);
      expect(metrics[0].maxDuration).toBe(150);
    });

    it('should track slow queries separately', () => {
      queryMonitor.trackQuery('SELECT * FROM products', 150, []);
      queryMonitor.trackQuery('SELECT * FROM orders', 50, []);

      const slowQueries = queryMonitor.getSlowQueries();
      expect(slowQueries.length).toBe(1);
      expect(slowQueries[0].duration).toBe(150);
    });
  });

  describe('getMetrics', () => {
    it('should return all query metrics', () => {
      queryMonitor.trackQuery('SELECT * FROM products', 50, []);
      queryMonitor.trackQuery('SELECT * FROM orders', 60, []);

      const metrics = queryMonitor.getMetrics();
      expect(metrics.length).toBe(2);
    });

    it('should sort by total duration descending', () => {
      queryMonitor.trackQuery('SELECT * FROM products', 50, []);
      queryMonitor.trackQuery('SELECT * FROM products', 50, []); // total 100
      queryMonitor.trackQuery('SELECT * FROM orders', 150, []); // total 150

      const metrics = queryMonitor.getMetrics();
      expect(metrics[0].totalDuration).toBeGreaterThan(metrics[1].totalDuration);
    });
  });

  describe('getSlowQueries', () => {
    it('should return queries exceeding threshold', () => {
      queryMonitor.trackQuery('SELECT * FROM products', 150, []);
      queryMonitor.trackQuery('SELECT * FROM orders', 50, []);
      queryMonitor.trackQuery('SELECT * FROM users', 200, []);

      const slowQueries = queryMonitor.getSlowQueries();
      expect(slowQueries.length).toBe(2);
    });

    it('should limit results based on limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        queryMonitor.trackQuery(`SELECT * FROM table${i}`, 150, []);
      }

      const slowQueries = queryMonitor.getSlowQueries(5);
      expect(slowQueries.length).toBe(5);
    });
  });

  describe('getTopQueries', () => {
    it('should return top queries by count', () => {
      queryMonitor.trackQuery('SELECT * FROM products', 50, []);
      queryMonitor.trackQuery('SELECT * FROM products', 50, []);
      queryMonitor.trackQuery('SELECT * FROM products', 50, []);
      queryMonitor.trackQuery('SELECT * FROM orders', 60, []);

      const topQueries = queryMonitor.getTopQueries('count', 10);
      expect(topQueries[0].count).toBe(3);
    });

    it('should return top queries by average duration', () => {
      queryMonitor.trackQuery('SELECT * FROM products', 50, []);
      queryMonitor.trackQuery('SELECT * FROM products', 50, []);
      queryMonitor.trackQuery('SELECT * FROM orders', 200, []);

      const topQueries = queryMonitor.getTopQueries('avgDuration', 10);
      expect(topQueries[0].avgDuration).toBe(200);
    });

    it('should throw error for invalid metric', () => {
      expect(() => {
        queryMonitor.getTopQueries('invalidMetric', 10);
      }).toThrow();
    });
  });

  describe('getSummary', () => {
    it('should return summary statistics', () => {
      queryMonitor.trackQuery('SELECT * FROM products', 50, []);
      queryMonitor.trackQuery('SELECT * FROM products', 50, []);
      queryMonitor.trackQuery('SELECT * FROM orders', 150, []);

      const summary = queryMonitor.getSummary();
      expect(summary.totalQueries).toBe(3);
      expect(summary.uniqueQueries).toBe(2);
      expect(summary.totalDuration).toBe(250);
      expect(summary.slowQueryCount).toBe(1);
    });

    it('should handle empty metrics', () => {
      const summary = queryMonitor.getSummary();
      expect(summary.totalQueries).toBe(0);
      expect(summary.uniqueQueries).toBe(0);
      expect(summary.totalDuration).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all metrics and slow queries', () => {
      queryMonitor.trackQuery('SELECT * FROM products', 150, []);
      queryMonitor.trackQuery('SELECT * FROM orders', 50, []);

      queryMonitor.reset();

      const metrics = queryMonitor.getMetrics();
      const slowQueries = queryMonitor.getSlowQueries();
      const summary = queryMonitor.getSummary();

      expect(metrics.length).toBe(0);
      expect(slowQueries.length).toBe(0);
      expect(summary.totalQueries).toBe(0);
    });
  });

  describe('monitor wrapper', () => {
    it('should execute query and track performance', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue({ id: 1, name: 'Test' });

      const result = await queryMonitor.monitor(
        mockQueryFn,
        'SELECT * FROM products WHERE id = ?',
        [1]
      );

      expect(mockQueryFn).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, name: 'Test' });

      const metrics = queryMonitor.getMetrics();
      expect(metrics.length).toBe(1);
    });

    it('should track query even if it fails', async () => {
      const mockQueryFn = jest.fn().mockRejectedValue(new Error('Query failed'));

      await expect(queryMonitor.monitor(mockQueryFn, 'SELECT * FROM products', [])).rejects.toThrow(
        'Query failed'
      );

      const metrics = queryMonitor.getMetrics();
      expect(metrics.length).toBe(1);
    });
  });
});

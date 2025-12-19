/**
 * Unit tests for Data History API
 * Phase 4: Data Management
 */

const { handler } = require('../../netlify/functions/data-history');

// Mock dependencies
jest.mock('../../config/database', () => ({
  database: {
    connect: jest.fn().mockResolvedValue(undefined),
    pool: null
  }
}));

jest.mock('../../utils/audit', () => ({
  logAudit: jest.fn()
}));

jest.mock('../../utils/http', () => ({
  requirePermission: jest.fn().mockResolvedValue({
    user: { id: 1, email: 'admin@test.com', role: 'admin' },
    response: null
  })
}));

jest.mock('../../utils/fn', () => ({
  withHandler: fn => fn
}));

const { database } = require('../../config/database');
const { logAudit } = require('../../utils/audit');

describe('Data History API', () => {
  let mockPool;
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
      end: jest.fn()
    };
    database.pool = mockPool;
    logAudit.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockEvent = (method, path, body = null, queryParams = {}) => ({
    httpMethod: method,
    path: `/.netlify/functions${path}`,
    headers: {
      Authorization: 'Bearer mock-token'
    },
    body: body ? JSON.stringify(body) : null,
    queryStringParameters: queryParams
  });

  describe('GET /data-history', () => {
    it('should list all history with filters', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              table_name: 'products',
              record_id: 123,
              action: 'update',
              changed_by: 1,
              changed_by_email: 'user@example.com',
              changed_at: new Date()
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const event = createMockEvent('GET', '/data-history');
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.history).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('should filter by table name', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const event = createMockEvent('GET', '/data-history', null, {
        table_name: 'products'
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('table_name = $1'),
        expect.any(Array)
      );
    });

    it('should filter by action', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const event = createMockEvent('GET', '/data-history', null, {
        action: 'update'
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('action = $'),
        expect.any(Array)
      );
    });
  });

  describe('GET /data-history/record', () => {
    it('should get history for specific record', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              table_name: 'products',
              record_id: 123,
              action: 'update'
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const event = createMockEvent('GET', '/data-history/record', null, {
        table_name: 'products',
        record_id: '123'
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.history).toHaveLength(1);
      expect(data.history[0].record_id).toBe(123);
    });

    it('should require table_name and record_id', async () => {
      const event = createMockEvent('GET', '/data-history/record');
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('table_name and record_id are required');
    });
  });

  describe('GET /data-history/compare', () => {
    it('should compare two versions', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            changed_at: new Date('2024-01-01'),
            new_data: { name: 'Product A', price: 10 }
          },
          {
            id: 2,
            changed_at: new Date('2024-01-02'),
            new_data: { name: 'Product A', price: 15 }
          }
        ]
      });

      const event = createMockEvent('GET', '/data-history/compare', null, {
        history_id_1: '1',
        history_id_2: '2'
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.version1).toBeDefined();
      expect(data.version2).toBeDefined();
      expect(data.differences).toBeDefined();
      expect(Array.isArray(data.differences)).toBe(true);
    });

    it('should require both history IDs', async () => {
      const event = createMockEvent('GET', '/data-history/compare', null, {
        history_id_1: '1'
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Both history_id_1 and history_id_2 are required');
    });

    it('should return 404 if versions not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const event = createMockEvent('GET', '/data-history/compare', null, {
        history_id_1: '1',
        history_id_2: '2'
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /data-history/stats', () => {
    it('should return change statistics', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              table_name: 'products',
              action: 'update',
              change_count: '10',
              unique_records: '5',
              unique_users: '2'
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ change_date: '2024-01-01', total_changes: '5' }]
        });

      const event = createMockEvent('GET', '/data-history/stats');
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.statistics).toBeDefined();
      expect(data.daily_trend).toBeDefined();
    });

    it('should filter stats by table', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

      const event = createMockEvent('GET', '/data-history/stats', null, {
        table_name: 'products',
        days: '7'
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /data-history/:id/restore', () => {
    it('should restore a previous version', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              table_name: 'products',
              record_id: 123,
              new_data: { name: 'Product A', price: 10 }
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 123, name: 'Product A', price: 10 }]
        });

      const event = createMockEvent('POST', '/data-history/1/restore');
      const response = await handler(event);

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT * FROM data_history WHERE id = $1',
        [1]
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('restored successfully');
      expect(data.restored_record).toBeDefined();
    });

    it('should return 404 if history not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const event = createMockEvent('POST', '/data-history/999/restore');
      const response = await handler(event);

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if no data to restore', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            table_name: 'products',
            record_id: 123,
            new_data: null,
            old_data: null
          }
        ]
      });

      const event = createMockEvent('POST', '/data-history/1/restore');
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('No data available to restore');
    });
  });

  describe('POST /data-history/enable-tracking', () => {
    it('should enable tracking for a table', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const event = createMockEvent('POST', '/data-history/enable-tracking', {
        table_name: 'products'
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Tracking enabled');
    });

    it('should require table_name', async () => {
      const event = createMockEvent('POST', '/data-history/enable-tracking', {});
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('table_name is required');
    });

    it('should handle already enabled tracking', async () => {
      mockQuery.mockRejectedValueOnce(new Error('already exists'));

      const event = createMockEvent('POST', '/data-history/enable-tracking', {
        table_name: 'products'
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('already enabled');
    });
  });
});

/**
 * Unit tests for analytics-events function
 */

const { handler } = require('../../netlify/functions/analytics-events');

// Mock database
jest.mock('../../config/database', () => ({
  database: {
    connect: jest.fn().mockResolvedValue(undefined),
    run: jest.fn(),
    all: jest.fn(),
    get: jest.fn()
  }
}));

// Mock utils
jest.mock('../../utils/fn', () => ({
  withHandler: fn => fn,
  ok: (data, status = 200) => ({
    statusCode: status,
    body: JSON.stringify(data)
  }),
  error: (status, message) => ({
    statusCode: status,
    body: JSON.stringify({ error: message })
  })
}));

jest.mock('../../utils/http', () => ({
  requirePermission: jest.fn()
}));

const { database } = require('../../config/database');
const { requirePermission } = require('../../utils/http');

describe('analytics-events function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST - Track Event', () => {
    it('should track a new event successfully', async () => {
      const mockEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          event_type: 'page_view',
          session_id: 'sess_123',
          page_url: '/test-page',
          referrer: 'https://google.com',
          properties: { test: 'data' }
        }),
        headers: {
          'user-agent': 'Test Agent'
        }
      };

      // Mock event insert
      database.run.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            event_type: 'page_view',
            session_id: 'sess_123'
          }
        ]
      });

      // Mock session check + session create
      database.get.mockResolvedValueOnce(null);
      database.run.mockResolvedValueOnce({ changes: 1 });

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(200);
      expect(database.run).toHaveBeenCalled();
    });

    it('should return error for missing required fields', async () => {
      const mockEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          event_type: 'page_view'
          // Missing session_id
        }),
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing required fields');
    });
  });

  describe('GET - Query Events', () => {
    it('should require authentication for querying events', async () => {
      requirePermission.mockResolvedValueOnce({
        user: null,
        response: {
          statusCode: 401,
          body: JSON.stringify({ error: 'Unauthorized' })
        }
      });

      const mockEvent = {
        httpMethod: 'GET',
        queryStringParameters: {},
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(401);
    });

    it('should return paginated events', async () => {
      requirePermission.mockResolvedValueOnce({
        user: { id: 1, role: 'admin' },
        response: null
      });

      database.all.mockResolvedValueOnce([
        { id: 1, event_type: 'page_view', session_id: 'sess_123' },
        { id: 2, event_type: 'click', session_id: 'sess_123' }
      ]);

      database.get.mockResolvedValueOnce({ count: '10' });

      const mockEvent = {
        httpMethod: 'GET',
        queryStringParameters: {
          page: '1',
          per_page: '10'
        },
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.events).toBeDefined();
      expect(body.pagination).toBeDefined();
    });

    it('should return aggregated statistics', async () => {
      requirePermission.mockResolvedValueOnce({
        user: { id: 1, role: 'admin' },
        response: null
      });

      // Mock aggregated queries
      database.all.mockResolvedValueOnce([
        { event_type: 'page_view', count: '100', unique_users: '10', unique_sessions: '20' }
      ]);

      database.all.mockResolvedValueOnce([
        { period: '2025-11-19', event_type: 'page_view', count: '50' }
      ]);

      database.get.mockResolvedValueOnce({
        total_sessions: '20',
        avg_duration: '120',
        avg_page_views: '5',
        unique_users: '10'
      });

      database.all.mockResolvedValueOnce([
        { page_url: '/home', views: '50', unique_sessions: '15' }
      ]);

      const mockEvent = {
        httpMethod: 'GET',
        queryStringParameters: {
          aggregate: 'true',
          date_from: '2025-11-01',
          date_to: '2025-11-19'
        },
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.event_types).toBeDefined();
      expect(body.trends).toBeDefined();
      expect(body.sessions).toBeDefined();
      expect(body.top_pages).toBeDefined();
    });
  });

  describe('DELETE - Cleanup Events', () => {
    it('should require admin permission for cleanup', async () => {
      requirePermission.mockResolvedValueOnce({
        user: null,
        response: {
          statusCode: 403,
          body: JSON.stringify({ error: 'Forbidden' })
        }
      });

      const mockEvent = {
        httpMethod: 'DELETE',
        queryStringParameters: {},
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(403);
    });

    it('should delete old events successfully', async () => {
      requirePermission.mockResolvedValueOnce({
        user: { id: 1, role: 'admin' },
        response: null
      });

      database.run.mockResolvedValueOnce({ changes: 50 });
      database.run.mockResolvedValueOnce({ changes: 10 });

      const mockEvent = {
        httpMethod: 'DELETE',
        queryStringParameters: {
          days_to_keep: '90'
        },
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.events_deleted).toBe(50);
      expect(body.sessions_deleted).toBe(10);
    });
  });
});

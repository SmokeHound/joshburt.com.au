/**
 * Unit tests for Backups API
 * Phase 4: Data Management
 */

const { handler } = require('../../netlify/functions/backups');

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

describe('Backups API', () => {
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

  describe('GET /backups', () => {
    it('should list backups with pagination', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, backup_type: 'full' }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const event = createMockEvent('GET', '/backups', null, { limit: '50', offset: '0' });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.backups).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('should filter backups by status', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const event = createMockEvent('GET', '/backups', null, { status: 'completed' });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        expect.arrayContaining(['completed'])
      );
    });
  });

  describe('GET /backups/:id', () => {
    it('should return specific backup details', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, backup_type: 'full', status: 'completed' }]
      });

      const event = createMockEvent('GET', '/backups/1');
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.id).toBe(1);
      expect(data.backup_type).toBe('full');
    });

    it('should return 404 if backup not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const event = createMockEvent('GET', '/backups/999');
      const response = await handler(event);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /backups', () => {
    it('should create a new full backup', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, backup_type: 'full', status: 'pending' }]
      });

      const event = createMockEvent('POST', '/backups', {
        backup_type: 'full',
        format: 'sql',
        compression: 'gzip'
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.backup_type).toBe('full');
      expect(data.status).toBe('pending');
    });

    it('should validate backup_type', async () => {
      const event = createMockEvent('POST', '/backups', {
        backup_type: 'invalid',
        format: 'sql'
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid backup_type');
    });

    it('should validate format', async () => {
      const event = createMockEvent('POST', '/backups', {
        backup_type: 'full',
        format: 'invalid'
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid format');
    });

    it('should require tables for table backup', async () => {
      const event = createMockEvent('POST', '/backups', {
        backup_type: 'table',
        format: 'sql',
        tables: []
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('requires at least one table');
    });
  });

  describe('PUT /backups/:id', () => {
    it('should update backup status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: 'completed', file_size: 1024 }]
      });

      const event = createMockEvent('PUT', '/backups/1', {
        status: 'completed',
        file_size: 1024,
        file_path: '/tmp/backup.sql.gz'
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('completed');
    });

    it('should return 404 if backup not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const event = createMockEvent('PUT', '/backups/999', {
        status: 'completed'
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /backups/:id', () => {
    it('should delete a backup', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, backup_type: 'full', file_path: '/tmp/backup.sql' }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const event = createMockEvent('DELETE', '/backups/1');
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('deleted successfully');
    });

    it('should return 404 if backup not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const event = createMockEvent('DELETE', '/backups/999');
      const response = await handler(event);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /backups/stats', () => {
    it('should return backup statistics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_backups: '10',
            completed: '8',
            failed: '1',
            running: '1',
            total_size: '1048576',
            last_backup_time: new Date()
          }
        ]
      });

      const event = createMockEvent('GET', '/backups/stats');
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.total_backups).toBe('10');
      expect(data.completed).toBe('8');
    });
  });
});

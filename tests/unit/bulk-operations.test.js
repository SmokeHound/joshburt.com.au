/**
 * Unit tests for Bulk Operations API
 * Phase 4: Data Management
 */

const { handler } = require('../../netlify/functions/bulk-operations');

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

describe('Bulk Operations API', () => {
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

  describe('GET /bulk-operations', () => {
    it('should list bulk operations', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, operation_type: 'import' }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const event = createMockEvent('GET', '/bulk-operations');
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.operations).toHaveLength(1);
    });

    it('should filter operations by status', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const event = createMockEvent('GET', '/bulk-operations', null, { status: 'completed' });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        expect.any(Array)
      );
    });
  });

  describe('POST /bulk-operations (create import)', () => {
    it('should validate CSV data only', async () => {
      const csvData = 'name,code,type\nProduct 1,P001,oil\nProduct 2,P002,oil';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ column_name: 'name' }, { column_name: 'code' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const event = createMockEvent('POST', '/bulk-operations', {
        target_table: 'products',
        format: 'csv',
        data: csvData,
        validate_only: true
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.total_records).toBeGreaterThan(0);
      expect(data).toHaveProperty('valid');
    });

    it('should reject invalid table name', async () => {
      const event = createMockEvent('POST', '/bulk-operations', {
        target_table: 'invalid_table',
        format: 'csv',
        data: 'test'
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid target_table');
    });

    it('should reject invalid format', async () => {
      const event = createMockEvent('POST', '/bulk-operations', {
        target_table: 'products',
        format: 'invalid',
        data: 'test'
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid format');
    });

    it('should create import operation', async () => {
      const csvData = 'name,code\nProduct 1,P001';

      mockQuery.mockResolvedValueOnce({ rows: [{ column_name: 'name' }] }).mockResolvedValueOnce({
        rows: [{ id: 1, operation_type: 'import', status: 'pending' }]
      });

      const event = createMockEvent('POST', '/bulk-operations', {
        target_table: 'products',
        format: 'csv',
        data: csvData,
        validate_only: false
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.operation_type).toBe('import');
    });
  });

  describe('POST /bulk-operations/:id/execute', () => {
    it('should execute import operation', async () => {
      const csvData = 'name,code\nProduct 1,P001';

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, operation_type: 'import', target_table: 'products', format: 'csv' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const event = createMockEvent('POST', '/bulk-operations/1/execute', {
        data: csvData
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('processed');
    });

    it('should return 404 if operation not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const event = createMockEvent('POST', '/bulk-operations/999/execute', {
        data: 'test'
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /bulk-operations/export', () => {
    it('should export data as CSV', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Product 1', code: 'P001' },
          { id: 2, name: 'Product 2', code: 'P002' }
        ]
      });

      const event = createMockEvent('GET', '/bulk-operations/export', null, {
        target_table: 'products',
        format: 'csv'
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('text/csv');
      expect(response.body).toContain('id,name,code');
    });

    it('should export data as JSON', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Product 1' }]
      });

      const event = createMockEvent('GET', '/bulk-operations/export', null, {
        target_table: 'products',
        format: 'json'
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');
      const data = JSON.parse(response.body);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should reject invalid table for export', async () => {
      const event = createMockEvent('GET', '/bulk-operations/export', null, {
        target_table: 'invalid_table',
        format: 'csv'
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid target_table');
    });
  });

  describe('CSV parsing', () => {
    it('should parse valid CSV data', () => {
      // This test would require access to the internal parseCSV function
      // For now, we test it indirectly through the API
      const csvData = 'name,code\n"Product 1",P001\n"Product 2",P002';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ column_name: 'name' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const event = createMockEvent('POST', '/bulk-operations', {
        target_table: 'products',
        format: 'csv',
        data: csvData,
        validate_only: true
      });

      return handler(event).then(response => {
        expect(response.statusCode).toBe(200);
      });
    });
  });
});

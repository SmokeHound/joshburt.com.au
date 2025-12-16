/**
 * Unit tests for scheduled-reports function
 */

// Mock pdfkit before requiring handler
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn((event, cb) => {
      if (event === 'end') {
        setTimeout(cb, 0);
      }
      return this;
    }),
    rect: jest.fn().mockReturnThis(),
    fill: jest.fn().mockReturnThis(),
    fillColor: jest.fn().mockReturnThis(),
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    moveTo: jest.fn().mockReturnThis(),
    lineTo: jest.fn().mockReturnThis(),
    strokeColor: jest.fn().mockReturnThis(),
    stroke: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
    end: jest.fn(),
    page: { width: 595, height: 842 }
  }));
});

const { handler } = require('../../netlify/functions/scheduled-reports');

// Mock database
jest.mock('../../config/database', () => ({
  database: {
    connect: jest.fn().mockResolvedValue(undefined),
    all: jest.fn(),
    get: jest.fn(),
    run: jest.fn()
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

describe('scheduled-reports function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET - List Reports', () => {
    it('should require authentication', async () => {
      requirePermission.mockResolvedValueOnce({
        user: null,
        response: {
          statusCode: 401,
          body: JSON.stringify({ error: 'Unauthorized' })
        }
      });

      const mockEvent = {
        httpMethod: 'GET',
        path: '/scheduled-reports',
        queryStringParameters: {},
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(401);
    });

    it('should return paginated list of reports', async () => {
      requirePermission.mockResolvedValueOnce({
        user: { id: 1, role: 'admin' },
        response: null
      });

      database.all.mockResolvedValueOnce([
        {
          id: 1,
          name: 'Weekly Sales Report',
          report_type: 'sales',
          frequency: 'weekly',
          is_active: true
        },
        {
          id: 2,
          name: 'Monthly Inventory Report',
          report_type: 'inventory',
          frequency: 'monthly',
          is_active: true
        }
      ]);

      database.get.mockResolvedValueOnce({ count: '2' });

      const mockEvent = {
        httpMethod: 'GET',
        path: '/scheduled-reports',
        queryStringParameters: {
          page: '1',
          per_page: '10'
        },
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.reports).toHaveLength(2);
      expect(body.pagination).toBeDefined();
    });

    it('should get specific report details', async () => {
      requirePermission.mockResolvedValueOnce({
        user: { id: 1, role: 'admin' },
        response: null
      });

      database.get.mockResolvedValueOnce({
        id: 1,
        name: 'Weekly Sales Report',
        report_type: 'sales',
        frequency: 'weekly',
        is_active: true,
        execution_count: 10
      });

      const mockEvent = {
        httpMethod: 'GET',
        path: '/scheduled-reports/1',
        queryStringParameters: {},
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.report.id).toBe(1);
    });
  });

  describe('POST - Create Report', () => {
    it('should create a new scheduled report', async () => {
      requirePermission.mockResolvedValueOnce({
        user: { id: 1, role: 'admin' },
        response: null
      });

      database.run.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Daily Sales Report',
            report_type: 'sales',
            frequency: 'daily'
          }
        ]
      });

      const mockEvent = {
        httpMethod: 'POST',
        path: '/scheduled-reports',
        body: JSON.stringify({
          name: 'Daily Sales Report',
          report_type: 'sales',
          frequency: 'daily',
          recipients: ['admin@example.com'],
          format: 'csv'
        }),
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('created successfully');
      expect(body.report).toBeDefined();
    });

    it('should validate required fields', async () => {
      requirePermission.mockResolvedValueOnce({
        user: { id: 1, role: 'admin' },
        response: null
      });

      const mockEvent = {
        httpMethod: 'POST',
        path: '/scheduled-reports',
        body: JSON.stringify({
          name: 'Test Report'
          // Missing required fields
        }),
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing required fields');
    });

    it('should validate frequency values', async () => {
      requirePermission.mockResolvedValueOnce({
        user: { id: 1, role: 'admin' },
        response: null
      });

      const mockEvent = {
        httpMethod: 'POST',
        path: '/scheduled-reports',
        body: JSON.stringify({
          name: 'Test Report',
          report_type: 'sales',
          frequency: 'invalid'
        }),
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Invalid frequency');
    });

    it('should generate report on-demand', async () => {
      requirePermission.mockResolvedValueOnce({
        user: { id: 1, role: 'admin' },
        response: null
      });

      // Mock scheduled report config lookup
      database.get.mockResolvedValueOnce({
        id: 1,
        name: 'Sales Report',
        report_type: 'sales',
        frequency: 'daily',
        format: 'csv',
        filters: {}
      });

      // Mock generated report data query (sales report)
      database.all.mockResolvedValueOnce([
        { id: 1, created_at: '2025-11-19', status: 'approved', total_items: 5 },
        { id: 2, created_at: '2025-11-18', status: 'pending', total_items: 3 }
      ]);

      // Mock history insert
      database.run.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            report_name: 'Sales Report',
            status: 'success'
          }
        ]
      });

      const mockEvent = {
        httpMethod: 'POST',
        path: '/scheduled-reports',
        body: JSON.stringify({
          action: 'generate',
          report_id: 1
        }),
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('generated successfully');
      expect(body.report).toBeDefined();
    });
  });

  describe('PUT - Update Report', () => {
    it('should update report configuration', async () => {
      requirePermission.mockResolvedValueOnce({
        user: { id: 1, role: 'admin' },
        response: null
      });

      database.run.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Updated Report Name',
            is_active: false
          }
        ]
      });

      const mockEvent = {
        httpMethod: 'PUT',
        path: '/scheduled-reports/1',
        body: JSON.stringify({
          name: 'Updated Report Name',
          is_active: false
        }),
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('updated successfully');
    });

    it('should return 404 for non-existent report', async () => {
      requirePermission.mockResolvedValueOnce({
        user: { id: 1, role: 'admin' },
        response: null
      });

      database.run.mockResolvedValueOnce({ rows: [] });

      const mockEvent = {
        httpMethod: 'PUT',
        path: '/scheduled-reports/999',
        body: JSON.stringify({
          name: 'Updated Name'
        }),
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE - Delete Report', () => {
    it('should delete report', async () => {
      requirePermission.mockResolvedValueOnce({
        user: { id: 1, role: 'admin' },
        response: null
      });

      database.run.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Deleted Report'
          }
        ]
      });

      const mockEvent = {
        httpMethod: 'DELETE',
        path: '/scheduled-reports/1',
        headers: {}
      };

      const response = await handler(mockEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('deleted successfully');
    });
  });
});

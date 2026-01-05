// Unit tests for utils/fn.js

// Mock config/database.js to avoid database initialization in tests
jest.mock('../../config/database', () => ({
  connect: jest.fn(),
  query: jest.fn(),
  getClient: jest.fn(),
  DB_TYPE: 'postgres'
}));

const {
  withHandler,
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  methodNotAllowed,
  getPagination,
  parseBool
} = require('../../utils/fn');

describe('Function Utilities (utils/fn.js)', () => {
  describe('withHandler', () => {
    test('should handle OPTIONS requests with 204 status', async () => {
      const handler = withHandler(() => ({ statusCode: 200, body: 'OK' }));

      const event = { httpMethod: 'OPTIONS' };
      const result = await handler(event, {});

      expect(result.statusCode).toBe(204);
      expect(result.headers).toBeDefined();
    });

    test('should call the wrapped handler for non-OPTIONS requests', async () => {
      const mockHandler = jest.fn(() => ({ statusCode: 200, body: 'OK' }));
      const handler = withHandler(mockHandler);

      const event = { httpMethod: 'GET' };
      const context = {};
      await handler(event, context);

      expect(mockHandler).toHaveBeenCalledWith(event, context);
    });

    test('should catch errors and return 500 response', async () => {
      const handler = withHandler(() => {
        throw new Error('Test error');
      });

      const event = { httpMethod: 'GET' };
      const result = await handler(event, {});

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body).error).toBe('Internal server error');
    });

    test('should pass through successful responses', async () => {
      const expectedResponse = { statusCode: 200, body: JSON.stringify({ data: 'test' }) };
      const handler = withHandler(() => expectedResponse);

      const event = { httpMethod: 'POST' };
      const result = await handler(event, {});

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('ok', () => {
    test('should return 200 status by default', () => {
      const response = ok({ message: 'Success' });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ message: 'Success' });
    });

    test('should accept custom status code', () => {
      const response = ok({ message: 'Created' }, 201);
      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual({ message: 'Created' });
    });

    test('should merge custom headers', () => {
      const response = ok({ data: 'test' }, 200, { 'X-Custom': 'header' });
      expect(response.headers).toBeDefined();
      expect(response.headers['X-Custom']).toBe('header');
    });

    test('should handle empty data', () => {
      const response = ok({});
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({});
    });

    test('should handle null data', () => {
      const response = ok(null);
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toBe(null);
    });
  });

  describe('error response helpers', () => {
    test('badRequest should return 400 status', () => {
      const response = badRequest('Invalid input');
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toBe('Invalid input');
    });

    test('badRequest should use default message', () => {
      const response = badRequest();
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toBe('Bad request');
    });

    test('unauthorized should return 401 status', () => {
      const response = unauthorized('Token expired');
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).error).toBe('Token expired');
    });

    test('unauthorized should use default message', () => {
      const response = unauthorized();
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).error).toBe('Authentication required');
    });

    test('forbidden should return 403 status', () => {
      const response = forbidden('Access denied');
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).error).toBe('Access denied');
    });

    test('forbidden should use default message', () => {
      const response = forbidden();
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).error).toBe('Insufficient permissions');
    });

    test('notFound should return 404 status', () => {
      const response = notFound('Resource not found');
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toBe('Resource not found');
    });

    test('notFound should use default message', () => {
      const response = notFound();
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toBe('Not found');
    });

    test('methodNotAllowed should return 405 status', () => {
      const response = methodNotAllowed('POST not allowed');
      expect(response.statusCode).toBe(405);
      expect(JSON.parse(response.body).error).toBe('POST not allowed');
    });

    test('methodNotAllowed should use default message', () => {
      const response = methodNotAllowed();
      expect(response.statusCode).toBe(405);
      expect(JSON.parse(response.body).error).toBe('Method not allowed');
    });
  });

  describe('getPagination', () => {
    test('should return default pagination values', () => {
      const result = getPagination();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    test('should parse page and limit from query string', () => {
      const result = getPagination({ page: '2', limit: '20' });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(20); // (2-1) * 20
    });

    test('should use custom defaults', () => {
      const result = getPagination({}, { page: 2, limit: 25 });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(25);
    });

    test('should enforce minimum page value of 1', () => {
      const result = getPagination({ page: '0' });
      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    test('should enforce minimum page value for negative numbers', () => {
      const result = getPagination({ page: '-5' });
      expect(result.page).toBe(1);
    });

    test('should enforce minimum limit value of 1', () => {
      const result = getPagination({ limit: '0' });
      expect(result.limit).toBe(1);
    });

    test('should enforce maximum limit value of 100', () => {
      const result = getPagination({ limit: '200' });
      expect(result.limit).toBe(100);
    });

    test('should calculate offset correctly', () => {
      expect(getPagination({ page: '1', limit: '10' }).offset).toBe(0);
      expect(getPagination({ page: '2', limit: '10' }).offset).toBe(10);
      expect(getPagination({ page: '3', limit: '25' }).offset).toBe(50);
      expect(getPagination({ page: '5', limit: '20' }).offset).toBe(80);
    });

    test('should handle invalid page strings', () => {
      const result = getPagination({ page: 'invalid' });
      expect(result.page).toBe(1);
    });

    test('should handle invalid limit strings', () => {
      const result = getPagination({ limit: 'invalid' });
      expect(result.limit).toBe(10);
    });

    test('should handle undefined query string', () => {
      const result = getPagination(undefined);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });
  });

  describe('parseBool', () => {
    test('should return fallback for undefined', () => {
      expect(parseBool(undefined)).toBe(false);
      expect(parseBool(undefined, true)).toBe(true);
    });

    test('should return fallback for null', () => {
      expect(parseBool(null)).toBe(false);
      expect(parseBool(null, true)).toBe(true);
    });

    test('should return boolean value unchanged', () => {
      expect(parseBool(true)).toBe(true);
      expect(parseBool(false)).toBe(false);
    });

    test('should parse string "true" as true', () => {
      expect(parseBool('true')).toBe(true);
      expect(parseBool('TRUE')).toBe(true);
      expect(parseBool('True')).toBe(true);
    });

    test('should parse string "1" as true', () => {
      expect(parseBool('1')).toBe(true);
    });

    test('should parse string "yes" as true', () => {
      expect(parseBool('yes')).toBe(true);
      expect(parseBool('YES')).toBe(true);
      expect(parseBool('Yes')).toBe(true);
    });

    test('should parse string "on" as true', () => {
      expect(parseBool('on')).toBe(true);
      expect(parseBool('ON')).toBe(true);
      expect(parseBool('On')).toBe(true);
    });

    test('should parse other strings as false', () => {
      expect(parseBool('false')).toBe(false);
      expect(parseBool('0')).toBe(false);
      expect(parseBool('no')).toBe(false);
      expect(parseBool('off')).toBe(false);
      expect(parseBool('random')).toBe(false);
      expect(parseBool('')).toBe(false);
    });

    test('should parse number 1 as true', () => {
      expect(parseBool(1)).toBe(true);
    });

    test('should parse number 0 as false', () => {
      expect(parseBool(0)).toBe(false);
    });

    test('should handle objects and arrays', () => {
      expect(parseBool({})).toBe(false);
      expect(parseBool([])).toBe(false);
    });
  });
});

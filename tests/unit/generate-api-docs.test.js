/**
 * Unit tests for API documentation generator
 */

const { parseFunction, generateOpenAPISpec, getCategoryFromName } = require('../../scripts/generate-api-docs');
const fs = require('fs');
const path = require('path');

describe('API Documentation Generator', () => {
  describe('getCategoryFromName', () => {
    test('should categorize auth functions', () => {
      expect(getCategoryFromName('auth')).toBe('Authentication');
      expect(getCategoryFromName('authentication')).toBe('Authentication');
    });

    test('should categorize user functions', () => {
      expect(getCategoryFromName('users')).toBe('Users');
      expect(getCategoryFromName('user-profile')).toBe('Users');
    });

    test('should categorize product functions', () => {
      expect(getCategoryFromName('products')).toBe('Products');
      expect(getCategoryFromName('product-list')).toBe('Products');
    });

    test('should categorize order functions', () => {
      expect(getCategoryFromName('orders')).toBe('Orders');
      expect(getCategoryFromName('order-items')).toBe('Orders');
    });

    test('should categorize analytics functions', () => {
      expect(getCategoryFromName('analytics')).toBe('Analytics');
      expect(getCategoryFromName('analytics-events')).toBe('Analytics');
    });

    test('should categorize public functions', () => {
      expect(getCategoryFromName('health')).toBe('Public');
      expect(getCategoryFromName('public-config')).toBe('Public');
    });

    test('should return Other for uncategorized functions', () => {
      expect(getCategoryFromName('unknown-function')).toBe('Other');
    });
  });

  describe('parseFunction', () => {
    test('should extract basic function information', () => {
      const mockContent = `
        // Netlify Function: Test endpoint
        const { withHandler } = require('../../utils/fn');
        
        exports.handler = withHandler(async (event) => {
          if (event.httpMethod === 'GET') {
            return { statusCode: 200 };
          }
        });
      `;

      // Create a temporary file
      const tempFile = path.join(__dirname, 'temp-test.js');
      fs.writeFileSync(tempFile, mockContent);

      const result = parseFunction(tempFile, 'temp-test.js');

      expect(result.name).toBe('temp-test');
      expect(result.endpoint).toBe('/.netlify/functions/temp-test');
      expect(result.methods).toContain('GET');

      // Clean up
      fs.unlinkSync(tempFile);
    });

    test('should detect authentication requirement', () => {
      const mockContent = `
        const { requireAuth } = require('../../utils/http');
        exports.handler = async (event) => {
          await requireAuth(event);
        };
      `;

      const tempFile = path.join(__dirname, 'temp-auth-test.js');
      fs.writeFileSync(tempFile, mockContent);

      const result = parseFunction(tempFile, 'temp-auth-test.js');

      expect(result.requiresAuth).toBe(true);

      fs.unlinkSync(tempFile);
    });

    test('should detect multiple HTTP methods', () => {
      const mockContent = `
        exports.handler = async (event) => {
          if (event.httpMethod === 'GET') return { statusCode: 200 };
          if (event.httpMethod === 'POST') return { statusCode: 201 };
          if (event.httpMethod === 'DELETE') return { statusCode: 204 };
        };
      `;

      const tempFile = path.join(__dirname, 'temp-methods-test.js');
      fs.writeFileSync(tempFile, mockContent);

      const result = parseFunction(tempFile, 'temp-methods-test.js');

      expect(result.methods).toContain('GET');
      expect(result.methods).toContain('POST');
      expect(result.methods).toContain('DELETE');

      fs.unlinkSync(tempFile);
    });

    test('should detect pagination support', () => {
      const mockContent = `
        const { getPagination } = require('../../utils/fn');
        exports.handler = async (event) => {
          const { page, limit } = getPagination(event.queryStringParameters);
        };
      `;

      const tempFile = path.join(__dirname, 'temp-pagination-test.js');
      fs.writeFileSync(tempFile, mockContent);

      const result = parseFunction(tempFile, 'temp-pagination-test.js');

      expect(result.supportsPagination).toBe(true);

      fs.unlinkSync(tempFile);
    });
  });

  describe('generateOpenAPISpec', () => {
    test('should generate valid OpenAPI specification', () => {
      const endpoints = [
        {
          endpoint: '/.netlify/functions/test',
          name: 'test',
          description: 'Test endpoint',
          methods: ['GET'],
          requiresAuth: true,
          queryParams: [],
          supportsPagination: false,
          returnsArray: false,
          tags: ['Public']
        }
      ];

      const spec = generateOpenAPISpec(endpoints);

      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe('joshburt.com.au API');
      expect(spec.paths).toBeDefined();
      expect(spec.paths['/.netlify/functions/test']).toBeDefined();
      expect(spec.paths['/.netlify/functions/test'].get).toBeDefined();
      expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
    });

    test('should include authentication for secured endpoints', () => {
      const endpoints = [
        {
          endpoint: '/.netlify/functions/secure',
          name: 'secure',
          description: 'Secure endpoint',
          methods: ['GET'],
          requiresAuth: true,
          queryParams: [],
          supportsPagination: false,
          returnsArray: false,
          tags: ['Other']
        }
      ];

      const spec = generateOpenAPISpec(endpoints);
      const operation = spec.paths['/.netlify/functions/secure'].get;

      expect(operation.security).toBeDefined();
      expect(operation.security[0].bearerAuth).toBeDefined();
    });

    test('should add query parameters to operations', () => {
      const endpoints = [
        {
          endpoint: '/.netlify/functions/paginated',
          name: 'paginated',
          description: 'Paginated endpoint',
          methods: ['GET'],
          requiresAuth: false,
          queryParams: [
            { name: 'page', type: 'integer', description: 'Page number' },
            { name: 'limit', type: 'integer', description: 'Items per page' }
          ],
          supportsPagination: true,
          returnsArray: true,
          tags: ['Other']
        }
      ];

      const spec = generateOpenAPISpec(endpoints);
      const operation = spec.paths['/.netlify/functions/paginated'].get;

      expect(operation.parameters).toHaveLength(2);
      expect(operation.parameters[0].name).toBe('page');
      expect(operation.parameters[1].name).toBe('limit');
    });

    test('should add request body for POST/PUT/PATCH methods', () => {
      const endpoints = [
        {
          endpoint: '/.netlify/functions/create',
          name: 'create',
          description: 'Create endpoint',
          methods: ['POST'],
          requiresAuth: true,
          queryParams: [],
          supportsPagination: false,
          returnsArray: false,
          tags: ['Other']
        }
      ];

      const spec = generateOpenAPISpec(endpoints);
      const operation = spec.paths['/.netlify/functions/create'].post;

      expect(operation.requestBody).toBeDefined();
      expect(operation.requestBody.content['application/json']).toBeDefined();
    });
  });
});

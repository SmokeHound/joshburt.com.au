/**
 * Unit tests for search API
 * Phase 3.1 of UPGRADE_PLAN.md
 */

// Mock database before importing
jest.mock('../../config/database', () => ({
  query: jest.fn()
}));

const db = require('../../config/database');

describe('Search API', () => {
  // Mock database responses
  const mockProducts = [
    {
      id: 1,
      name: 'Premium Engine Oil 5W-30',
      code: 'OIL-001',
      type: 'Engine Oil',
      description: 'High performance synthetic motor oil',
      specs: '5W-30 API SN/CF',
      stock_quantity: 50,
      is_active: true,
      rank: 0.9
    }
  ];

  const mockConsumables = [
    {
      id: 1,
      name: 'Shop Towels',
      code: 'CON-001',
      type: 'Cleaning',
      category: 'Workshop',
      description: 'Heavy duty cleaning towels',
      soh: 100,
      rank: 0.8
    }
  ];

  const mockFilters = [
    {
      id: 1,
      name: 'Oil Filter OF-123',
      code: 'FLT-001',
      type: 'Oil Filter',
      description: 'Premium oil filter',
      stock_quantity: 25,
      is_active: true,
      rank: 0.85
    }
  ];

  beforeEach(() => {
    // Mock database query
    db.query = jest.fn();
  });

  test('should perform universal search across all content types', async () => {
    // Mock database responses for each content type
    db.query
      .mockResolvedValueOnce({ rows: mockProducts }) // products
      .mockResolvedValueOnce({ rows: mockConsumables }) // consumables
      .mockResolvedValueOnce({ rows: mockFilters }) // filters
      .mockResolvedValueOnce({ rows: [] }) // users
      .mockResolvedValueOnce({ rows: [] }); // track search query

    const { handler } = require('../../netlify/functions/search');
    const event = {
      httpMethod: 'GET',
      queryStringParameters: {
        q: 'oil',
        type: 'all',
        limit: '20',
        offset: '0',
        sort: 'relevance'
      },
      headers: {}
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.query).toBe('oil');
    expect(body.total).toBe(3);
    expect(body.products).toHaveLength(1);
    expect(body.consumables).toHaveLength(1);
    expect(body.filters).toHaveLength(1);
  });

  test('should filter search by content type', async () => {
    db.query
      .mockResolvedValueOnce({ rows: mockProducts })
      .mockResolvedValueOnce({ rows: [] });

    const { handler } = require('../../netlify/functions/search');
    const event = {
      httpMethod: 'GET',
      queryStringParameters: {
        q: 'oil',
        type: 'product'
      },
      headers: {}
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.products).toHaveLength(1);
    expect(body.consumables).toHaveLength(0);
    expect(body.filters).toHaveLength(0);
  });

  test('should return error for missing query', async () => {
    const { handler } = require('../../netlify/functions/search');
    const event = {
      httpMethod: 'GET',
      queryStringParameters: {},
      headers: {}
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('Search query is required');
  });

  test('should get search suggestions', async () => {
    const mockSuggestions = [
      { query: 'oil filter', frequency: 10 },
      { query: 'oil change', frequency: 5 }
    ];

    db.query
      .mockResolvedValueOnce({ rows: mockSuggestions })
      .mockResolvedValueOnce({ rows: [] });

    const { handler } = require('../../netlify/functions/search');
    const event = {
      httpMethod: 'GET',
      queryStringParameters: {
        suggest: 'oil',
        limit: '5'
      },
      headers: {}
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.suggestions).toBeDefined();
    expect(Array.isArray(body.suggestions)).toBe(true);
  });

  test('should get popular searches', async () => {
    const mockPopular = [
      { query: 'oil filter', search_count: 100, unique_users: 25 },
      { query: 'brake pads', search_count: 85, unique_users: 20 }
    ];

    db.query.mockResolvedValueOnce({ rows: mockPopular });

    const { handler } = require('../../netlify/functions/search');
    const event = {
      httpMethod: 'GET',
      queryStringParameters: {
        popular: 'true',
        limit: '10'
      },
      headers: {}
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.popular).toBeDefined();
    expect(body.popular).toHaveLength(2);
    expect(body.popular[0].search_count).toBe(100);
  });

  test('should track search click', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const { handler } = require('../../netlify/functions/search');
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        query: 'oil filter',
        result_id: 1,
        result_type: 'product'
      }),
      headers: {}
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
  });

  test('should validate required fields for tracking click', async () => {
    const { handler } = require('../../netlify/functions/search');
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        query: 'oil filter'
        // Missing result_id and result_type
      }),
      headers: {}
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('Missing required fields');
  });

  test('should handle pagination parameters', async () => {
    db.query
      .mockResolvedValueOnce({ rows: mockProducts })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const { handler } = require('../../netlify/functions/search');
    const event = {
      httpMethod: 'GET',
      queryStringParameters: {
        q: 'oil',
        limit: '50',
        offset: '10'
      },
      headers: {}
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.metadata.limit).toBe(50);
    expect(body.metadata.offset).toBe(10);
  });

  test('should limit maximum results to 100', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const { handler } = require('../../netlify/functions/search');
    const event = {
      httpMethod: 'GET',
      queryStringParameters: {
        q: 'oil',
        limit: '200' // Request more than max
      },
      headers: {}
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.metadata.limit).toBe(100); // Capped at 100
  });

  test('should return 405 for unsupported methods', async () => {
    const { handler } = require('../../netlify/functions/search');
    const event = {
      httpMethod: 'DELETE',
      queryStringParameters: {},
      headers: {}
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(405);
  });
});

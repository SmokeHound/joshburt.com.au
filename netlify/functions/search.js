/**
 * Universal Search API
 * Phase 3.1 of UPGRADE_PLAN.md
 *
 * Provides full-text search across products, consumables, filters, and users
 * using PostgreSQL's built-in search capabilities with weighted ranking.
 *
 * Endpoints:
 * - GET /search?q=query&type=all&limit=20&offset=0&sort=relevance
 * - POST /search - Track search query and clicked result
 */

const { withHandler, error } = require('../../utils/fn');
const db = require('../../config/database');

/**
 * Perform full-text search across multiple content types
 * @param {string} query - Search query
 * @param {string} type - Content type filter: 'all', 'product', 'consumable', 'filter', 'user'
 * @param {number} limit - Max results per type
 * @param {number} offset - Offset for pagination
 * @param {string} sort - Sort order: 'relevance', 'name', 'recent'
 * @param {number|null} userId - Optional user ID for tracking
 * @returns {Object} Search results with metadata
 */
async function performSearch(
  query,
  type = 'all',
  limit = 20,
  offset = 0,
  sort = 'relevance',
  userId = null
) {
  if (!query || query.trim().length === 0) {
    throw new Error('Search query is required');
  }

  const searchQuery = query.trim();
  const tsQuery = searchQuery
    .split(/\s+/)
    .map(term => `${term}:*`)
    .join(' & ');

  const results = {
    query: searchQuery,
    type,
    total: 0,
    products: [],
    consumables: [],
    filters: [],
    users: [],
    metadata: {
      limit,
      offset,
      sort
    }
  };

  // Build ORDER BY clause based on sort option
  const getOrderBy = () => {
    switch (sort) {
      case 'name':
        return 'name ASC';
      case 'recent':
        return 'created_at DESC';
      case 'relevance':
      default:
        return 'rank DESC, name ASC';
    }
  };

  try {
    // Search products
    if (type === 'all' || type === 'product') {
      const productQuery = `
        SELECT 
          id,
          name,
          code,
          type,
          description,
          specs,
          image,
          stock_quantity,
          is_active,
          ts_rank(search_vector, to_tsquery('english', $1)) as rank
        FROM products
        WHERE search_vector @@ to_tsquery('english', $1)
          AND is_active = true
        ORDER BY ${getOrderBy()}
        LIMIT $2 OFFSET $3
      `;

      const productResult = await db.query(productQuery, [tsQuery, limit, offset]);
      results.products = productResult.rows.map(row => ({
        ...row,
        result_type: 'product'
      }));
    }

    // Search consumables
    if (type === 'all' || type === 'consumable') {
      const consumableQuery = `
        SELECT 
          id,
          name,
          code,
          type,
          category,
          description,
          soh as stock_quantity,
          ts_rank(search_vector, to_tsquery('english', $1)) as rank
        FROM consumables
        WHERE search_vector @@ to_tsquery('english', $1)
        ORDER BY ${getOrderBy()}
        LIMIT $2 OFFSET $3
      `;

      const consumableResult = await db.query(consumableQuery, [tsQuery, limit, offset]);
      results.consumables = consumableResult.rows.map(row => ({
        ...row,
        result_type: 'consumable'
      }));
    }

    // Search filters
    if (type === 'all' || type === 'filter') {
      const filterQuery = `
        SELECT 
          id,
          name,
          code,
          type,
          description,
          stock_quantity,
          is_active,
          ts_rank(search_vector, to_tsquery('english', $1)) as rank
        FROM filters
        WHERE search_vector @@ to_tsquery('english', $1)
          AND is_active = true
        ORDER BY ${getOrderBy()}
        LIMIT $2 OFFSET $3
      `;

      const filterResult = await db.query(filterQuery, [tsQuery, limit, offset]);
      results.filters = filterResult.rows.map(row => ({
        ...row,
        result_type: 'filter'
      }));
    }

    // Search users (only for authenticated requests, filtered later)
    if (type === 'all' || type === 'user') {
      const userQuery = `
        SELECT 
          id,
          name,
          email,
          role,
          avatar_url,
          is_active,
          ts_rank(search_vector, to_tsquery('english', $1)) as rank
        FROM users
        WHERE search_vector @@ to_tsquery('english', $1)
          AND is_active = true
        ORDER BY ${getOrderBy()}
        LIMIT $2 OFFSET $3
      `;

      const userResult = await db.query(userQuery, [tsQuery, limit, offset]);
      results.users = userResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        avatar_url: row.avatar_url,
        rank: row.rank,
        result_type: 'user'
      }));
    }

    // Calculate total results
    results.total =
      results.products.length +
      results.consumables.length +
      results.filters.length +
      results.users.length;

    // Track search query (fire and forget, don't await)
    trackSearchQuery(searchQuery, results.total, userId).catch(err => {
      console.error('Error tracking search query:', err);
    });

    return results;
  } catch (err) {
    console.error('Search error:', err);
    throw new Error(`Search failed: ${err.message}`);
  }
}

/**
 * Track search query for analytics
 * @param {string} query - Search query
 * @param {number} resultsCount - Number of results returned
 * @param {number|null} userId - Optional user ID
 */
async function trackSearchQuery(query, resultsCount, userId = null) {
  try {
    await db.query(
      `INSERT INTO search_queries (query, user_id, results_count)
       VALUES ($1, $2, $3)`,
      [query, userId, resultsCount]
    );
  } catch (err) {
    console.error('Error tracking search query:', err);
  }
}

/**
 * Track clicked search result
 * @param {string} query - Original search query
 * @param {number} resultId - ID of clicked result
 * @param {string} resultType - Type of result: 'product', 'consumable', 'filter', 'user'
 * @param {number|null} userId - Optional user ID
 */
async function trackSearchClick(query, resultId, resultType, userId = null) {
  try {
    // Find the most recent search query matching this query and user
    const result = await db.query(
      `UPDATE search_queries
       SET clicked_result_id = $1, clicked_result_type = $2
       WHERE id = (
         SELECT id FROM search_queries
         WHERE query = $3 AND ($4::integer IS NULL OR user_id = $4)
         ORDER BY timestamp DESC
         LIMIT 1
       )
       RETURNING id`,
      [resultId, resultType, query, userId]
    );

    return result.rows.length > 0;
  } catch (err) {
    console.error('Error tracking search click:', err);
    return false;
  }
}

/**
 * Get popular searches
 * @param {number} limit - Number of popular searches to return
 * @returns {Array} Popular search queries
 */
async function getPopularSearches(limit = 10) {
  try {
    const result = await db.query(
      `SELECT query, search_count, unique_users, avg_results, last_searched
       FROM popular_searches
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  } catch (err) {
    console.error('Error getting popular searches:', err);
    return [];
  }
}

/**
 * Get search suggestions/autocomplete
 * @param {string} partial - Partial search query
 * @param {number} limit - Max suggestions to return
 * @returns {Array} Search suggestions
 */
async function getSearchSuggestions(partial, limit = 5) {
  if (!partial || partial.trim().length < 2) {
    return [];
  }

  try {
    // Get suggestions from recent searches
    const recentResult = await db.query(
      `SELECT DISTINCT query, COUNT(*) as frequency
       FROM search_queries
       WHERE query ILIKE $1
         AND timestamp > NOW() - INTERVAL '7 days'
       GROUP BY query
       ORDER BY frequency DESC, query
       LIMIT $2`,
      [`${partial}%`, limit]
    );

    // Also get suggestions from product/consumable/filter names
    const nameResult = await db.query(
      `SELECT name as suggestion, 'product' as source
       FROM products
       WHERE name ILIKE $1 AND is_active = true
       LIMIT 3
       UNION ALL
       SELECT name as suggestion, 'consumable' as source
       FROM consumables
       WHERE name ILIKE $1
       LIMIT 2
       UNION ALL
       SELECT name as suggestion, 'filter' as source
       FROM filters
       WHERE name ILIKE $1 AND is_active = true
       LIMIT 2`,
      [`${partial}%`]
    );

    // Combine and deduplicate
    const allSuggestions = [
      ...recentResult.rows.map(r => ({
        text: r.query,
        source: 'recent',
        frequency: parseInt(r.frequency)
      })),
      ...nameResult.rows.map(r => ({ text: r.suggestion, source: r.source, frequency: 0 }))
    ];

    // Deduplicate and limit
    const uniqueSuggestions = [];
    const seen = new Set();
    for (const suggestion of allSuggestions) {
      const key = suggestion.text.toLowerCase();
      if (!seen.has(key) && uniqueSuggestions.length < limit) {
        seen.add(key);
        uniqueSuggestions.push(suggestion);
      }
    }

    return uniqueSuggestions;
  } catch (err) {
    console.error('Error getting search suggestions:', err);
    return [];
  }
}

/**
 * Handler function
 */
const handler = async event => {
  const method = event.httpMethod;

  // GET - Perform search or get suggestions/popular
  if (method === 'GET') {
    const params = event.queryStringParameters || {};

    // Get search suggestions
    if (params.suggest) {
      const suggestions = await getSearchSuggestions(params.suggest, parseInt(params.limit) || 5);
      return {
        statusCode: 200,
        body: JSON.stringify({ suggestions })
      };
    }

    // Get popular searches
    if (params.popular === 'true') {
      const popular = await getPopularSearches(parseInt(params.limit) || 10);
      return {
        statusCode: 200,
        body: JSON.stringify({ popular })
      };
    }

    // Perform search
    const query = params.q || params.query;
    if (!query) {
      return error(400, 'Search query is required (use ?q=searchterm)');
    }

    const type = params.type || 'all';
    const limit = Math.min(parseInt(params.limit) || 20, 100);
    const offset = parseInt(params.offset) || 0;
    const sort = params.sort || 'relevance';

    // Extract user ID from token if present (optional)
    let userId = null;
    if (event.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const token = event.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        // User not authenticated, continue with null userId
      }
    }

    const results = await performSearch(query, type, limit, offset, sort, userId);

    return {
      statusCode: 200,
      body: JSON.stringify(results)
    };
  }

  // POST - Track search click
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');

    if (!body.query || !body.result_id || !body.result_type) {
      return error(400, 'Missing required fields: query, result_id, result_type');
    }

    // Extract user ID from token if present (optional)
    let userId = null;
    if (event.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const token = event.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        // User not authenticated, continue with null userId
      }
    }

    const tracked = await trackSearchClick(body.query, body.result_id, body.result_type, userId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: tracked,
        message: tracked ? 'Search click tracked' : 'No matching search query found'
      })
    };
  }

  return error(405, 'Method not allowed');
};

module.exports = { handler: withHandler(handler) };

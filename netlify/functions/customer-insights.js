/**
 * Customer Insights API
 * Provides customer segmentation, purchase patterns, and recommendations
 */

const { Pool } = require('pg');
const { withHandler, error } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false
});

/**
 * GET /customer-insights?action=patterns
 * Get customer purchase patterns
 */
async function getPurchasePatterns(event) {
  await requirePermission(event, 'insights', 'read');

  const params = event.queryStringParameters || {};
  const userId = params.user_id ? parseInt(params.user_id) : null;
  const limit = params.limit ? parseInt(params.limit) : 50;

  const client = await pool.connect();

  try {
    let query = `
      SELECT 
        cpp.user_id,
        u.email as user_email,
        u.name as user_name,
        cpp.item_type,
        cpp.item_id,
        CASE cpp.item_type
          WHEN 'product' THEN p.name
          WHEN 'consumable' THEN c.name
          WHEN 'filter' THEN f.name
        END as item_name,
        cpp.purchase_count,
        cpp.total_quantity,
        cpp.avg_order_value,
        cpp.last_purchase_date,
        cpp.first_purchase_date,
        cpp.purchase_frequency_days
      FROM customer_purchase_patterns cpp
      LEFT JOIN users u ON cpp.user_id = u.id
      LEFT JOIN products p ON cpp.item_type = 'product' AND cpp.item_id = p.id
      LEFT JOIN consumables c ON cpp.item_type = 'consumable' AND cpp.item_id = c.id
      LEFT JOIN filters f ON cpp.item_type = 'filter' AND cpp.item_id = f.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND cpp.user_id = $${paramIndex}`;
      queryParams.push(userId);
      paramIndex++;
    }

    query += ` ORDER BY cpp.purchase_count DESC LIMIT $${paramIndex}`;
    queryParams.push(limit);

    const result = await client.query(query, queryParams);

    return {
      statusCode: 200,
      body: JSON.stringify({
        patterns: result.rows,
        count: result.rows.length
      })
    };
  } finally {
    client.release();
  }
}

/**
 * GET /customer-insights?action=segmentation
 * Get customer segmentation (RFM analysis)
 */
async function getCustomerSegmentation(event) {
  await requirePermission(event, 'insights', 'read');

  const client = await pool.connect();

  try {
    const query = `
      WITH customer_metrics AS (
        SELECT 
          o.created_by::INTEGER as user_id,
          COUNT(DISTINCT o.id) as frequency,
          MAX(o.created_at) as last_order_date,
          EXTRACT(DAYS FROM NOW() - MAX(o.created_at)) as recency_days,
          SUM(o.total_items) as total_items_ordered
        FROM orders o
        WHERE o.created_by ~ '^[0-9]+$'
          AND o.status IN ('pending', 'processing', 'completed')
        GROUP BY o.created_by::INTEGER
      ),
      rfm_scores AS (
        SELECT 
          cm.user_id,
          u.email,
          u.name,
          cm.frequency,
          cm.recency_days,
          cm.total_items_ordered,
          cm.last_order_date,
          NTILE(5) OVER (ORDER BY cm.recency_days) as recency_score,
          NTILE(5) OVER (ORDER BY cm.frequency DESC) as frequency_score,
          NTILE(5) OVER (ORDER BY cm.total_items_ordered DESC) as monetary_score
        FROM customer_metrics cm
        LEFT JOIN users u ON cm.user_id = u.id
      )
      SELECT 
        user_id,
        email,
        name,
        frequency as order_count,
        recency_days,
        total_items_ordered,
        last_order_date,
        recency_score,
        frequency_score,
        monetary_score,
        (recency_score + frequency_score + monetary_score) / 3.0 as avg_score,
        CASE 
          WHEN recency_score >= 4 AND frequency_score >= 4 THEN 'Champions'
          WHEN recency_score >= 3 AND frequency_score >= 3 THEN 'Loyal Customers'
          WHEN recency_score >= 4 AND frequency_score <= 2 THEN 'Promising'
          WHEN recency_score <= 2 AND frequency_score >= 3 THEN 'At Risk'
          WHEN recency_score <= 2 AND frequency_score <= 2 THEN 'Lost'
          ELSE 'Need Attention'
        END as segment
      FROM rfm_scores
      ORDER BY avg_score DESC
    `;

    const result = await client.query(query);

    // Group by segment
    const segmentCounts = {};
    result.rows.forEach(row => {
      const segment = row.segment;
      segmentCounts[segment] = (segmentCounts[segment] || 0) + 1;
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        customers: result.rows,
        segment_counts: segmentCounts,
        total_customers: result.rows.length
      })
    };
  } finally {
    client.release();
  }
}

/**
 * GET /customer-insights?action=affinity
 * Get product affinity (items frequently bought together)
 */
async function getProductAffinity(event) {
  await requirePermission(event, 'insights', 'read');

  const params = event.queryStringParameters || {};
  const itemType = params.item_type;
  const itemId = params.item_id ? parseInt(params.item_id) : null;
  const minScore = params.min_score ? parseFloat(params.min_score) : 0.3;
  const limit = params.limit ? parseInt(params.limit) : 50;

  const client = await pool.connect();

  try {
    let query = `
      SELECT 
        pa.item_a_type,
        pa.item_a_id,
        CASE pa.item_a_type
          WHEN 'product' THEN p1.name
          WHEN 'consumable' THEN c1.name
          WHEN 'filter' THEN f1.name
        END as item_a_name,
        pa.item_b_type,
        pa.item_b_id,
        CASE pa.item_b_type
          WHEN 'product' THEN p2.name
          WHEN 'consumable' THEN c2.name
          WHEN 'filter' THEN f2.name
        END as item_b_name,
        pa.co_occurrence_count,
        pa.confidence_score
      FROM product_affinity pa
      LEFT JOIN products p1 ON pa.item_a_type = 'product' AND pa.item_a_id = p1.id
      LEFT JOIN consumables c1 ON pa.item_a_type = 'consumable' AND pa.item_a_id = c1.id
      LEFT JOIN filters f1 ON pa.item_a_type = 'filter' AND pa.item_a_id = f1.id
      LEFT JOIN products p2 ON pa.item_b_type = 'product' AND pa.item_b_id = p2.id
      LEFT JOIN consumables c2 ON pa.item_b_type = 'consumable' AND pa.item_b_id = c2.id
      LEFT JOIN filters f2 ON pa.item_b_type = 'filter' AND pa.item_b_id = f2.id
      WHERE pa.confidence_score >= $1
    `;

    const queryParams = [minScore];
    let paramIndex = 2;

    if (itemType && itemId) {
      query += ` AND ((pa.item_a_type = $${paramIndex} AND pa.item_a_id = $${paramIndex + 1})
                   OR (pa.item_b_type = $${paramIndex} AND pa.item_b_id = $${paramIndex + 1}))`;
      queryParams.push(itemType, itemId);
      paramIndex += 2;
    }

    query += ` ORDER BY pa.confidence_score DESC LIMIT $${paramIndex}`;
    queryParams.push(limit);

    const result = await client.query(query, queryParams);

    return {
      statusCode: 200,
      body: JSON.stringify({
        affinities: result.rows,
        count: result.rows.length
      })
    };
  } finally {
    client.release();
  }
}

/**
 * POST /customer-insights?action=calculate-patterns
 * Calculate purchase patterns from order history
 */
async function calculatePurchasePatterns(event) {
  await requirePermission(event, 'insights', 'create');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear existing patterns
    await client.query('DELETE FROM customer_purchase_patterns');

    // Calculate patterns from order history
    const insertQuery = `
      INSERT INTO customer_purchase_patterns 
        (user_id, item_type, item_id, purchase_count, total_quantity, 
         avg_order_value, last_purchase_date, first_purchase_date, purchase_frequency_days)
      SELECT 
        o.created_by::INTEGER as user_id,
        'product' as item_type,
        p.id as item_id,
        COUNT(DISTINCT o.id) as purchase_count,
        SUM(oi.quantity) as total_quantity,
        AVG(oi.quantity)::DECIMAL(10,2) as avg_order_value,
        MAX(o.created_at) as last_purchase_date,
        MIN(o.created_at) as first_purchase_date,
        CASE 
          WHEN COUNT(DISTINCT o.id) > 1 
          THEN EXTRACT(DAYS FROM MAX(o.created_at) - MIN(o.created_at))::INTEGER / (COUNT(DISTINCT o.id) - 1)
          ELSE NULL
        END as purchase_frequency_days
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_code = p.code
      WHERE o.created_by ~ '^[0-9]+$'
        AND o.status IN ('pending', 'processing', 'completed')
      GROUP BY o.created_by::INTEGER, p.id
      HAVING COUNT(DISTINCT o.id) > 0
    `;

    const result = await client.query(insertQuery);

    await client.query('COMMIT');

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Purchase patterns calculated successfully',
        patterns_created: result.rowCount
      })
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error calculating patterns:', err);
    return error(500, 'Failed to calculate purchase patterns');
  } finally {
    client.release();
  }
}

/**
 * POST /customer-insights?action=calculate-affinity
 * Calculate product affinity from order history
 */
async function calculateProductAffinity(event) {
  await requirePermission(event, 'insights', 'create');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear existing affinity data
    await client.query('DELETE FROM product_affinity');

    // Find products bought together in same order
    const insertQuery = `
      INSERT INTO product_affinity 
        (item_a_type, item_a_id, item_b_type, item_b_id, co_occurrence_count, confidence_score)
      SELECT 
        'product' as item_a_type,
        p1.id as item_a_id,
        'product' as item_b_type,
        p2.id as item_b_id,
        COUNT(DISTINCT oi1.order_id) as co_occurrence_count,
        (COUNT(DISTINCT oi1.order_id)::DECIMAL / 
         (SELECT COUNT(DISTINCT order_id) FROM order_items oi3 
          JOIN products p3 ON oi3.product_code = p3.code 
          WHERE p3.id = p1.id))::DECIMAL(3,2) as confidence_score
      FROM order_items oi1
      JOIN products p1 ON oi1.product_code = p1.code
      JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.id != oi2.id
      JOIN products p2 ON oi2.product_code = p2.code
      WHERE p1.id < p2.id
      GROUP BY p1.id, p2.id
      HAVING COUNT(DISTINCT oi1.order_id) >= 2
    `;

    const result = await client.query(insertQuery);

    await client.query('COMMIT');

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Product affinity calculated successfully',
        affinities_created: result.rowCount
      })
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error calculating affinity:', err);
    return error(500, 'Failed to calculate product affinity');
  } finally {
    client.release();
  }
}

/**
 * GET /customer-insights?action=recommendations
 * Get personalized recommendations for a user
 */
async function getRecommendations(event) {
  await requirePermission(event, 'insights', 'read');

  const params = event.queryStringParameters || {};
  const userId = params.user_id ? parseInt(params.user_id) : null;

  if (!userId) {
    return error(400, 'user_id is required');
  }

  const client = await pool.connect();

  try {
    // Get recommendations based on purchase patterns and affinity
    const query = `
      SELECT DISTINCT
        pa.item_b_type as recommended_type,
        pa.item_b_id as recommended_id,
        CASE pa.item_b_type
          WHEN 'product' THEN p.name
          WHEN 'consumable' THEN c.name
          WHEN 'filter' THEN f.name
        END as recommended_name,
        pa.confidence_score,
        'affinity' as reason
      FROM customer_purchase_patterns cpp
      JOIN product_affinity pa ON 
        cpp.item_type = pa.item_a_type AND cpp.item_id = pa.item_a_id
      LEFT JOIN products p ON pa.item_b_type = 'product' AND pa.item_b_id = p.id
      LEFT JOIN consumables c ON pa.item_b_type = 'consumable' AND pa.item_b_id = c.id
      LEFT JOIN filters f ON pa.item_b_type = 'filter' AND pa.item_b_id = f.id
      WHERE cpp.user_id = $1
        AND pa.confidence_score >= 0.3
        AND NOT EXISTS (
          SELECT 1 FROM customer_purchase_patterns cpp2
          WHERE cpp2.user_id = $1
            AND cpp2.item_type = pa.item_b_type
            AND cpp2.item_id = pa.item_b_id
        )
      ORDER BY pa.confidence_score DESC
      LIMIT 10
    `;

    const result = await client.query(query, [userId]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        user_id: userId,
        recommendations: result.rows,
        count: result.rows.length
      })
    };
  } finally {
    client.release();
  }
}

// Main handler
const handler = withHandler(async event => {
  const method = event.httpMethod;
  const action = event.queryStringParameters?.action;

  if (method === 'GET') {
    switch (action) {
      case 'patterns':
        return await getPurchasePatterns(event);
      case 'segmentation':
        return await getCustomerSegmentation(event);
      case 'affinity':
        return await getProductAffinity(event);
      case 'recommendations':
        return await getRecommendations(event);
      default:
        return error(
          400,
          'Invalid action. Valid actions: patterns, segmentation, affinity, recommendations'
        );
    }
  } else if (method === 'POST') {
    switch (action) {
      case 'calculate-patterns':
        return await calculatePurchasePatterns(event);
      case 'calculate-affinity':
        return await calculateProductAffinity(event);
      default:
        return error(400, 'Invalid action. Valid actions: calculate-patterns, calculate-affinity');
    }
  }

  return error(405, 'Method not allowed');
});

module.exports = { handler };

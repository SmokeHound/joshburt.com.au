/**
 * Inventory Forecast API
 * Provides demand predictions and forecasting data
 */

const { withHandler, error } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const {
  calculateForecast,
  storeForecasts,
  getLowStockAlerts
} = require('../../scripts/forecast-calculator');
const { database } = require('../../config/database');

async function getPool() {
  if (!database.pool) await database.connect();
  return database.pool;
}

/**
 * GET /inventory-forecast
 * Get forecasts for items
 * Query params:
 *   - item_type: product, consumable, filter (optional)
 *   - item_id: specific item id (optional)
 *   - days: number of days ahead (default: 30)
 *   - min_confidence: minimum confidence level (default: 0)
 */
async function getForecasts(event) {
  const { user, response: authResponse } = await requirePermission(event, 'forecast', 'read');
  if (authResponse) return authResponse;

  const params = event.queryStringParameters || {};
  const itemType = params.item_type;
  const itemId = params.item_id ? parseInt(params.item_id) : null;
  const days = params.days ? parseInt(params.days) : 30;
  const minConfidence = params.min_confidence ? parseFloat(params.min_confidence) : 0;

    const client = await (await getPool()).connect();

  try {
    let query = `
      SELECT 
        f.id,
        f.item_type,
        f.item_id,
        CASE f.item_type
          WHEN 'product' THEN p.name
          WHEN 'consumable' THEN c.name
          WHEN 'filter' THEN fi.name
        END as item_name,
        CASE f.item_type
          WHEN 'product' THEN p.code
          WHEN 'consumable' THEN c.code
          WHEN 'filter' THEN fi.code
        END as item_code,
        f.forecast_date,
        f.predicted_demand,
        f.confidence_level,
        f.factors,
        f.created_at
      FROM inventory_forecasts f
      LEFT JOIN products p ON f.item_type = 'product' AND f.item_id = p.id
      LEFT JOIN consumables c ON f.item_type = 'consumable' AND f.item_id = c.id
      LEFT JOIN filters fi ON f.item_type = 'filter' AND f.item_id = fi.id
      WHERE f.forecast_date >= CURRENT_DATE
        AND f.forecast_date <= CURRENT_DATE + $1
        AND f.confidence_level >= $2
    `;

    const queryParams = [days, minConfidence];
    let paramIndex = 3;

    if (itemType) {
      query += ` AND f.item_type = $${paramIndex}`;
      queryParams.push(itemType);
      paramIndex++;
    }

    if (itemId) {
      query += ` AND f.item_id = $${paramIndex}`;
      queryParams.push(itemId);
      paramIndex++;
    }

    query += ' ORDER BY f.forecast_date ASC, f.item_type, f.item_id';

    const result = await client.query(query, queryParams);

    return {
      statusCode: 200,
      body: JSON.stringify({
        forecasts: result.rows,
        count: result.rows.length
      })
    };
  } finally {
    client.release();
  }
}

/**
 * POST /inventory-forecast
 * Generate new forecasts for specific items
 * Body:
 *   - item_type: product, consumable, filter
 *   - item_id: item id
 *   - days: number of days to forecast (default: 30)
 */
async function generateForecast(event) {
  const { user, response: authResponse } = await requirePermission(event, 'forecast', 'create');
  if (authResponse) return authResponse;

  const body = JSON.parse(event.body || '{}');
  const { item_type, item_id, days = 30 } = body;

  if (!item_type || !item_id) {
    return error(400, 'item_type and item_id are required');
  }

  if (!['product', 'consumable', 'filter'].includes(item_type)) {
    return error(400, 'item_type must be product, consumable, or filter');
  }

  try {
    const result = await calculateForecast(item_type, item_id, days);

    if (result.forecasts.length > 0) {
      await storeForecasts(item_type, item_id, result.forecasts, result.factors);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Forecast generated successfully',
        forecast: result
      })
    };
  } catch (err) {
    console.error('Error generating forecast:', err);
    return error(500, 'Failed to generate forecast');
  }
}

/**
 * POST /inventory-forecast?action=generate-all
 * Generate forecasts for all items
 */
async function generateAllForecasts(event) {
  const { user, response: authResponse } = await requirePermission(event, 'forecast', 'create');
  if (authResponse) return authResponse;

  const client = await pool.connect();

  try {
    // Get all active items
    const productsResult = await client.query('SELECT id FROM products WHERE is_active = true');
    const consumablesResult = await client.query('SELECT id FROM consumables');
    const filtersResult = await client.query('SELECT id FROM filters WHERE is_active = true');

    const allItems = [
      ...productsResult.rows.map(r => ({ type: 'product', id: r.id })),
      ...consumablesResult.rows.map(r => ({ type: 'consumable', id: r.id })),
      ...filtersResult.rows.map(r => ({ type: 'filter', id: r.id }))
    ];

    let processed = 0;
    let skipped = 0;

    for (const item of allItems) {
      try {
        const result = await calculateForecast(item.type, item.id, 30);
        if (result.forecasts.length > 0) {
          await storeForecasts(item.type, item.id, result.forecasts, result.factors);
          processed++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`Error forecasting ${item.type} #${item.id}:`, err.message);
        skipped++;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Bulk forecast generation complete',
        total: allItems.length,
        processed,
        skipped
      })
    };
  } finally {
    client.release();
  }
}

/**
 * GET /inventory-forecast?action=alerts
 * Get low stock alerts based on forecasts
 */
async function getAlerts(event) {
  const { user, response: authResponse } = await requirePermission(event, 'forecast', 'read');
  if (authResponse) return authResponse;

  const params = event.queryStringParameters || {};
  const days = params.days ? parseInt(params.days) : 7;

  try {
    const alerts = await getLowStockAlerts(days);

    return {
      statusCode: 200,
      body: JSON.stringify({
        alerts,
        count: alerts.length,
        days_ahead: days
      })
    };
  } catch (err) {
    console.error('Error getting alerts:', err);
    return error(500, 'Failed to get low stock alerts');
  }
}

/**
 * GET /inventory-forecast?action=summary
 * Get forecast summary statistics
 */
async function getSummary(event) {
  const { user, response: authResponse } = await requirePermission(event, 'forecast', 'read');
  if (authResponse) return authResponse;

  const client = await pool.connect();

  try {
    const summaryQuery = `
      SELECT 
        item_type,
        COUNT(DISTINCT item_id) as items_forecasted,
        COUNT(*) as total_forecasts,
        AVG(confidence_level) as avg_confidence,
        SUM(predicted_demand) as total_predicted_demand,
        MIN(forecast_date) as earliest_forecast,
        MAX(forecast_date) as latest_forecast
      FROM inventory_forecasts
      WHERE forecast_date >= CURRENT_DATE
      GROUP BY item_type
    `;

      const result = await client.query(summaryQuery);

    // Get low stock count
    const alerts = await getLowStockAlerts(7);

    return {
      statusCode: 200,
      body: JSON.stringify({
        summary: result.rows,
        low_stock_alerts: alerts.length
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
    if (action === 'alerts') {
      return await getAlerts(event);
    } else if (action === 'summary') {
      return await getSummary(event);
    } else {
      return await getForecasts(event);
    }
  } else if (method === 'POST') {
    if (action === 'generate-all') {
      return await generateAllForecasts(event);
    } else {
      return await generateForecast(event);
    }
  }

  return error(405, 'Method not allowed');
});

module.exports = { handler };

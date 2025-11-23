#!/usr/bin/env node

/**
 * Inventory Forecasting Engine
 * Calculates demand predictions based on historical sales data
 * Uses simple statistical methods: moving averages, trend analysis, seasonality
 */

require('dotenv').config();
const { database } = require('../config/database');

// Helper to get a connected client from the shared database wrapper
async function getClient() {
  await database.connect();
  return await database.pool.connect();
}

/**
 * Calculate moving average for demand smoothing
 */
function calculateMovingAverage(values, windowSize = 7) {
  if (values.length < windowSize) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  const recent = values.slice(-windowSize);
  return recent.reduce((a, b) => a + b, 0) / windowSize;
}

/**
 * Calculate trend using simple linear regression
 */
function calculateTrend(values) {
  const n = values.length;
  if (n < 2) {
    return 0;
  }

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  // Slope of the trend line
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

/**
 * Detect seasonal patterns (weekly)
 */
function detectSeasonality(historicalData) {
  // Group by day of week
  const dayPatterns = {};

  historicalData.forEach(item => {
    const day = new Date(item.date).getDay();
    if (!dayPatterns[day]) {
      dayPatterns[day] = [];
    }
    dayPatterns[day].push(item.quantity);
  });

  // Calculate average for each day
  const seasonalFactors = {};
  Object.keys(dayPatterns).forEach(day => {
    const avg = dayPatterns[day].reduce((a, b) => a + b, 0) / dayPatterns[day].length;
    seasonalFactors[day] = avg;
  });

  return seasonalFactors;
}

/**
 * Calculate forecast for a specific item
 */
async function calculateForecast(itemType, itemId, forecastDays = 30) {
  const client = await getClient();

  try {
    // Get historical order data (last 90 days)
    const historicalQuery = `
      SELECT 
        DATE(o.created_at) as date,
        SUM(oi.quantity) as quantity
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status IN ('pending', 'processing', 'completed')
        AND o.created_at >= NOW() - INTERVAL '90 days'
        AND (
          (oi.product_code IN (
            SELECT code FROM ${itemType === 'product' ? 'products' : itemType === 'consumable' ? 'consumables' : 'filters'}
            WHERE id = $1
          ))
        )
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `;

    const histResult = await client.query(historicalQuery, [itemId]);
    const historicalData = histResult.rows;

    if (historicalData.length === 0) {
      // No historical data, return zero forecast
      return {
        itemType,
        itemId,
        forecasts: [],
        confidence: 0,
        factors: { note: 'No historical data available' }
      };
    }

    // Extract quantity values
    const quantities = historicalData.map(d => parseInt(d.quantity));

    // Calculate statistics
    const movingAvg = calculateMovingAverage(quantities, 7);
    const trend = calculateTrend(quantities);
    const seasonalFactors = detectSeasonality(historicalData);

    // Calculate standard deviation for confidence
    const mean = quantities.reduce((a, b) => a + b, 0) / quantities.length;
    const variance =
      quantities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / quantities.length;
    const stdDev = Math.sqrt(variance);

    // Calculate coefficient of variation for confidence level
    const cv = mean > 0 ? stdDev / mean : 1;
    const confidence = Math.max(0, Math.min(1, 1 - cv));

    // Generate forecasts
    const forecasts = [];
    const today = new Date();

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + i);

      const dayOfWeek = forecastDate.getDay();
      const seasonalFactor = seasonalFactors[dayOfWeek] || movingAvg;

      // Combine moving average, trend, and seasonality
      let predictedDemand = movingAvg + trend * i;

      // Apply seasonal adjustment
      if (seasonalFactors[dayOfWeek]) {
        const avgSeasonal =
          Object.values(seasonalFactors).reduce((a, b) => a + b, 0) /
          Object.keys(seasonalFactors).length;
        predictedDemand = predictedDemand * (seasonalFactor / avgSeasonal);
      }

      // Ensure non-negative
      predictedDemand = Math.max(0, Math.round(predictedDemand));

      forecasts.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedDemand,
        confidence: parseFloat(confidence.toFixed(2))
      });
    }

    return {
      itemType,
      itemId,
      forecasts,
      confidence: parseFloat(confidence.toFixed(2)),
      factors: {
        movingAverage: Math.round(movingAvg),
        trend: parseFloat(trend.toFixed(2)),
        seasonalPatterns: seasonalFactors,
        historicalDays: historicalData.length,
        averageDailyDemand: Math.round(mean),
        standardDeviation: parseFloat(stdDev.toFixed(2))
      }
    };
  } finally {
    client.release();
  }
}

/**
 * Store forecasts in the database
 */
async function storeForecasts(itemType, itemId, forecasts, factors) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Delete old forecasts for this item
    await client.query('DELETE FROM inventory_forecasts WHERE item_type = $1 AND item_id = $2', [
      itemType,
      itemId
    ]);

    // Insert new forecasts
    for (const forecast of forecasts) {
      await client.query(
        `INSERT INTO inventory_forecasts (item_type, item_id, forecast_date, predicted_demand, confidence_level, factors)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          itemType,
          itemId,
          forecast.date,
          forecast.predictedDemand,
          forecast.confidence,
          JSON.stringify(factors)
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`✅ Stored ${forecasts.length} forecasts for ${itemType} #${itemId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate forecasts for all active items
 */
async function calculateAllForecasts() {
  const client = await getClient();

  try {
    console.log('🔮 Starting inventory forecast calculation...\n');

    // Get all active products
    const productsResult = await client.query('SELECT id FROM products WHERE is_active = true');

    // Get all consumables
    const consumablesResult = await client.query('SELECT id FROM consumables');

    // Get all filters
    const filtersResult = await client.query('SELECT id FROM filters WHERE is_active = true');

    const allItems = [
      ...productsResult.rows.map(r => ({ type: 'product', id: r.id })),
      ...consumablesResult.rows.map(r => ({ type: 'consumable', id: r.id })),
      ...filtersResult.rows.map(r => ({ type: 'filter', id: r.id }))
    ];

    console.log(`📊 Found ${allItems.length} items to forecast\n`);

    let processed = 0;
    let skipped = 0;

    for (const item of allItems) {
      try {
        const result = await calculateForecast(item.type, item.id);

        if (result.forecasts.length > 0) {
          await storeForecasts(item.type, item.id, result.forecasts, result.factors);
          processed++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error forecasting ${item.type} #${item.id}:`, error.message);
        skipped++;
      }
    }

    console.log('\n✅ Forecast calculation complete!');
    console.log(`   Processed: ${processed}`);
    console.log(`   Skipped: ${skipped}`);
  } finally {
    client.release();
  }
}

/**
 * Get low stock alerts based on forecasts
 */
async function getLowStockAlerts(daysAhead = 7) {
  const client = await getClient();

  try {
    const query = `
      SELECT 
        f.item_type,
        f.item_id,
        CASE f.item_type
          WHEN 'product' THEN p.name
          WHEN 'consumable' THEN c.name
          WHEN 'filter' THEN fi.name
        END as item_name,
        CASE f.item_type
          WHEN 'product' THEN COALESCE(p.stock_quantity::numeric, 0)
          WHEN 'consumable' THEN COALESCE(c.soh::numeric, 0)
          WHEN 'filter' THEN COALESCE(fi.stock_quantity::numeric, 0)
        END as current_stock,
        SUM(f.predicted_demand) as predicted_demand_week,
        AVG(f.confidence_level) as avg_confidence
      FROM inventory_forecasts f
      LEFT JOIN products p ON f.item_type = 'product' AND f.item_id = p.id
      LEFT JOIN consumables c ON f.item_type = 'consumable' AND f.item_id = c.id
      LEFT JOIN filters fi ON f.item_type = 'filter' AND f.item_id = fi.id
      WHERE f.forecast_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + ($1 * INTERVAL '1 day'))
      GROUP BY f.item_type, f.item_id, item_name, current_stock
      HAVING SUM(f.predicted_demand) > CASE f.item_type
          WHEN 'product' THEN COALESCE(p.stock_quantity::numeric, 0)
          WHEN 'consumable' THEN COALESCE(c.soh::numeric, 0)
          WHEN 'filter' THEN COALESCE(fi.stock_quantity::numeric, 0)
        END
      ORDER BY (SUM(f.predicted_demand) - CASE f.item_type
          WHEN 'product' THEN COALESCE(p.stock_quantity::numeric, 0)
          WHEN 'consumable' THEN COALESCE(c.soh::numeric, 0)
          WHEN 'filter' THEN COALESCE(fi.stock_quantity::numeric, 0)
        END) DESC
    `;

    const result = await client.query(query, [daysAhead]);
    return result.rows;
  } finally {
    client.release();
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    try {
      if (command === 'alerts') {
        const days = parseInt(process.argv[3]) || 7;
        console.log(`\n🔔 Low Stock Alerts (next ${days} days):\n`);
        const alerts = await getLowStockAlerts(days);

        if (alerts.length === 0) {
          console.log('✅ No low stock alerts!\n');
        } else {
          alerts.forEach(alert => {
            console.log(`⚠️  ${alert.item_name} (${alert.item_type})`);
            console.log(`   Current stock: ${alert.current_stock}`);
            console.log(`   Predicted demand: ${alert.predicted_demand_week}`);
            console.log(`   Shortage: ${alert.predicted_demand_week - alert.current_stock}`);
            console.log(`   Confidence: ${(alert.avg_confidence * 100).toFixed(0)}%\n`);
          });
        }
      } else {
        await calculateAllForecasts();
      }

      await database.close();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error:', error);
      await database.close();
      process.exit(1);
    }
  })();
}

module.exports = {
  calculateForecast,
  storeForecasts,
  calculateAllForecasts,
  getLowStockAlerts
};

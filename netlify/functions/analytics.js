// Netlify Function: Analytics Reports
const { database } = require('../../config/database');
const { withHandler, ok, error } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');

exports.handler = withHandler(async function(event) {
  await database.connect();

  const method = event.httpMethod;
  if (method !== 'GET') {
    return error(405, 'Method Not Allowed');
  }

  // Only admins and managers can access analytics
  const { user, response: authResponse } = await requirePermission(event, 'orders', 'list');
  if (authResponse) {return authResponse;}

  try {
    const params = event.queryStringParameters || {};
    const {
      report_type,
      date_from,
      date_to,
      compare_previous = 'false'
    } = params;

    // Default date range: last 30 days
    const endDate = date_to || new Date().toISOString().split('T')[0];
    const startDate = date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    switch (report_type) {
    case 'order_trends':
      return await getOrderTrends(startDate, endDate, compare_previous === 'true');
    case 'top_products':
      return await getTopProducts(startDate, endDate);
    case 'category_breakdown':
      return await getCategoryBreakdown(startDate, endDate);
    case 'order_summary':
      return await getOrderSummary(startDate, endDate, compare_previous === 'true');
    case 'user_activity':
      return await getUserActivity(startDate, endDate);
    default:
      return await getOverviewReport(startDate, endDate);
    }
  } catch (e) {
    console.error('Analytics function error:', e);
    return error(500, 'Failed to generate analytics report');
  }

  // Get order trends over time
  async function getOrderTrends(startDate, endDate, comparePrevious) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total_items) as total_items,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'requested' THEN 1 END) as requested,
        COUNT(CASE WHEN status = 'received' THEN 1 END) as received,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const trends = await database.all(query, [startDate, endDate]);

    let previousTrends = null;
    if (comparePrevious) {
      const daysDiff = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
      const prevStart = new Date(new Date(startDate) - daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const prevEnd = new Date(new Date(startDate) - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      previousTrends = await database.all(query, [prevStart, prevEnd]);
    }

    return ok({
      current: trends,
      previous: previousTrends,
      date_range: { start: startDate, end: endDate }
    });
  }

  // Get top products by order frequency
  async function getTopProducts(startDate, endDate) {
    const query = `
      SELECT 
        oi.product_code,
        oi.product_name,
        COUNT(*) as order_count,
        SUM(oi.quantity) as total_quantity,
        p.type as product_type,
        pc.name as category_name
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_code = p.code
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE o.created_at BETWEEN ? AND ?
      GROUP BY oi.product_code, oi.product_name, p.type, pc.name
      ORDER BY order_count DESC, total_quantity DESC
      LIMIT 50
    `;

    const topProducts = await database.all(query, [startDate, endDate]);

    return ok({
      products: topProducts,
      date_range: { start: startDate, end: endDate }
    });
  }

  // Get category breakdown
  async function getCategoryBreakdown(startDate, endDate) {
    const query = `
      SELECT 
        COALESCE(pc.name, p.type, 'Uncategorized') as category,
        COUNT(DISTINCT oi.order_id) as order_count,
        COUNT(*) as item_count,
        SUM(oi.quantity) as total_quantity
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_code = p.code
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE o.created_at BETWEEN ? AND ?
      GROUP BY category
      ORDER BY order_count DESC
    `;

    const breakdown = await database.all(query, [startDate, endDate]);

    // Calculate percentages
    const totalOrders = breakdown.reduce((sum, cat) => sum + cat.order_count, 0);
    const withPercentages = breakdown.map(cat => ({
      ...cat,
      percentage: totalOrders > 0 ? ((cat.order_count / totalOrders) * 100).toFixed(2) : 0
    }));

    return ok({
      categories: withPercentages,
      total_orders: totalOrders,
      date_range: { start: startDate, end: endDate }
    });
  }

  // Get order summary with comparisons
  async function getOrderSummary(startDate, endDate, comparePrevious) {
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_items) as total_items,
        AVG(total_items) as avg_items_per_order,
        COUNT(CASE WHEN status IN ('approved', 'received') THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(DISTINCT created_by) as unique_users
      FROM orders
      WHERE created_at BETWEEN ? AND ?
    `;

    const summary = await database.get(summaryQuery, [startDate, endDate]);

    let previousSummary = null;
    let comparison = null;

    if (comparePrevious) {
      const daysDiff = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
      const prevStart = new Date(new Date(startDate) - daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const prevEnd = new Date(new Date(startDate) - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      previousSummary = await database.get(summaryQuery, [prevStart, prevEnd]);

      // Calculate percentage changes
      comparison = {
        total_orders_change: calculatePercentageChange(previousSummary.total_orders, summary.total_orders),
        total_items_change: calculatePercentageChange(previousSummary.total_items, summary.total_items),
        completed_orders_change: calculatePercentageChange(previousSummary.completed_orders, summary.completed_orders),
        unique_users_change: calculatePercentageChange(previousSummary.unique_users, summary.unique_users)
      };
    }

    return ok({
      current: summary,
      previous: previousSummary,
      comparison,
      date_range: { start: startDate, end: endDate }
    });
  }

  // Get user activity
  async function getUserActivity(startDate, endDate) {
    const query = `
      SELECT 
        created_by as user,
        COUNT(*) as order_count,
        SUM(total_items) as total_items,
        MAX(created_at) as last_order_date
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      GROUP BY created_by
      ORDER BY order_count DESC
      LIMIT 20
    `;

    const activity = await database.all(query, [startDate, endDate]);

    return ok({
      users: activity,
      date_range: { start: startDate, end: endDate }
    });
  }

  // Get overview report (combines multiple reports)
  async function getOverviewReport(startDate, endDate) {
    const [summary, topProducts, categories, userActivity] = await Promise.all([
      getOrderSummary(startDate, endDate, false),
      getTopProducts(startDate, endDate),
      getCategoryBreakdown(startDate, endDate),
      getUserActivity(startDate, endDate)
    ]);

    return ok({
      summary: JSON.parse(summary.body),
      top_products: JSON.parse(topProducts.body),
      categories: JSON.parse(categories.body),
      user_activity: JSON.parse(userActivity.body),
      date_range: { start: startDate, end: endDate }
    });
  }

  // Helper function to calculate percentage change
  function calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0 || oldValue === null) {
      return newValue > 0 ? 100 : 0;
    }
    return (((newValue - oldValue) / oldValue) * 100).toFixed(2);
  }
});

#!/usr/bin/env node

/**
 * Automated Weekly Performance Report Generator
 * 
 * Generates a comprehensive performance report by querying database metrics
 * and system health data.
 * 
 * Usage:
 *   node scripts/generate-performance-report.js
 *   node scripts/generate-performance-report.js --email ops@joshburt.com.au
 */

const fs = require('fs');
const path = require('path');
const { getDb } = require('../config/database');

async function generateReport() {
  console.log('📊 Generating Weekly Performance Report...\n');
  
  const db = await getDb();
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  try {
    // Fetch metrics
    const metrics = await fetchMetrics(db, weekStart, now);
    
    // Generate report
    const report = buildReport(metrics, weekStart, now);
    
    // Save report
    const filename = `performance-report-${formatDate(now)}.md`;
    const filepath = path.join(__dirname, '..', 'reports', filename);
    
    // Ensure reports directory exists
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, report);
    console.log(`✅ Report saved to: ${filepath}`);
    
    // Send email if requested
    if (process.argv.includes('--email')) {
      const emailIndex = process.argv.indexOf('--email');
      const emailAddress = process.argv[emailIndex + 1];
      if (emailAddress) {
        await sendReportEmail(emailAddress, report);
        console.log(`📧 Report emailed to: ${emailAddress}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

async function fetchMetrics(db, startDate, endDate) {
  console.log('Fetching metrics...');
  
  const [
    userStats,
    orderStats,
    productStats,
    errorStats,
    auditStats
  ] = await Promise.all([
    fetchUserStats(db, startDate, endDate),
    fetchOrderStats(db, startDate, endDate),
    fetchProductStats(db, startDate, endDate),
    fetchErrorStats(db, startDate, endDate),
    fetchAuditStats(db, startDate, endDate)
  ]);
  
  return {
    users: userStats,
    orders: orderStats,
    products: productStats,
    errors: errorStats,
    audit: auditStats
  };
}

async function fetchUserStats(db, startDate, endDate) {
  const result = await db.query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE is_active = true) as active_users,
      COUNT(*) FILTER (WHERE created_at >= $1) as new_users,
      COUNT(*) FILTER (WHERE last_login >= $1) as active_this_week
    FROM users
  `, [startDate]);
  
  return result.rows[0];
}

async function fetchOrderStats(db, startDate, endDate) {
  const result = await db.query(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(AVG(total_amount), 0) as avg_order_value,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_orders
    FROM orders
    WHERE created_at >= $1 AND created_at <= $2
  `, [startDate, endDate]);
  
  return result.rows[0];
}

async function fetchProductStats(db, startDate, endDate) {
  const result = await db.query(`
    SELECT 
      p.name,
      COUNT(oi.id) as order_count,
      SUM(oi.quantity) as total_quantity
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at >= $1 AND o.created_at <= $2
    GROUP BY p.id, p.name
    ORDER BY order_count DESC
    LIMIT 5
  `, [startDate, endDate]);
  
  return result.rows;
}

async function fetchErrorStats(db, startDate, endDate) {
  const result = await db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE action LIKE '%error%') as error_count,
      COUNT(*) FILTER (WHERE action = 'user_login' AND details LIKE '%failed%') as failed_logins
    FROM audit_logs
    WHERE created_at >= $1 AND created_at <= $2
  `, [startDate, endDate]);
  
  return result.rows[0];
}

async function fetchAuditStats(db, startDate, endDate) {
  const result = await db.query(`
    SELECT 
      COUNT(*) as total_events,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(*) FILTER (WHERE action LIKE 'admin_%') as admin_actions
    FROM audit_logs
    WHERE created_at >= $1 AND created_at <= $2
  `, [startDate, endDate]);
  
  return result.rows[0];
}

function buildReport(metrics, startDate, endDate) {
  const template = fs.readFileSync(
    path.join(__dirname, '..', 'docs', 'templates', 'weekly-performance-report.md'),
    'utf8'
  );
  
  let report = template;
  
  // Replace placeholders
  report = report.replace('[DATE_START]', formatDate(startDate));
  report = report.replace('[DATE_END]', formatDate(endDate));
  report = report.replace('[TIMESTAMP]', new Date().toISOString());
  
  // User metrics
  report = replaceMetric(report, 'total_users', metrics.users.total_users);
  report = replaceMetric(report, 'active_users', metrics.users.active_users);
  report = replaceMetric(report, 'new_users', metrics.users.new_users);
  
  // Order metrics
  report = replaceMetric(report, 'total_orders', metrics.orders.total_orders);
  report = replaceMetric(report, 'total_revenue', `$${parseFloat(metrics.orders.total_revenue).toFixed(2)}`);
  report = replaceMetric(report, 'avg_order_value', `$${parseFloat(metrics.orders.avg_order_value).toFixed(2)}`);
  
  // Error metrics
  report = replaceMetric(report, 'error_count', metrics.errors.error_count);
  report = replaceMetric(report, 'failed_logins', metrics.errors.failed_logins);
  
  // Audit metrics
  report = replaceMetric(report, 'audit_events', metrics.audit.total_events);
  report = replaceMetric(report, 'admin_actions', metrics.audit.admin_actions);
  
  // Top products
  const topProductsSection = metrics.products
    .map((p, i) => `${i + 1}. ${p.name} - ${p.order_count} orders (${p.total_quantity} units)`)
    .join('\n');
  report = report.replace(/1\. \[Product Name\].*\n2\. \[Product Name\].*\n3\. \[Product Name\].*/, topProductsSection);
  
  return report;
}

function replaceMetric(report, key, value) {
  const pattern = new RegExp(`\\[${key.toUpperCase()}\\]`, 'g');
  return report.replace(pattern, value);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function sendReportEmail(to, report) {
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  await transporter.sendMail({
    from: process.env.FROM_EMAIL || 'reports@joshburt.com.au',
    to: to,
    subject: `Weekly Performance Report - ${formatDate(new Date())}`,
    text: report,
    html: convertMarkdownToHtml(report)
  });
}

function convertMarkdownToHtml(markdown) {
  // Simple markdown to HTML conversion
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  return `<html><body style="font-family: sans-serif;"><p>${html}</p></body></html>`;
}

// Run report generation
generateReport().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

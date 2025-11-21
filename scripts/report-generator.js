#!/usr/bin/env node

/**
 * Report Generator Worker
 * Runs scheduled reports and generates PDF/CSV/Excel files
 * Can be run manually or via cron/scheduled task
 */

const { database } = require('../config/database');

// Check if running in cron mode
const isWatch = process.argv.includes('--watch');

async function main() {
  console.log('Report Generator Worker starting...');

  await database.connect();

  if (isWatch) {
    console.log('Running in watch mode - checking every 5 minutes');
    await runScheduledReports();
    setInterval(runScheduledReports, 5 * 60 * 1000); // Every 5 minutes
  } else {
    await runScheduledReports();
    await database.close();
    process.exit(0);
  }
}

/**
 * Find and run scheduled reports that are due
 */
async function runScheduledReports() {
  try {
    console.log('Checking for scheduled reports...');

    // Find reports that are due to run
    const query = `
      SELECT * FROM scheduled_reports
      WHERE is_active = true
        AND (next_run IS NULL OR next_run <= NOW())
      ORDER BY next_run ASC
    `;

    const result = await database.query(query);
    const reports = result.rows;

    console.log(`Found ${reports.length} reports to generate`);

    for (const report of reports) {
      try {
        await generateReport(report);
      } catch (e) {
        console.error(`Failed to generate report ${report.id} (${report.name}):`, e);

        // Record failure in history
        await recordReportHistory(report, 'failed', null, e.message);
      }
    }

    console.log('Report generation completed');
  } catch (e) {
    console.error('Error in runScheduledReports:', e);
  }
}

/**
 * Generate a specific report
 */
async function generateReport(reportConfig) {
  console.log(`Generating report: ${reportConfig.name} (${reportConfig.report_type})`);

  const startTime = Date.now();

  // Get report data
  const reportData = await generateReportData(reportConfig);

  // Format the report
  const formattedReport = await formatReport(reportData, reportConfig.format);

  // Send via email if recipients are configured
  if (reportConfig.recipients && reportConfig.recipients.length > 0) {
    await sendReportEmail(reportConfig, formattedReport);
  }

  // Record successful generation
  await recordReportHistory(reportConfig, 'success', formattedReport.length, null);

  const duration = Date.now() - startTime;
  console.log(`Report generated successfully in ${duration}ms (${reportData.length} rows)`);
}

/**
 * Generate report data based on type
 */
function generateReportData(reportConfig) {
  const filters = reportConfig.filters || {};
  const { date_from, date_to } = filters;

  // Default to last 30 days
  const startDate =
    date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = date_to || new Date().toISOString().split('T')[0];

  switch (reportConfig.report_type) {
  case 'sales':
    return generateSalesReport(startDate, endDate, filters);
  case 'inventory':
    return generateInventoryReport(filters);
  case 'users':
    return generateUsersReport(startDate, endDate, filters);
  case 'analytics':
    return generateAnalyticsReport(startDate, endDate, filters);
  default:
    throw new Error(`Unknown report type: ${reportConfig.report_type}`);
  }
}

/**
 * Generate sales report data
 */
async function generateSalesReport(startDate, endDate) {
  const query = `
    SELECT 
      o.id,
      o.created_at,
      o.status,
      o.priority,
      o.total_items,
      o.created_by,
      COUNT(oi.id) as line_items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.created_at BETWEEN $1 AND $2
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  const result = await database.query(query, [startDate, endDate]);
  return result.rows;
}

/**
 * Generate inventory report data
 */
async function generateInventoryReport() {
  const query = `
    SELECT 
      p.id,
      p.name,
      p.code,
      p.type,
      p.stock_quantity,
      pc.name as category
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE p.is_active = true
    ORDER BY p.stock_quantity ASC
  `;

  const result = await database.query(query);
  return result.rows;
}

/**
 * Generate users report data
 */
async function generateUsersReport(startDate, endDate) {
  const query = `
    SELECT 
      u.id,
      u.email,
      u.role,
      u.email_verified,
      u.created_at
    FROM users u
    WHERE u.created_at BETWEEN $1 AND $2
    ORDER BY u.created_at DESC
  `;

  const result = await database.query(query, [startDate, endDate]);
  return result.rows;
}

/**
 * Generate analytics report data
 */
async function generateAnalyticsReport(startDate, endDate) {
  const query = `
    SELECT 
      DATE(timestamp) as date,
      event_type,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT session_id) as unique_sessions
    FROM analytics_events
    WHERE timestamp BETWEEN $1 AND $2
    GROUP BY DATE(timestamp), event_type
    ORDER BY date DESC, event_type
  `;

  const result = await database.query(query, [startDate, endDate]);
  return result.rows;
}

/**
 * Format report based on requested format
 */
function formatReport(data, format) {
  switch (format) {
  case 'csv':
    return formatAsCSV(data);
  case 'pdf':
    // PDF generation would require a library like pdfkit or puppeteer
    // For now, fall back to CSV
    console.warn('PDF format not yet implemented, using CSV');
    return formatAsCSV(data);
  case 'excel':
    // Excel generation would require a library like exceljs
    // For now, fall back to CSV
    console.warn('Excel format not yet implemented, using CSV');
    return formatAsCSV(data);
  default:
    return formatAsCSV(data);
  }
}

/**
 * Convert data to CSV format
 */
function formatAsCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first row
  const headers = Object.keys(data[0]);

  // Build CSV
  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Send report via email
 */
async function sendReportEmail(reportConfig, reportContent) {
  try {
    const { queueEmail } = require('../utils/email');

    const subject = `${reportConfig.name} - ${new Date().toLocaleDateString()}`;
    const body = `
      <h2>${reportConfig.name}</h2>
      <p>Your scheduled ${reportConfig.report_type} report is ready.</p>
      <p>Report generated at: ${new Date().toLocaleString()}</p>
      <p>The report is attached to this email.</p>
    `;

    for (const recipient of reportConfig.recipients) {
      await queueEmail({
        to: recipient,
        subject,
        html: body,
        attachments: [
          {
            filename: `${reportConfig.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`,
            content: reportContent
          }
        ]
      });
    }

    console.log(`Report emailed to ${reportConfig.recipients.length} recipient(s)`);
  } catch (e) {
    console.error('Failed to send report email:', e);
    // Don't throw - email failure shouldn't fail the entire report generation
  }
}

/**
 * Record report generation in history
 */
async function recordReportHistory(reportConfig, status, fileSize, errorMessage) {
  try {
    const query = `
      INSERT INTO report_history 
      (scheduled_report_id, report_name, report_type, generated_at, file_size, 
       recipient_count, status, error_message, metadata)
      VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)
    `;

    await database.query(query, [
      reportConfig.id,
      reportConfig.name,
      reportConfig.report_type,
      fileSize,
      reportConfig.recipients ? reportConfig.recipients.length : 0,
      status,
      errorMessage,
      JSON.stringify({ filters: reportConfig.filters })
    ]);

    // If successful and not a one-time report, update next_run
    if (status === 'success' && reportConfig.frequency !== 'once') {
      const nextRun = calculateNextRun(reportConfig.frequency);
      const updateQuery = `
        UPDATE scheduled_reports
        SET last_run = NOW(), next_run = $1
        WHERE id = $2
      `;
      await database.query(updateQuery, [nextRun, reportConfig.id]);
    }
  } catch (e) {
    console.error('Failed to record report history:', e);
  }
}

/**
 * Calculate next run time
 */
function calculateNextRun(frequency) {
  const now = new Date();

  switch (frequency) {
  case 'daily':
    now.setDate(now.getDate() + 1);
    break;
  case 'weekly':
    now.setDate(now.getDate() + 7);
    break;
  case 'monthly':
    now.setMonth(now.getMonth() + 1);
    break;
  default:
    now.setDate(now.getDate() + 1);
  }

  return now;
}

// Run the worker
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runScheduledReports, generateReport };

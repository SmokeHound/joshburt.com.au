// Netlify Function: Scheduled Reports
// Manages scheduled report configurations and triggers report generation

const { database } = require('../../config/database');
const { withHandler, ok, error } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');

exports.handler = withHandler(async function (event) {
  await database.connect();

  const method = event.httpMethod;
  const pathSegments = (event.path || '').split('/').filter(Boolean);
  const reportId = pathSegments[pathSegments.length - 1];

  // GET: List scheduled reports or get specific report
  if (method === 'GET') {
    const { user, response: authResponse } = await requirePermission(event, 'reports', 'read');
    if (authResponse) {
      return authResponse;
    }

    if (reportId && reportId !== 'scheduled-reports') {
      return await getReport(reportId);
    }
    return await listReports(event);
  }

  // POST: Create new scheduled report or generate on-demand
  if (method === 'POST') {
    const { user, response: authResponse } = await requirePermission(event, 'reports', 'create');
    if (authResponse) {
      return authResponse;
    }

    const body = JSON.parse(event.body || '{}');
    if (body.action === 'generate') {
      return await generateReport(event, user);
    }
    return await createReport(event, user);
  }

  // PUT: Update scheduled report
  if (method === 'PUT') {
    const { user, response: authResponse } = await requirePermission(event, 'reports', 'update');
    if (authResponse) {
      return authResponse;
    }
    return await updateReport(reportId, event, user);
  }

  // DELETE: Delete scheduled report
  if (method === 'DELETE') {
    const { user, response: authResponse } = await requirePermission(event, 'reports', 'delete');
    if (authResponse) {
      return authResponse;
    }
    return await deleteReport(reportId);
  }

  return error(405, 'Method Not Allowed');

  // List all scheduled reports
  async function listReports(event) {
    try {
      const params = event.queryStringParameters || {};
      const { is_active, report_type, page = 1, per_page = 50 } = params;

      const limit = Math.min(parseInt(per_page, 10) || 50, 100);
      const offset = (parseInt(page, 10) - 1) * limit;

      let query = `
        SELECT sr.*, 
               u.email as created_by_email,
               (SELECT COUNT(*) FROM report_history WHERE scheduled_report_id = sr.id) as execution_count
        FROM scheduled_reports sr
        LEFT JOIN users u ON sr.created_by = u.id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramCount = 1;

      if (is_active !== undefined) {
        query += ` AND sr.is_active = $${paramCount}`;
        queryParams.push(is_active === 'true');
        paramCount++;
      }

      if (report_type) {
        query += ` AND sr.report_type = $${paramCount}`;
        queryParams.push(report_type);
        paramCount++;
      }

      query += ` ORDER BY sr.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      queryParams.push(limit, offset);

      const reports = await database.all(query, queryParams);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM scheduled_reports WHERE 1=1';
      const countParams = queryParams.slice(0, -2);
      let countParamIndex = 1;

      if (is_active !== undefined) {
        countQuery += ` AND is_active = $${countParamIndex++}`;
      }
      if (report_type) {
        countQuery += ` AND report_type = $${countParamIndex++}`;
      }

      const countResult = await database.get(countQuery, countParams);
      const total = parseInt(countResult.count, 10);

      return ok({
        reports: reports,
        pagination: {
          page: parseInt(page, 10),
          per_page: limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });
    } catch (e) {
      console.error('Error listing reports:', e);
      return error(500, 'Failed to list reports');
    }
  }

  // Get specific scheduled report
  async function getReport(reportId) {
    try {
      const query = `
        SELECT sr.*, 
               u.email as created_by_email,
               (SELECT COUNT(*) FROM report_history WHERE scheduled_report_id = sr.id) as execution_count,
               (SELECT json_agg(rh ORDER BY rh.generated_at DESC) 
                FROM (SELECT * FROM report_history WHERE scheduled_report_id = sr.id LIMIT 10) rh
               ) as recent_history
        FROM scheduled_reports sr
        LEFT JOIN users u ON sr.created_by = u.id
        WHERE sr.id = $1
      `;
      const report = await database.get(query, [parseInt(reportId, 10)]);

      if (!report) {
        return error(404, 'Report not found');
      }

      return ok({ report: report });
    } catch (e) {
      console.error('Error getting report:', e);
      return error(500, 'Failed to get report');
    }
  }

  // Create new scheduled report
  async function createReport(event, user) {
    try {
      const body = JSON.parse(event.body || '{}');
      const { name, report_type, frequency, recipients = [], filters = {}, format = 'pdf' } = body;

      // Validate required fields
      if (!name || !report_type || !frequency) {
        return error(400, 'Missing required fields: name, report_type, frequency');
      }

      // Validate frequency
      const validFrequencies = ['daily', 'weekly', 'monthly', 'once'];
      if (!validFrequencies.includes(frequency)) {
        return error(400, `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`);
      }

      // Calculate next run time
      let next_run = new Date();
      switch (frequency) {
        case 'daily':
          next_run.setDate(next_run.getDate() + 1);
          break;
        case 'weekly':
          next_run.setDate(next_run.getDate() + 7);
          break;
        case 'monthly':
          next_run.setMonth(next_run.getMonth() + 1);
          break;
        case 'once':
          next_run = null; // One-time reports run immediately or on-demand
          break;
      }

      const insertQuery = `
        INSERT INTO scheduled_reports 
        (name, report_type, frequency, recipients, filters, format, next_run, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;

      const result = await database.run(insertQuery, [
        name,
        report_type,
        frequency,
        recipients,
        JSON.stringify(filters),
        format,
        next_run,
        user.id
      ]);

      return ok(
        {
          message: 'Scheduled report created successfully',
          report: result.rows && result.rows[0] ? result.rows[0] : { id: result.id }
        },
        201
      );
    } catch (e) {
      console.error('Error creating report:', e);
      return error(500, 'Failed to create report');
    }
  }

  // Update scheduled report
  async function updateReport(reportId, event, user) {
    try {
      const body = JSON.parse(event.body || '{}');
      const { name, frequency, recipients, filters, format, is_active } = body;

      // Build update query dynamically
      const updates = [];
      const params = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        params.push(name);
      }
      if (frequency !== undefined) {
        updates.push(`frequency = $${paramCount++}`);
        params.push(frequency);
      }
      if (recipients !== undefined) {
        updates.push(`recipients = $${paramCount++}`);
        params.push(recipients);
      }
      if (filters !== undefined) {
        updates.push(`filters = $${paramCount++}`);
        params.push(JSON.stringify(filters));
      }
      if (format !== undefined) {
        updates.push(`format = $${paramCount++}`);
        params.push(format);
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        params.push(is_active);
      }

      if (updates.length === 0) {
        return error(400, 'No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      params.push(parseInt(reportId, 10));

      const query = `
        UPDATE scheduled_reports
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await database.run(query, params);

      if (!result.rows || result.rows.length === 0) {
        return error(404, 'Report not found');
      }

      return ok({
        message: 'Report updated successfully',
        report: result.rows[0]
      });
    } catch (e) {
      console.error('Error updating report:', e);
      return error(500, 'Failed to update report');
    }
  }

  // Delete scheduled report
  async function deleteReport(reportId) {
    try {
      const query = 'DELETE FROM scheduled_reports WHERE id = $1 RETURNING *';
      const result = await database.run(query, [parseInt(reportId, 10)]);

      if (!result.rows || result.rows.length === 0) {
        return error(404, 'Report not found');
      }

      return ok({
        message: 'Report deleted successfully',
        report: result.rows[0]
      });
    } catch (e) {
      console.error('Error deleting report:', e);
      return error(500, 'Failed to delete report');
    }
  }

  // Generate report on-demand
  async function generateReport(event, user) {
    try {
      const body = JSON.parse(event.body || '{}');
      const { report_id, report_type, filters = {}, format = 'csv' } = body;

      let reportConfig;
      let reportName;

      if (report_id) {
        // Generate from scheduled report
        const query = 'SELECT * FROM scheduled_reports WHERE id = $1';
        const reportConfig = await database.get(query, [parseInt(report_id, 10)]);

        if (!reportConfig) {
          return error(404, 'Scheduled report not found');
        }

        reportName = reportConfig.name;
      } else if (report_type) {
        // Ad-hoc report generation
        reportConfig = { report_type, filters, format };
        reportName = `Ad-hoc ${report_type} report`;
      } else {
        return error(400, 'Either report_id or report_type must be provided');
      }

      // Generate the report data
      const reportData = await generateReportData(
        reportConfig.report_type,
        reportConfig.filters || filters
      );

      // Format the report
      const formattedReport = await formatReport(reportData, reportConfig.format || format);

      // Record in history
      const historyQuery = `
        INSERT INTO report_history 
        (scheduled_report_id, report_name, report_type, generated_at, file_size, status, metadata, generated_by)
        VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7)
        RETURNING *
      `;

      const historyResult = await database.run(historyQuery, [
        report_id || null,
        reportName,
        reportConfig.report_type,
        formattedReport.length,
        'success',
        JSON.stringify({ row_count: reportData.length, filters: reportConfig.filters || filters }),
        user.id
      ]);

      return ok({
        message: 'Report generated successfully',
        report: formattedReport,
        history: historyResult.rows && historyResult.rows[0] ? historyResult.rows[0] : { id: historyResult.id }
      });
    } catch (e) {
      console.error('Error generating report:', e);
      return error(500, 'Failed to generate report');
    }
  }

  // Generate report data based on type
  async function generateReportData(reportType, filters) {
    const { date_from, date_to } = filters;
    const startDate =
      date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = date_to || new Date().toISOString().split('T')[0];

    switch (reportType) {
      case 'sales':
        return await generateSalesReport(startDate, endDate, filters);
      case 'inventory':
        return await generateInventoryReport(filters);
      case 'users':
        return await generateUsersReport(startDate, endDate, filters);
      case 'analytics':
        return await generateAnalyticsReport(startDate, endDate, filters);
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  // Generate sales report
  async function generateSalesReport(startDate, endDate, filters) {
    const query = `
      SELECT 
        o.id,
        o.created_at,
        o.status,
        o.priority,
        o.total_items,
        o.created_by,
        COUNT(oi.id) as line_items,
        json_agg(json_build_object(
          'product_code', oi.product_code,
          'product_name', oi.product_name,
          'quantity', oi.quantity
        )) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.created_at BETWEEN $1 AND $2
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;

    const result = await database.all(query, [startDate, endDate]);
    return result;
  }

  // Generate inventory report
  async function generateInventoryReport(filters) {
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

    const result = await database.all(query);
    return result;
  }

  // Generate users report
  async function generateUsersReport(startDate, endDate, filters) {
    const query = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.email_verified,
        u.created_at,
        COUNT(o.id) as order_count
      FROM users u
      LEFT JOIN orders o ON u.email = o.created_by AND o.created_at BETWEEN $1 AND $2
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;

    const result = await database.all(query, [startDate, endDate]);
    return result;
  }

  // Generate analytics report
  async function generateAnalyticsReport(startDate, endDate, filters) {
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

    const result = await database.all(query, [startDate, endDate]);
    return result;
  }

  // Format report as CSV
  async function formatReport(data, format) {
    if (format === 'csv') {
      return formatAsCSV(data);
    }

    // Default to JSON
    return JSON.stringify(data, null, 2);
  }

  // Convert data to CSV format
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
        // Handle different data types
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        // Escape quotes in strings
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
});

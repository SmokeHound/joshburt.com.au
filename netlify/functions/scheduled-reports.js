// Netlify Function: Scheduled Reports
// Manages scheduled report configurations and triggers report generation

const { database } = require('../../config/database');
const { withHandler, ok, error } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const PDFDocument = require('pdfkit');

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

    // History listing endpoint: /scheduled-reports/history
    if (reportId === 'history') {
      return await listHistory(event);
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

  // List report execution history across all reports
  async function listHistory(event) {
    try {
      const params = event.queryStringParameters || {};
      const { status, report_type, page = 1, per_page = 20 } = params;

      const limit = Math.min(parseInt(per_page, 10) || 20, 100);
      const offset = (parseInt(page, 10) - 1) * limit;

      let query = `
        SELECT
          rh.id,
          rh.scheduled_report_id,
          rh.report_name,
          rh.report_type,
          rh.generated_at,
          rh.file_size,
          rh.recipient_count,
          rh.status,
          rh.error_message,
          rh.metadata,
          sr.recipients
        FROM report_history rh
        LEFT JOIN scheduled_reports sr ON sr.id = rh.scheduled_report_id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramCount = 1;

      if (status) {
        query += ` AND rh.status = $${paramCount}`;
        queryParams.push(status);
        paramCount++;
      }

      if (report_type) {
        query += ` AND rh.report_type = $${paramCount}`;
        queryParams.push(report_type);
        paramCount++;
      }

      query += ` ORDER BY rh.generated_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      queryParams.push(limit, offset);

      const history = await database.all(query, queryParams);

      // Total count
      let countQuery = 'SELECT COUNT(*) FROM report_history rh WHERE 1=1';
      const countParams = queryParams.slice(0, -2);
      let countParamIndex = 1;

      if (status) {
        countQuery += ` AND rh.status = $${countParamIndex++}`;
      }
      if (report_type) {
        countQuery += ` AND rh.report_type = $${countParamIndex++}`;
      }

      const countResult = await database.get(countQuery, countParams);
      const total = parseInt(countResult.count, 10);

      return ok({
        history,
        pagination: {
          page: parseInt(page, 10),
          per_page: limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });
    } catch (e) {
      console.error('Error listing report history:', e);
      return error(500, 'Failed to list report history');
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
        reportConfig = await database.get(query, [parseInt(report_id, 10)]);

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
      // Parse filters if stored as string
      let reportFilters = reportConfig.filters || filters;
      if (typeof reportFilters === 'string') {
        try {
          reportFilters = JSON.parse(reportFilters);
        } catch (e) {
          reportFilters = {};
        }
      }

      const reportData = await generateReportData(
        reportConfig.report_type,
        reportFilters
      );

      // Format the report (pass reportConfig for PDF metadata)
      const formattedReport = await formatReport(reportData, reportConfig.format || format, {
        name: reportName,
        report_type: reportConfig.report_type,
        frequency: reportConfig.frequency,
        filters: reportFilters
      });

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
        JSON.stringify({ row_count: reportData.length, filters: reportFilters }),
        user.id
      ]);

      // For PDF format, return base64 encoded content
      const reportFormat = reportConfig.format || format || 'csv';
      const reportContent = reportFormat === 'pdf' 
        ? formattedReport.toString('base64')
        : formattedReport;

      return ok({
        message: 'Report generated successfully',
        report: reportContent,
        format: reportFormat,
        isBase64: reportFormat === 'pdf',
        filename: `${reportName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${reportFormat === 'pdf' ? 'pdf' : 'csv'}`,
        history: historyResult.rows && historyResult.rows[0] ? historyResult.rows[0] : { id: historyResult.id }
      });
    } catch (e) {
      console.error('Error generating report:', e);
      return error(500, `Failed to generate report: ${e.message}`);
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

  // Format report as CSV or PDF
  async function formatReport(data, format, reportConfig = {}) {
    if (format === 'csv') {
      return formatAsCSV(data);
    }

    if (format === 'pdf') {
      return formatAsPDF(data, reportConfig);
    }

    // Default to JSON
    return JSON.stringify(data, null, 2);
  }

  // Format data as PDF document
  async function formatAsPDF(data, reportConfig = {}) {
    return new Promise((resolve, reject) => {
      try {
        const chunks = [];
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: reportConfig.name || 'Report',
            Author: 'joshburt.com.au',
            Subject: `${reportConfig.report_type || 'Data'} Report`,
            CreationDate: new Date()
          }
        });

        // Collect PDF data chunks
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Colors
        const primaryColor = '#3b82f6';
        const headerBg = '#f1f5f9';
        const borderColor = '#e2e8f0';

        // Header
        doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);
        doc.fillColor('#ffffff')
          .fontSize(24)
          .text(reportConfig.name || 'Report', 50, 25);
        doc.fontSize(10)
          .text(`Generated: ${new Date().toLocaleString()}`, 50, 55);

        // Report metadata
        doc.fillColor('#334155')
          .fontSize(12)
          .text('', 50, 100);

        let yPos = 100;

        if (reportConfig.report_type) {
          doc.text(`Report Type: ${reportConfig.report_type.charAt(0).toUpperCase() + reportConfig.report_type.slice(1)}`, 50, yPos);
          yPos += 20;
        }

        if (reportConfig.frequency) {
          doc.text(`Frequency: ${reportConfig.frequency.charAt(0).toUpperCase() + reportConfig.frequency.slice(1)}`, 50, yPos);
          yPos += 20;
        }

        doc.text(`Total Records: ${data.length}`, 50, yPos);
        yPos += 30;

        // Divider
        doc.moveTo(50, yPos)
          .lineTo(doc.page.width - 50, yPos)
          .strokeColor(borderColor)
          .stroke();
        yPos += 20;

        // Table
        if (data && data.length > 0) {
          const headers = Object.keys(data[0]);
          const pageWidth = doc.page.width - 100;
          const colWidth = Math.min(pageWidth / headers.length, 120);
          const tableWidth = Math.min(colWidth * headers.length, pageWidth);

          // Calculate font size based on number of columns
          const fontSize = headers.length > 6 ? 7 : headers.length > 4 ? 8 : 9;
          doc.fontSize(fontSize);

          // Table header background
          doc.rect(50, yPos, tableWidth, 20).fill(headerBg);

          // Table headers
          doc.fillColor(primaryColor).font('Helvetica-Bold');
          headers.forEach((header, i) => {
            const text = header.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
            doc.text(text.charAt(0).toUpperCase() + text.slice(1), 55 + (i * colWidth), yPos + 5, {
              width: colWidth - 10,
              ellipsis: true
            });
          });

          yPos += 25;
          doc.font('Helvetica');

          // Table rows (limit to 50 for API responses)
          let rowCount = 0;
          const maxRows = 50;

          for (const row of data) {
            if (rowCount >= maxRows) {
              doc.text(`... and ${data.length - maxRows} more rows`, 50, yPos);
              break;
            }

            // Check if we need a new page
            if (yPos > doc.page.height - 80) {
              doc.addPage();
              yPos = 50;
            }

            // Alternate row background
            if (rowCount % 2 === 1) {
              doc.rect(50, yPos - 3, tableWidth, 18).fill('#f8fafc');
            }

            // Row data
            doc.fillColor('#334155');
            headers.forEach((header, i) => {
              let value = row[header];
              if (value === null || value === undefined) {
                value = '-';
              } else if (typeof value === 'object') {
                value = JSON.stringify(value);
              }
              doc.text(String(value).substring(0, 30), 55 + (i * colWidth), yPos, {
                width: colWidth - 10,
                ellipsis: true
              });
            });

            yPos += 18;
            rowCount++;
          }
        } else {
          doc.fillColor('#64748b')
            .fontSize(12)
            .text('No data available for this report.', 50, yPos);
        }

        // Footer
        const footerY = doc.page.height - 40;
        doc.fillColor('#94a3b8')
          .fontSize(8)
          .text('Generated by joshburt.com.au Report System', 50, footerY, {
            align: 'center',
            width: doc.page.width - 100
          });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
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

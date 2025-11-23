/**
 * Email Queue API
 * Manage email queue and templates
 *
 * Endpoints:
 * - GET    /email-queue - Get queue status and emails (admin only)
 * - POST   /email-queue - Enqueue email (admin only)
 * - DELETE /email-queue/:id - Cancel email (admin only)
 */

const { withHandler, ok, badRequest, error } = require('../../utils/fn');
const { requirePermission, parseBody } = require('../../utils/http');
const {
  enqueueEmail,
  enqueueTemplateEmail,
  getQueueStats,
  cancelEmail,
  processEmailQueue
} = require('../../utils/email-queue');
const { database } = require('../../config/database');
const { logAudit } = require('../../utils/audit');

exports.handler = withHandler(async event => {
  const method = event.httpMethod;
  const reqPath = event.path || '';
  const templatePathMatch = reqPath.match(/email-queue\/template(?:\/(.*))?$/);

  // GET - Get queue status and emails
  if (method === 'GET') {
    const { user, response: authResponse } = await requirePermission(event, 'email-queue', 'read');
    if (authResponse) return authResponse;

    const qs = event.queryStringParameters || {};
    const { status, limit = 50, offset = 0, stats = 'false', templates = 'false' } = qs;

    // If templates requested, return email templates
    if (templates === 'true') {
      const templatesRows = await database.all('SELECT id, name, subject, body_html, body_text, variables, description, updated_at FROM email_templates ORDER BY updated_at DESC');
      return ok({ templates: templatesRows || [] });
    }

    // If stats requested, return queue statistics
    if (stats === 'true') {
      const statistics = await getQueueStats();
      return ok(statistics);
    }

    // Get emails from queue
    let sql = 'SELECT * FROM email_queue WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const emails = await database.all(sql, params);

    // Log audit trail
    await logAudit({
      userId: user.id,
      action: 'email_queue_view',
      details: `Viewed email queue (status=${status})`,
      ipAddress: event.headers['x-forwarded-for'],
      userAgent: event.headers['user-agent']
    });

    return ok({
      emails,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: emails.length === parseInt(limit)
      }
    });
  }

  // POST - Enqueue email or process queue
  if (method === 'POST') {
    // Handle create template: POST /.netlify/functions/email-queue/template
    if (templatePathMatch && !templatePathMatch[1]) {
      const { user, response: authResponse } = await requirePermission(event, 'email-queue', 'create');
      if (authResponse) return authResponse;

      const body = parseBody(event);
      const { name, subject, body_html, body_text, variables, description } = body;

      if (!name || !subject) return badRequest('Template name and subject are required');

      await database.run(
        `INSERT INTO email_templates (name, subject, body_html, body_text, variables, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [name, subject, body_html || null, body_text || null, JSON.stringify(variables || []), description || null]
      );

      return ok({ name }, 201);
    }
    const { user, response: authResponse } = await requirePermission(
      event,
      'email-queue',
      'create'
    );
    if (authResponse) return authResponse;

    const body = parseBody(event);
    const { action, to, subject, html, text, templateName, templateData, priority, scheduledFor } =
      body;

    // Action: process queue manually
    if (action === 'process') {
      const stats = await processEmailQueue(10);

      await logAudit({
        userId: user.id,
        action: 'email_queue_process',
        details: `Manually processed email queue: ${stats.sent} sent, ${stats.failed} failed`,
        ipAddress: event.headers['x-forwarded-for'],
        userAgent: event.headers['user-agent']
      });

      return ok(stats);
    }

    // Enqueue email from template
    if (templateName) {
      const result = await enqueueTemplateEmail({
        templateName,
        to,
        data: templateData || {},
        priority: priority || 5,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null
      });

      await logAudit({
        userId: user.id,
        action: 'email_enqueue',
        details: `Enqueued template email "${templateName}" to ${to}`,
        ipAddress: event.headers['x-forwarded-for'],
        userAgent: event.headers['user-agent']
      });

      return ok(result, 201);
    }

    // Enqueue custom email
    const toAddress = to || body.to_address;
    if (!toAddress || !subject) {
      return badRequest('Email "to" and "subject" are required');
    }

    const result = await enqueueEmail({
      to: toAddress,
      subject,
      html,
      text: text || body.body_text,
      priority: priority || 5,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null
    });

    await logAudit({
      userId: user.id,
      action: 'email_enqueue',
      details: `Enqueued email to ${to}`,
      ipAddress: event.headers['x-forwarded-for'],
      userAgent: event.headers['user-agent']
    });

    return ok(result, 201);
  }

  // PUT - Update template (/.netlify/functions/email-queue/template/:name)
  if (method === 'PUT') {
    if (templatePathMatch && templatePathMatch[1]) {
      const { user, response: authResponse } = await requirePermission(event, 'email-queue', 'update');
      if (authResponse) return authResponse;

      const templateName = decodeURIComponent(templatePathMatch[1]);
      const body = parseBody(event);
      const { subject, body_html, body_text, variables, description } = body;

      await database.run(
        `UPDATE email_templates SET subject = ?, body_html = ?, body_text = ?, variables = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?`,
        [subject, body_html || null, body_text || null, JSON.stringify(variables || []), description || null, templateName]
      );

      return ok({ name: templateName });
    }
  }

  // DELETE - Cancel email
  if (method === 'DELETE') {
    // Handle delete template by name: DELETE /.netlify/functions/email-queue/template/:name
    if (templatePathMatch && templatePathMatch[1]) {
      const { user, response: authResponse } = await requirePermission(event, 'email-queue', 'delete');
      if (authResponse) return authResponse;

      const templateName = decodeURIComponent(templatePathMatch[1]);
      await database.run('DELETE FROM email_templates WHERE name = ?', [templateName]);
      return ok({ success: true, name: templateName });
    }

    const { user, response: authResponse } = await requirePermission(
      event,
      'email-queue',
      'delete'
    );
    if (authResponse) return authResponse;

    const qs = event.queryStringParameters || {};
    const { id } = qs;

    if (!id) {
      return badRequest('Email ID is required');
    }

    const success = await cancelEmail(parseInt(id));

    if (!success) {
      return error(400, 'Failed to cancel email (may have already been sent)');
    }

    await logAudit({
      userId: user.id,
      action: 'email_cancel',
      details: `Cancelled email #${id}`,
      ipAddress: event.headers['x-forwarded-for'],
      userAgent: event.headers['user-agent']
    });

    return ok({ success: true, id });
  }

  return error(405, 'Method not allowed');
});

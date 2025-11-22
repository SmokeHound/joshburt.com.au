/**
 * Email Queue Utility - Database-backed email queue with retry logic
 * Replaces direct SMTP sending with reliable queued delivery
 */

const { database } = require('../config/database');
// Reuse the shared transporter logic which can read SMTP from env or DB
const { getTransporter } = require('./email');

/**
 * Template variable substitution
 * Replaces {{variable}} placeholders with values from data object
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} data - Data object with values
 * @returns {string} - Template with substituted values
 */
function substituteVariables(template, data) {
  if (!template) {
    return '';
  }

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * Enqueue an email for sending
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.from - Sender email address (optional, uses default)
 * @param {string} options.subject - Email subject
 * @param {string} [options.html] - HTML body
 * @param {string} [options.text] - Plain text body
 * @param {number} [options.priority=5] - Priority (1-10, 1=highest)
 * @param {Date} [options.scheduledFor] - When to send (default: now)
 * @param {Object} [options.metadata] - Additional metadata
 * @returns {Promise<Object>} - Queued email record
 */
async function enqueueEmail({
  to,
  from = null,
  subject,
  html = null,
  text = null,
  priority = 5,
  scheduledFor = null,
  metadata = {}
}) {
  try {
    // Validate required fields
    if (!to || !subject) {
      throw new Error('Email "to" and "subject" are required');
    }

    // Use default from address if not provided
    const fromAddress = from || process.env.FROM_EMAIL || 'noreply@joshburt.com.au';

    // Insert into queue
    const result = await database.run(
      `INSERT INTO email_queue 
       (to_address, from_address, subject, body_html, body_text, priority, scheduled_for, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        to,
        fromAddress,
        subject,
        html,
        text,
        priority,
        scheduledFor || new Date().toISOString(),
        JSON.stringify(metadata)
      ]
    );

    console.log(`📧 Email queued (ID: ${result.id}) to: ${to}`);

    return {
      id: result.id,
      to,
      subject,
      priority,
      scheduledFor: scheduledFor || new Date()
    };
  } catch (err) {
    console.error('Failed to enqueue email:', err);
    throw err;
  }
}

/**
 * Enqueue email from template
 * @param {Object} options - Template email options
 * @param {string} options.templateName - Template name
 * @param {string} options.to - Recipient email
 * @param {Object} options.data - Template variables
 * @param {number} [options.priority=5] - Priority
 * @param {Date} [options.scheduledFor] - When to send
 * @returns {Promise<Object>} - Queued email record
 */
async function enqueueTemplateEmail({
  templateName,
  to,
  data = {},
  priority = 5,
  scheduledFor = null
}) {
  try {
    // Get template from database
    const template = await database.get(
      'SELECT subject, body_html, body_text FROM email_templates WHERE name = ?',
      [templateName]
    );

    if (!template) {
      throw new Error(`Email template "${templateName}" not found`);
    }

    // Substitute variables
    const subject = substituteVariables(template.subject, data);
    const html = substituteVariables(template.body_html, data);
    const text = template.body_text ? substituteVariables(template.body_text, data) : null;

    // Enqueue email
    return await enqueueEmail({
      to,
      subject,
      html,
      text,
      priority,
      scheduledFor,
      metadata: { template: templateName, templateData: data }
    });
  } catch (err) {
    console.error('Failed to enqueue template email:', err);
    throw err;
  }
}

/**
 * Get pending emails ready to send
 * @param {number} limit - Maximum number of emails to fetch
 * @returns {Promise<Array>} - Array of pending emails
 */
async function getPendingEmails(limit = 10) {
  try {
    const emails = await database.all(
      `SELECT * FROM email_queue 
       WHERE status IN ('pending', 'failed') 
       AND attempts < max_attempts 
       AND scheduled_for <= CURRENT_TIMESTAMP
       ORDER BY priority ASC, scheduled_for ASC 
       LIMIT ?`,
      [limit]
    );

    return emails;
  } catch (err) {
    console.error('Failed to get pending emails:', err);
    return [];
  }
}

/**
 * Send an email using SMTP
 * Internal helper for email worker
 * @param {Object} email - Email record from queue
 * @returns {Promise<Object>} - Send result
 */
async function sendEmail(email) {
  try {
    // Use shared transporter which can load SMTP from env OR from DB settings
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: email.from_address,
      to: email.to_address,
      subject: email.subject,
      html: email.body_html,
      text: email.body_text
    });

    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (err) {
    return {
      success: false,
      error: err && err.message ? err.message : String(err)
    };
  }
}

/**
 * Process email queue - send pending emails
 * This should be called by a worker/cron job
 * @param {number} batchSize - Number of emails to process
 * @returns {Promise<Object>} - Processing stats
 */
async function processEmailQueue(batchSize = 10) {
  const stats = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: []
  };

  try {
    // Get pending emails
    const emails = await getPendingEmails(batchSize);

    if (emails.length === 0) {
      console.log('📧 No emails in queue');
      return stats;
    }

    console.log(`📧 Processing ${emails.length} emails from queue`);

    // Process each email
    for (const email of emails) {
      stats.processed++;

      try {
        // Mark as sending
        await database.run(
          'UPDATE email_queue SET status = ?, attempts = attempts + 1 WHERE id = ?',
          ['sending', email.id]
        );

        // Send email
        const result = await sendEmail(email);

        if (result.success) {
          // Mark as sent
          await database.run(
            'UPDATE email_queue SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['sent', email.id]
          );
          stats.sent++;
          console.log(`✅ Email sent (ID: ${email.id}) to: ${email.to_address}`);
        } else {
          // Mark as failed
          const newAttempts = email.attempts + 1;
          const status = newAttempts >= email.max_attempts ? 'failed' : 'pending';

          await database.run(
            `UPDATE email_queue 
             SET status = ?, failed_at = CURRENT_TIMESTAMP, error_message = ? 
             WHERE id = ?`,
            [status, result.error, email.id]
          );

          stats.failed++;
          stats.errors.push({
            emailId: email.id,
            to: email.to_address,
            error: result.error
          });

          console.error(`❌ Email failed (ID: ${email.id}): ${result.error}`);
        }
      } catch (err) {
        // Handle processing error
        stats.failed++;
        stats.errors.push({
          emailId: email.id,
          to: email.to_address,
          error: err.message
        });

        console.error(`❌ Error processing email (ID: ${email.id}):`, err);

        // Mark as pending for retry (unless max attempts reached)
        await database.run('UPDATE email_queue SET status = ?, error_message = ? WHERE id = ?', [
          'pending',
          err.message,
          email.id
        ]);
      }
    }

    console.log(`📧 Queue processing complete: ${stats.sent} sent, ${stats.failed} failed`);

    return stats;
  } catch (err) {
    console.error('Failed to process email queue:', err);
    throw err;
  }
}

/**
 * Get email queue statistics
 * @returns {Promise<Object>} - Queue statistics
 */
async function getQueueStats() {
  try {
    const stats = await database.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'sending' THEN 1 END) as sending,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        AVG(attempts) as avg_attempts
      FROM email_queue
    `);

    return stats || {};
  } catch (err) {
    console.error('Failed to get queue stats:', err);
    return {};
  }
}

/**
 * Cancel a queued email
 * @param {number} emailId - Email queue ID
 * @returns {Promise<boolean>} - Success status
 */
async function cancelEmail(emailId) {
  try {
    await database.run('UPDATE email_queue SET status = ? WHERE id = ? AND status IN (?, ?)', [
      'cancelled',
      emailId,
      'pending',
      'failed'
    ]);
    return true;
  } catch (err) {
    console.error('Failed to cancel email:', err);
    return false;
  }
}

/**
 * Cleanup old emails from queue
 * @param {number} daysOld - Delete emails older than this many days
 * @returns {Promise<number>} - Number of deleted emails
 */
async function cleanupOldEmails(daysOld = 30) {
  try {
    const result = await database.run(
      `DELETE FROM email_queue 
       WHERE status IN ('sent', 'failed', 'cancelled') 
       AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * ?`,
      [daysOld]
    );
    return result.changes || 0;
  } catch (err) {
    console.error('Failed to cleanup old emails:', err);
    return 0;
  }
}

module.exports = {
  enqueueEmail,
  enqueueTemplateEmail,
  getPendingEmails,
  processEmailQueue,
  getQueueStats,
  cancelEmail,
  cleanupOldEmails,
  substituteVariables
};

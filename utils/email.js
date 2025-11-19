// Internal helper: build mail options and send via transporter
const buildAndSend = async (mailOptions) => {
  const transporter = await getTransporter();
  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('📧 Failed to send email:', error);
    throw error;
  }
};

// Send email verification email
const sendVerificationEmail = async (email, name, verificationUrl) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@joshburt.com.au',
    to: email,
    subject: 'Verify Your Email - Josh Burt Website',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <p>Thank you for registering on the Josh Burt website.</p>
              <p>Click the button below to verify your email address:</p>
              <a href="${verificationUrl}" class="button">Verify Email</a>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>
              <p>This link will expire in 24 hours.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Josh Burt. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Hello ${name},
      \nThank you for registering on the Josh Burt website.\n\nVerify your email: ${verificationUrl}\n\nThis link will expire in 24 hours.\n\n© 2025 Josh Burt. All rights reserved.
    `
  };
  return await buildAndSend(mailOptions);
};
const nodemailer = require('nodemailer');

let _transporterPromise = null;

// Try to create transporter from env, otherwise try reading settings from DB
const createTransporter = async () => {
  if (process.env.NODE_ENV === 'test') {
    return {
      sendMail: async _mailOptions => ({ messageId: 'dev-mode-' + Date.now() })
    };
  }

  let host = process.env.SMTP_HOST;
  let port = process.env.SMTP_PORT;
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;

  // If any required value missing, try to read from settings table
  if (!host || !port || !user || !pass) {
    try {
      const { database } = require('../config/database');
      // Safely attempt to read settings; ignore errors if DB unavailable
      const rows = await database.all('SELECT key, value FROM settings WHERE key IN (?, ?, ?, ?)', [
        'smtpHost',
        'smtpPort',
        'smtpUser',
        'smtpPassword'
      ]);
      rows.forEach(r => {
        if (r.key === 'smtpHost' && r.value) {host = host || r.value;}
        if (r.key === 'smtpPort' && r.value) {port = port || String(r.value);}
        if (r.key === 'smtpUser' && r.value) {user = user || r.value;}
        if (r.key === 'smtpPassword' && r.value) {pass = pass || r.value;}
      });
    } catch (e) {
      // DB unavailable or query failed - fall back to env vars only
      console.warn('Could not read SMTP settings from database:', e && e.message);
    }
  }

  if (!host || !port || !user || !pass) {
    // Return a transporter that throws a clear error when used
    return {
      sendMail: async _opts => {
        const missing = [];
        if (!host) {missing.push('SMTP_HOST');}
        if (!port) {missing.push('SMTP_PORT');}
        if (!user) {missing.push('SMTP_USER');}
        if (!pass) {missing.push('SMTP_PASS');}
        const msg = `Missing SMTP credentials (${missing.join(', ')}). Set environment variables or configure settings.`;
        const err = new Error(msg);
        console.error('📧 SMTP misconfiguration:', msg);
        throw err;
      }
    };
  }

  const numericPort = Number(port) || (process.env.SMTP_SECURE === 'true' ? 465 : 587);
  const secure = numericPort === 465;

  const transportOptions = {
    host,
    port: numericPort,
    secure,
    auth: { user, pass }
  };

  return nodemailer.createTransport(transportOptions);
};

const getTransporter = async () => {
  if (!_transporterPromise) {
    _transporterPromise = createTransporter();
  }
  return _transporterPromise;
};

// Send password reset email
const sendResetEmail = async (email, name, resetUrl) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@joshburt.com.au',
    to: email,
    subject: 'Password Reset Request - Josh Burt Website',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <p>You requested to reset your password for your Josh Burt website account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request this password reset, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Josh Burt. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Hello ${name},
      
      You requested to reset your password for your Josh Burt website account.
      
      Click this link to reset your password: ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this password reset, please ignore this email.
      
      © 2025 Josh Burt. All rights reserved.
    `
  };

  return await buildAndSend(mailOptions);
};

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@joshburt.com.au',
    to: email,
    subject: 'Welcome to Josh Burt Website',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Josh Burt Website!</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <p>Welcome to the Josh Burt website! Your account has been successfully created.</p>
              <p>You can now access all the features of our platform including:</p>
              <ul>
                <li>User Dashboard</li>
                <li>Oil Product Ordering</li>
                <li>Analytics and Reports</li>
                <li>Settings Management</li>
              </ul>
              <a href="${process.env.FRONTEND_URL || 'https://joshburt.com.au'}" class="button">Visit Website</a>
              <p>If you have any questions, feel free to contact our support team.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Josh Burt. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Hello ${name},
      
      Welcome to the Josh Burt website! Your account has been successfully created.
      
      You can now access all the features of our platform.
      
      Visit the website: ${process.env.FRONTEND_URL || 'https://joshburt.com.au'}
      
      If you have any questions, feel free to contact our support team.
      
      © 2025 Josh Burt. All rights reserved.
    `
  };

  try {
    return await buildAndSend(mailOptions);
  } catch (error) {
    console.error('📧 Failed to send welcome email:', error);
    throw error;
  }
};

// Send order status change notification
const sendOrderStatusEmail = async (email, name, orderId, oldStatus, newStatus) => {
  const statusMessages = {
    pending: 'Your order is pending review',
    processing: 'Your order is being processed',
    requested: 'Your order has been requested from supplier',
    received: 'Your order has been received',
    approved: 'Your order has been approved',
    rejected: 'Your order has been rejected',
    cancelled: 'Your order has been cancelled'
  };

  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@joshburt.com.au',
    to: email,
    subject: `Order #${orderId} Status Update - ${newStatus}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Order Status Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .status-box { background: #e0f2fe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Status Update</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <p>Your order status has been updated:</p>
              <div class="status-box">
                <strong>Order #${orderId}</strong><br>
                Status changed from: <strong>${oldStatus}</strong><br>
                To: <strong>${newStatus}</strong><br>
                <em>${statusMessages[newStatus] || 'Status updated'}</em>
              </div>
              <a href="${process.env.FRONTEND_URL || 'https://joshburt.com.au'}/orders-review.html?order=${orderId}" class="button">View Order Details</a>
              <p>If you have any questions about your order, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Josh Burt. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Hello ${name},
      
      Your order #${orderId} status has been updated.
      
      Status changed from: ${oldStatus}
      To: ${newStatus}
      
      ${statusMessages[newStatus] || 'Status updated'}
      
      View order details: ${process.env.FRONTEND_URL || 'https://joshburt.com.au'}/orders-review.html?order=${orderId}
      
      If you have any questions about your order, please contact our support team.
      
      © 2025 Josh Burt. All rights reserved.
    `
  };

  try {
    return await buildAndSend(mailOptions);
  } catch (error) {
    console.error('📧 Failed to send order status email:', error);
    throw error;
  }
};

// Send order created notification
const sendOrderCreatedEmail = async (email, name, orderId) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@joshburt.com.au',
    to: email,
    subject: `Order #${orderId} Created Successfully`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Order Created</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .order-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Created Successfully!</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <p>Thank you for your order. We have received it and will process it shortly.</p>
              <div class="order-box">
                <strong>Order #${orderId}</strong><br>
                Status: <strong>Pending</strong><br>
                <em>Your order is currently pending review by our team.</em>
              </div>
              <a href="${process.env.FRONTEND_URL || 'https://joshburt.com.au'}/orders-review.html?order=${orderId}" class="button">View Order Details</a>
              <p>You will receive email notifications when your order status changes.</p>
              <p>If you have any questions, please don't hesitate to contact us.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Josh Burt. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Hello ${name},
      
      Thank you for your order. We have received it and will process it shortly.
      
      Order #${orderId}
      Status: Pending
      
      Your order is currently pending review by our team.
      
      View order details: ${process.env.FRONTEND_URL || 'https://joshburt.com.au'}/orders-review.html?order=${orderId}
      
      You will receive email notifications when your order status changes.
      
      If you have any questions, please don't hesitate to contact us.
      
      © 2025 Josh Burt. All rights reserved.
    `
  };

  try {
    return await buildAndSend(mailOptions);
  } catch (error) {
    console.error('📧 Failed to send order created email:', error);
    throw error;
  }
};

/**
 * Queue-based email wrappers (Phase 1.2 implementation)
 * These functions use the email queue for reliable delivery with retry logic
 */

// Check if email queue is enabled (feature flag)
const isEmailQueueEnabled = () => {
  const enabled = process.env.EMAIL_QUEUE_ENABLED || 'false';
  return enabled.toLowerCase() === 'true' || enabled === '1';
};

// Queue-based email wrappers
const queueResetEmail = async (email, name, resetUrl) => {
  if (!isEmailQueueEnabled()) {
    return sendResetEmail(email, name, resetUrl);
  }

  try {
    const { enqueueTemplateEmail } = require('./email-queue');
    return await enqueueTemplateEmail({
      templateName: 'password_reset',
      to: email,
      data: {
        name,
        resetUrl,
        siteName: 'Josh Burt Website'
      },
      priority: 3 // High priority
    });
  } catch (err) {
    console.warn('Failed to queue email, falling back to direct send:', err);
    return sendResetEmail(email, name, resetUrl);
  }
};

const queueVerificationEmail = async (email, name, verificationUrl) => {
  if (!isEmailQueueEnabled()) {
    return sendVerificationEmail(email, name, verificationUrl);
  }

  try {
    const { enqueueTemplateEmail } = require('./email-queue');
    return await enqueueTemplateEmail({
      templateName: 'email_verification',
      to: email,
      data: {
        name,
        verificationUrl,
        siteName: 'Josh Burt Website'
      },
      priority: 3 // High priority
    });
  } catch (err) {
    console.warn('Failed to queue email, falling back to direct send:', err);
    return sendVerificationEmail(email, name, verificationUrl);
  }
};

const queueWelcomeEmail = async (email, name) => {
  if (!isEmailQueueEnabled()) {
    return sendWelcomeEmail(email, name);
  }

  try {
    const { enqueueEmail } = require('./email-queue');
    const mailOptions = {
      to: email,
      subject: 'Welcome to Josh Burt Website',
      html: '<!-- HTML content from sendWelcomeEmail -->',
      text: `Hello ${name}, Welcome to the Josh Burt website!`,
      priority: 5 // Normal priority
    };
    return await enqueueEmail(mailOptions);
  } catch (err) {
    console.warn('Failed to queue email, falling back to direct send:', err);
    return sendWelcomeEmail(email, name);
  }
};

module.exports = {
  // Direct send functions (legacy)
  sendResetEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendOrderStatusEmail,
  sendOrderCreatedEmail,

  // Queue-based functions (new - Phase 1.2)
  queueResetEmail,
  queueVerificationEmail,
  queueWelcomeEmail,

  // Feature flag check
  isEmailQueueEnabled
};

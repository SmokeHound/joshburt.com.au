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
  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('📧 Failed to send verification email:', error);
    throw error;
  }
};
const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'development') {
    // For development, do not send emails (no-op)
    return {
      sendMail: async (mailOptions) => {
        return { messageId: 'dev-mode-' + Date.now() };
      }
    };
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const transporter = createTransporter();

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

  try {
    const result = await transporter.sendMail(mailOptions);
    // ...existing code...
    return result;
  } catch (error) {
    console.error('📧 Failed to send password reset email:', error);
    throw error;
  }
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
    const result = await transporter.sendMail(mailOptions);
    // ...existing code...
    return result;
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
    const result = await transporter.sendMail(mailOptions);
    return result;
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
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('📧 Failed to send order created email:', error);
    throw error;
  }
};

module.exports = {
  sendResetEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendOrderStatusEmail,
  sendOrderCreatedEmail
};
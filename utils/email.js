const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'development') {
    // For development, log emails instead of sending
    return {
      sendMail: async (mailOptions) => {
        console.log('📧 Email would be sent:');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Body:', mailOptions.html || mailOptions.text);
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
      pass: process.env.SMTP_PASS,
    },
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
    console.log('📧 Password reset email sent:', result.messageId);
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
    console.log('📧 Welcome email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('📧 Failed to send welcome email:', error);
    throw error;
  }
};

module.exports = {
  sendResetEmail,
  sendWelcomeEmail
};
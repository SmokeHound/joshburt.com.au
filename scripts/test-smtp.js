#!/usr/bin/env node

/**
 * SMTP Configuration Test Script
 *
 * Tests if the SMTP server is properly configured and can send emails.
 *
 * Usage:
 *   node scripts/test-smtp.js <recipient-email>
 *
 * Example:
 *   node scripts/test-smtp.js test@example.com
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// Get recipient email from command line argument
const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.error('❌ Error: Please provide a recipient email address');
  console.log('Usage: node scripts/test-smtp.js <recipient-email>');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(recipientEmail)) {
  console.error('❌ Error: Invalid email address format');
  process.exit(1);
}

console.log('\n📧 SMTP Configuration Test\n');
console.log('════════════════════════════════════════\n');

// Check required environment variables
const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.log('\nPlease set these in your .env file\n');
  process.exit(1);
}

// Display configuration (hide password)
console.log('Configuration:');
console.log(`  SMTP Host: ${process.env.SMTP_HOST}`);
console.log(`  SMTP Port: ${process.env.SMTP_PORT}`);
console.log(`  SMTP User: ${process.env.SMTP_USER}`);
console.log(`  SMTP Pass: ${'*'.repeat(process.env.SMTP_PASS?.length || 0)}`);
console.log(`  From Email: ${process.env.FROM_EMAIL || 'noreply@joshburt.com.au'}`);
console.log(`  Recipient: ${recipientEmail}`);
console.log(`  Secure: ${process.env.SMTP_PORT === '465' ? 'Yes (TLS)' : 'No (STARTTLS)'}\n`);

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  debug: true, // Show debug output
  logger: true // Log to console
});

// Test email content
const mailOptions = {
  from: process.env.FROM_EMAIL || 'noreply@joshburt.com.au',
  to: recipientEmail,
  subject: 'SMTP Test - Josh Burt Website',
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>SMTP Test</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 5px 5px; }
          .info-box { background: #e0f2fe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
          .success { color: #10b981; font-weight: bold; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ SMTP Test Successful</h1>
          </div>
          <div class="content">
            <p>Hello!</p>
            <p class="success">If you're reading this, your SMTP configuration is working correctly! 🎉</p>
            <div class="info-box">
              <strong>Test Details:</strong><br>
              Date: ${new Date().toLocaleString()}<br>
              SMTP Host: ${process.env.SMTP_HOST}<br>
              SMTP Port: ${process.env.SMTP_PORT}<br>
              From: ${process.env.FROM_EMAIL || 'noreply@joshburt.com.au'}
            </div>
            <p>Your email system is properly configured and ready to send:</p>
            <ul>
              <li>Password reset emails</li>
              <li>Email verification messages</li>
              <li>Welcome emails</li>
              <li>Order notifications</li>
              <li>Order status updates</li>
            </ul>
            <p>This was an automated test. No action is required.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Josh Burt. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `,
  text: `
    SMTP Test Successful!
    
    If you're reading this, your SMTP configuration is working correctly!
    
    Test Details:
    - Date: ${new Date().toLocaleString()}
    - SMTP Host: ${process.env.SMTP_HOST}
    - SMTP Port: ${process.env.SMTP_PORT}
    - From: ${process.env.FROM_EMAIL || 'noreply@joshburt.com.au'}
    
    Your email system is properly configured and ready to send password reset emails, 
    email verification messages, welcome emails, order notifications, and order status updates.
    
    This was an automated test. No action is required.
    
    © 2025 Josh Burt. All rights reserved.
  `
};

// Verify connection
console.log('════════════════════════════════════════');
console.log('Testing SMTP connection...\n');

transporter.verify((error, _success) => {
  if (error) {
    console.error('❌ SMTP Connection Failed!\n');
    console.error('Error:', error.message);
    console.error('\nPossible issues:');
    console.error('  • Wrong SMTP host or port');
    console.error('  • Invalid username or password');
    console.error('  • Firewall blocking SMTP port');
    console.error('  • SMTP server requires different security settings');
    console.error('  • Need to enable "Less secure app access" (for Gmail)\n');
    process.exit(1);
  } else {
    console.log('✅ SMTP connection verified successfully!\n');
    console.log('════════════════════════════════════════');
    console.log('Sending test email...\n');

    // Send test email
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('❌ Failed to send test email!\n');
        console.error('Error:', err.message);
        process.exit(1);
      } else {
        console.log('✅ Test email sent successfully!\n');
        console.log('Message Details:');
        console.log(`  Message ID: ${info.messageId}`);
        console.log(`  Response: ${info.response}`);
        console.log(`  Accepted: ${info.accepted?.join(', ') || 'N/A'}`);
        console.log(`  Rejected: ${info.rejected?.length > 0 ? info.rejected.join(', ') : 'None'}`);
        console.log('\n════════════════════════════════════════');
        console.log(`\n📬 Check your inbox at ${recipientEmail}\n`);
        console.log('SMTP configuration is working correctly! ✅\n');
        process.exit(0);
      }
    });
  }
});

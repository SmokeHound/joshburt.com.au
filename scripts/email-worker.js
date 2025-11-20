#!/usr/bin/env node

/**
 * Email Queue Worker
 * Processes pending emails from the queue
 *
 * Usage:
 *   node scripts/email-worker.js          # Process once
 *   node scripts/email-worker.js --watch  # Run continuously
 *   node scripts/email-worker.js --cron   # Run as cron job (exit after processing)
 */

require('dotenv').config();
const { initializeDatabase } = require('../config/database');
const { processEmailQueue, getQueueStats } = require('../utils/email-queue');

// Configuration
const BATCH_SIZE = parseInt(process.env.EMAIL_WORKER_BATCH_SIZE) || 10;
const POLL_INTERVAL = parseInt(process.env.EMAIL_WORKER_POLL_INTERVAL) || 60000; // 1 minute
const MAX_PROCESSING_TIME = parseInt(process.env.EMAIL_WORKER_MAX_TIME) || 300000; // 5 minutes

let isWatchMode = false;
let isRunning = false;
const startTime = Date.now();

/**
 * Process email queue once
 */
async function processOnce() {
  if (isRunning) {
    console.log('⏳ Worker already running, skipping...');
    return;
  }

  isRunning = true;

  try {
    console.log('📧 Starting email queue processing...');

    // Get queue stats before processing
    const statsBefore = await getQueueStats();
    console.log(`📊 Queue stats: ${statsBefore.pending} pending, ${statsBefore.failed} failed`);

    // Process emails
    const result = await processEmailQueue(BATCH_SIZE);

    console.log(
      `✅ Processed ${result.processed} emails: ${result.sent} sent, ${result.failed} failed`
    );

    // Show errors if any
    if (result.errors.length > 0) {
      console.error('❌ Errors:');
      result.errors.forEach(err => {
        console.error(`  - Email ${err.emailId} to ${err.to}: ${err.error}`);
      });
    }

    // Get queue stats after processing
    const statsAfter = await getQueueStats();
    console.log(`📊 Queue stats: ${statsAfter.pending} pending, ${statsAfter.failed} failed`);
  } catch (err) {
    console.error('❌ Email worker error:', err);
  } finally {
    isRunning = false;
  }
}

/**
 * Watch mode - continuously process queue
 */
async function watch() {
  console.log(`👀 Email worker running in watch mode (polling every ${POLL_INTERVAL}ms)`);

  while (isWatchMode) {
    // Check if we've exceeded max processing time
    if (Date.now() - startTime > MAX_PROCESSING_TIME) {
      console.log('⏱️ Max processing time reached, exiting...');
      process.exit(0);
    }

    await processOnce();

    // Wait before next poll
    if (isWatchMode) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const watchMode = args.includes('--watch');
    const cronMode = args.includes('--cron');

    console.log('🚀 Email Queue Worker starting...');

    // Initialize database
    await initializeDatabase();

    if (watchMode) {
      // Watch mode - run continuously
      isWatchMode = true;

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n👋 Shutting down gracefully...');
        isWatchMode = false;
      });

      process.on('SIGTERM', () => {
        console.log('\n👋 Shutting down gracefully...');
        isWatchMode = false;
      });

      await watch();
    } else {
      // One-time processing (cron mode or manual run)
      await processOnce();

      if (!cronMode) {
        console.log('✅ Email worker completed');
      }

      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { processOnce, watch };

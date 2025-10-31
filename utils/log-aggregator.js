/**
 * Centralized Log Aggregation System
 * Collects and stores logs from all application components
 */

const fs = require('fs').promises;
const path = require('path');

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

class LogAggregator {
  constructor() {
    this.logsDir = path.join(__dirname, '../data/logs');
    this.currentLogFile = null;
    this.logBuffer = [];
    this.maxBufferSize = 100;
    this.flushInterval = null;
  }

  /**
   * Initialize the log aggregator
   */
  async initialize() {
    await fs.mkdir(this.logsDir, { recursive: true });
    this.currentLogFile = this.getLogFileName();

    // Flush buffer every 10 seconds
    this.flushInterval = setInterval(() => this.flush(), 10000);
  }

  /**
   * Get current log file name based on date
   */
  getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logsDir, `app-${date}.log`);
  }

  /**
   * Write a log entry
   */
  async log(level, message, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      metadata,
      pid: process.pid
    };

    // Add to buffer
    this.logBuffer.push(entry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.maxBufferSize) {
      await this.flush();
    }

    // Also log to console
    this.logToConsole(entry);
  }

  /**
   * Log to console with appropriate formatting
   */
  logToConsole(entry) {
    const levelColors = {
      DEBUG: '\x1b[36m',   // Cyan
      INFO: '\x1b[32m',    // Green
      WARN: '\x1b[33m',    // Yellow
      ERROR: '\x1b[31m',   // Red
      CRITICAL: '\x1b[35m' // Magenta
    };

    const reset = '\x1b[0m';
    const color = levelColors[entry.level] || '';

    const msg = `${color}[${entry.timestamp}] [${entry.level}]${reset} ${entry.message}`;

    if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
      console.error(msg);
      if (Object.keys(entry.metadata).length > 0) {
        console.error('Metadata:', JSON.stringify(entry.metadata, null, 2));
      }
    } else {
      console.log(msg);
    }
  }

  /**
   * Flush buffer to disk
   */
  async flush() {
    if (this.logBuffer.length === 0) {
      return;
    }

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    const logFile = this.getLogFileName();

    // Create new file if date changed
    if (logFile !== this.currentLogFile) {
      this.currentLogFile = logFile;
    }

    try {
      const logLines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
      await fs.appendFile(this.currentLogFile, logLines);
    } catch (error) {
      console.error('Failed to write logs:', error);
      // Put entries back in buffer to retry
      this.logBuffer.unshift(...entries);
    }
  }

  /**
   * Convenience methods for different log levels
   */
  debug(message, metadata) {
    return this.log('DEBUG', message, metadata);
  }

  info(message, metadata) {
    return this.log('INFO', message, metadata);
  }

  warn(message, metadata) {
    return this.log('WARN', message, metadata);
  }

  error(message, metadata) {
    return this.log('ERROR', message, metadata);
  }

  critical(message, metadata) {
    return this.log('CRITICAL', message, metadata);
  }

  /**
   * Query logs by criteria
   */
  async query(options = {}) {
    const {
      level = null,
      startDate = null,
      endDate = null,
      limit = 100,
      search = null
    } = options;

    const logs = [];
    const files = await this.getLogFiles(startDate, endDate);

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);

            // Filter by level
            if (level && entry.level !== level.toUpperCase()) {
              continue;
            }

            // Filter by search term
            if (search && !entry.message.toLowerCase().includes(search.toLowerCase())) {
              continue;
            }

            logs.push(entry);

            // Stop if we have enough logs
            if (logs.length >= limit) {
              break;
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            continue;
          }
        }

        if (logs.length >= limit) {
          break;
        }
      } catch (readError) {
        console.error(`Error reading log file ${file}:`, readError);
      }
    }

    return logs;
  }

  /**
   * Get log files in date range
   */
  async getLogFiles(startDate = null, endDate = null) {
    const files = await fs.readdir(this.logsDir);
    const logFiles = files
      .filter(f => f.startsWith('app-') && f.endsWith('.log'))
      .map(f => path.join(this.logsDir, f));

    if (!startDate && !endDate) {
      return logFiles.sort().reverse(); // Most recent first
    }

    return logFiles.filter(file => {
      const fileName = path.basename(file);
      const dateMatch = fileName.match(/app-(\d{4}-\d{2}-\d{2})\.log/);
      if (!dateMatch) {return false;}

      const fileDate = new Date(dateMatch[1]);

      if (startDate && fileDate < new Date(startDate)) {
        return false;
      }

      if (endDate && fileDate > new Date(endDate)) {
        return false;
      }

      return true;
    }).sort().reverse();
  }

  /**
   * Get log statistics
   */
  async getStatistics(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.query({
      startDate: startDate.toISOString(),
      limit: 100000 // High limit to get all logs
    });

    const stats = {
      total: logs.length,
      byLevel: {
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0,
        CRITICAL: 0
      },
      byDay: {},
      errorRate: 0
    };

    logs.forEach(log => {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

      // Count by day
      const day = log.timestamp.split('T')[0];
      stats.byDay[day] = (stats.byDay[day] || 0) + 1;
    });

    // Calculate error rate
    const errorLogs = stats.byLevel.ERROR + stats.byLevel.CRITICAL;
    stats.errorRate = stats.total > 0
      ? (errorLogs / stats.total * 100).toFixed(2)
      : 0;

    return stats;
  }

  /**
   * Cleanup old logs
   */
  async cleanup(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const files = await fs.readdir(this.logsDir);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(this.logsDir, file);
      const dateMatch = file.match(/app-(\d{4}-\d{2}-\d{2})\.log/);

      if (dateMatch) {
        const fileDate = new Date(dateMatch[1]);
        if (fileDate < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`Deleted old log file: ${file}`);
        }
      }
    }

    return deletedCount;
  }

  /**
   * Shutdown the log aggregator
   */
  async shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

// Singleton instance
let instance = null;

function getLogAggregator() {
  if (!instance) {
    instance = new LogAggregator();
    instance.initialize().catch(err => {
      console.error('Failed to initialize log aggregator:', err);
    });
  }
  return instance;
}

module.exports = {
  LogAggregator,
  getLogAggregator,
  LOG_LEVELS
};

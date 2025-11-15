#!/usr/bin/env node
/**
 * Weekly Performance Report Generator
 * Analyzes metrics and generates a comprehensive performance report
 */

const fs = require('fs').promises;
const path = require('path');

// Time constants
const ONE_DAY = 24 * 60 * 60 * 1000;

async function loadMetrics() {
  const metricsFile = path.join(__dirname, '../data/metrics.json');
  try {
    const data = await fs.readFile(metricsFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading metrics:', error.message);
    return { requests: [], errors: [], performance: [], database: [] };
  }
}

function filterByTimeWindow(items, days = 7) {
  const cutoff = Date.now() - days * ONE_DAY;
  return items.filter(item => new Date(item.timestamp).getTime() > cutoff);
}

function calculatePercentile(values, percentile) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
  return sorted[Math.max(0, index)];
}

function generateReport(metrics) {
  const report = {
    generatedAt: new Date().toISOString(),
    period: 'Last 7 Days',
    summary: {},
    requests: {},
    errors: {},
    performance: {},
    database: {},
    recommendations: []
  };

  // Filter data to last 7 days
  const requests = filterByTimeWindow(metrics.requests, 7);
  const errors = filterByTimeWindow(metrics.errors, 7);
  const performance = filterByTimeWindow(metrics.performance, 7);
  const database = filterByTimeWindow(metrics.database, 7);

  // Summary statistics
  report.summary = {
    totalRequests: requests.length,
    totalErrors: errors.length,
    errorRate: requests.length > 0 ? ((errors.length / requests.length) * 100).toFixed(2) : 0,
    averageRequestsPerDay: Math.round(requests.length / 7)
  };

  // Request analysis
  const responseTimes = requests
    .map(r => r.responseTime)
    .filter(t => t !== null && t !== undefined);
  report.requests = {
    total: requests.length,
    avgResponseTime:
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0,
    p50: calculatePercentile(responseTimes, 50),
    p95: calculatePercentile(responseTimes, 95),
    p99: calculatePercentile(responseTimes, 99),
    statusCodeDistribution: {}
  };

  // Status code distribution
  requests.forEach(r => {
    const code = r.statusCode || 'unknown';
    report.requests.statusCodeDistribution[code] =
      (report.requests.statusCodeDistribution[code] || 0) + 1;
  });

  // Top endpoints by volume
  const endpointCounts = {};
  requests.forEach(r => {
    const endpoint = r.endpoint || 'unknown';
    endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
  });
  report.requests.topEndpoints = Object.entries(endpointCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));

  // Error analysis
  report.errors = {
    total: errors.length,
    bySeverity: {
      low: errors.filter(e => e.severity === 'low').length,
      medium: errors.filter(e => e.severity === 'medium').length,
      high: errors.filter(e => e.severity === 'high').length,
      critical: errors.filter(e => e.severity === 'critical').length
    },
    byType: {}
  };

  errors.forEach(e => {
    const type = e.type || 'unknown';
    report.errors.byType[type] = (report.errors.byType[type] || 0) + 1;
  });

  // Most common errors
  const errorMessages = {};
  errors.forEach(e => {
    const msg = e.message ? e.message.substring(0, 100) : 'Unknown error';
    errorMessages[msg] = (errorMessages[msg] || 0) + 1;
  });
  report.errors.topErrors = Object.entries(errorMessages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([message, count]) => ({ message, count }));

  // Performance analysis
  const durations = performance.map(p => p.duration).filter(d => d !== null && d !== undefined);
  report.performance = {
    totalOperations: performance.length,
    avgDuration:
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
    p50: calculatePercentile(durations, 50),
    p95: calculatePercentile(durations, 95),
    p99: calculatePercentile(durations, 99)
  };

  // Database analysis
  const dbDurations = database.map(d => d.duration).filter(d => d !== null && d !== undefined);
  report.database = {
    totalQueries: database.length,
    avgDuration:
      dbDurations.length > 0
        ? Math.round(dbDurations.reduce((a, b) => a + b, 0) / dbDurations.length)
        : 0,
    slowQueries: database.filter(d => d.duration > 1000).length,
    failedQueries: database.filter(d => d.error).length
  };

  // Generate recommendations
  if (parseFloat(report.summary.errorRate) > 5) {
    report.recommendations.push({
      severity: 'high',
      issue: 'High Error Rate',
      message: `Error rate is ${report.summary.errorRate}% (threshold: 5%). Investigate error logs and common error types.`
    });
  }

  if (report.requests.p95 > 3000) {
    report.recommendations.push({
      severity: 'medium',
      issue: 'Slow Response Times',
      message: `95th percentile response time is ${report.requests.p95}ms. Consider optimizing slow endpoints.`
    });
  }

  if (report.database.slowQueries > report.database.totalQueries * 0.1) {
    report.recommendations.push({
      severity: 'medium',
      issue: 'Slow Database Queries',
      message: `${report.database.slowQueries} slow queries (>1s) detected. Review query optimization and indexes.`
    });
  }

  if (report.errors.bySeverity.critical > 0) {
    report.recommendations.push({
      severity: 'critical',
      issue: 'Critical Errors',
      message: `${report.errors.bySeverity.critical} critical errors detected. Immediate investigation required.`
    });
  }

  if (report.recommendations.length === 0) {
    report.recommendations.push({
      severity: 'info',
      issue: 'System Healthy',
      message: 'All metrics are within acceptable thresholds. Continue monitoring.'
    });
  }

  return report;
}

function formatReportAsMarkdown(report) {
  let md = '# Weekly Performance Report\n\n';
  md += `**Generated:** ${new Date(report.generatedAt).toLocaleString()}\n`;
  md += `**Period:** ${report.period}\n\n`;

  md += '## Executive Summary\n\n';
  md += '| Metric | Value |\n';
  md += '|--------|-------|\n';
  md += `| Total Requests | ${report.summary.totalRequests.toLocaleString()} |\n`;
  md += `| Total Errors | ${report.summary.totalErrors.toLocaleString()} |\n`;
  md += `| Error Rate | ${report.summary.errorRate}% |\n`;
  md += `| Avg Requests/Day | ${report.summary.averageRequestsPerDay.toLocaleString()} |\n\n`;

  md += '## Request Metrics\n\n';
  md += '| Metric | Value |\n';
  md += '|--------|-------|\n';
  md += `| Total Requests | ${report.requests.total.toLocaleString()} |\n`;
  md += `| Avg Response Time | ${report.requests.avgResponseTime}ms |\n`;
  md += `| P50 Response Time | ${report.requests.p50}ms |\n`;
  md += `| P95 Response Time | ${report.requests.p95}ms |\n`;
  md += `| P99 Response Time | ${report.requests.p99}ms |\n\n`;

  md += '### Status Code Distribution\n\n';
  md += '| Status Code | Count |\n';
  md += '|-------------|-------|\n';
  Object.entries(report.requests.statusCodeDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([code, count]) => {
      md += `| ${code} | ${count.toLocaleString()} |\n`;
    });
  md += '\n';

  md += '### Top Endpoints\n\n';
  md += '| Endpoint | Requests |\n';
  md += '|----------|----------|\n';
  report.requests.topEndpoints.forEach(({ endpoint, count }) => {
    md += `| ${endpoint} | ${count.toLocaleString()} |\n`;
  });
  md += '\n';

  md += '## Error Analysis\n\n';
  md += '| Severity | Count |\n';
  md += '|----------|-------|\n';
  md += `| Critical | ${report.errors.bySeverity.critical} |\n`;
  md += `| High | ${report.errors.bySeverity.high} |\n`;
  md += `| Medium | ${report.errors.bySeverity.medium} |\n`;
  md += `| Low | ${report.errors.bySeverity.low} |\n\n`;

  if (report.errors.topErrors.length > 0) {
    md += '### Top Errors\n\n';
    md += '| Error Message | Count |\n';
    md += '|---------------|-------|\n';
    report.errors.topErrors.forEach(({ message, count }) => {
      md += `| ${message} | ${count} |\n`;
    });
    md += '\n';
  }

  md += '## Performance Metrics\n\n';
  md += '| Metric | Value |\n';
  md += '|--------|-------|\n';
  md += `| Total Operations | ${report.performance.totalOperations.toLocaleString()} |\n`;
  md += `| Avg Duration | ${report.performance.avgDuration}ms |\n`;
  md += `| P50 Duration | ${report.performance.p50}ms |\n`;
  md += `| P95 Duration | ${report.performance.p95}ms |\n`;
  md += `| P99 Duration | ${report.performance.p99}ms |\n\n`;

  md += '## Database Metrics\n\n';
  md += '| Metric | Value |\n';
  md += '|--------|-------|\n';
  md += `| Total Queries | ${report.database.totalQueries.toLocaleString()} |\n`;
  md += `| Avg Query Duration | ${report.database.avgDuration}ms |\n`;
  md += `| Slow Queries (>1s) | ${report.database.slowQueries} |\n`;
  md += `| Failed Queries | ${report.database.failedQueries} |\n\n`;

  md += '## Recommendations\n\n';
  report.recommendations.forEach(rec => {
    const emoji =
      rec.severity === 'critical'
        ? '🔴'
        : rec.severity === 'high'
          ? '🟠'
          : rec.severity === 'medium'
            ? '🟡'
            : '🟢';
    md += `### ${emoji} ${rec.issue}\n\n`;
    md += `**Severity:** ${rec.severity}\n\n`;
    md += `${rec.message}\n\n`;
  });

  return md;
}

async function generateWeeklyReport() {
  console.log('📊 Generating weekly performance report...\n');

  const metrics = await loadMetrics();
  const report = generateReport(metrics);

  // Save JSON report
  const reportsDir = path.join(__dirname, '../data/reports');
  await fs.mkdir(reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const jsonFile = path.join(reportsDir, `weekly-report-${timestamp}.json`);
  await fs.writeFile(jsonFile, JSON.stringify(report, null, 2));
  console.log(`✅ JSON report saved: ${jsonFile}`);

  // Save Markdown report
  const markdown = formatReportAsMarkdown(report);
  const mdFile = path.join(reportsDir, `weekly-report-${timestamp}.md`);
  await fs.writeFile(mdFile, markdown);
  console.log(`✅ Markdown report saved: ${mdFile}`);

  // Print summary to console
  console.log('\n' + '='.repeat(60));
  console.log('WEEKLY PERFORMANCE SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Requests: ${report.summary.totalRequests.toLocaleString()}`);
  console.log(`Error Rate: ${report.summary.errorRate}%`);
  console.log(`Avg Response Time: ${report.requests.avgResponseTime}ms`);
  console.log(`P95 Response Time: ${report.requests.p95}ms`);
  console.log('\nRecommendations:');
  report.recommendations.forEach(rec => {
    console.log(`  - [${rec.severity.toUpperCase()}] ${rec.issue}`);
  });
  console.log('='.repeat(60) + '\n');
}

// Run if called directly
if (require.main === module) {
  generateWeeklyReport()
    .then(() => {
      console.log('✅ Weekly report generation complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Report generation failed:', error);
      process.exit(1);
    });
}

module.exports = { generateWeeklyReport, loadMetrics, generateReport };

# Monitoring Dashboard Configuration

## Overview

This guide provides configuration templates and setup instructions for creating custom monitoring dashboards for joshburt.com.au across different monitoring platforms.

## Dashboard Categories

### 1. Application Health Dashboard
**Purpose**: Real-time health and availability metrics

### 2. Performance Dashboard
**Purpose**: Response times, throughput, and resource utilization

### 3. Business Metrics Dashboard
**Purpose**: Orders, users, revenue, and key business indicators

### 4. Error Tracking Dashboard
**Purpose**: Error rates, types, and debugging information

## Platform-Specific Configurations

## Grafana Dashboard

### Installation

```bash
# Using Docker
docker run -d -p 3000:3000 --name=grafana grafana/grafana

# Or using package manager
sudo apt-get install -y grafana
```

### Data Source Configuration

Add Netlify and PostgreSQL as data sources:

```json
{
  "name": "PostgreSQL - joshburt.com.au",
  "type": "postgres",
  "url": "your-database-host:5432",
  "database": "your-database-name",
  "user": "your-database-user",
  "secureJsonData": {
    "password": "your-database-password"
  },
  "jsonData": {
    "sslmode": "require",
    "postgresVersion": 14
  }
}
```

### Dashboard JSON Configuration

Create `monitoring/grafana-dashboard.json`:

```json
{
  "dashboard": {
    "title": "joshburt.com.au - Application Health",
    "tags": ["joshburt", "production"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Response Time (P95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P95 Response Time"
          }
        ],
        "yaxes": [
          {
            "label": "Seconds",
            "format": "s"
          }
        ]
      },
      {
        "id": 2,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          }
        ],
        "thresholds": {
          "mode": "absolute",
          "steps": [
            { "value": 0, "color": "green" },
            { "value": 0.01, "color": "yellow" },
            { "value": 0.05, "color": "red" }
          ]
        }
      },
      {
        "id": 4,
        "title": "Active Users",
        "type": "stat",
        "datasource": "PostgreSQL",
        "targets": [
          {
            "rawSql": "SELECT COUNT(*) FROM users WHERE is_active = true",
            "format": "table"
          }
        ]
      },
      {
        "id": 5,
        "title": "Orders Today",
        "type": "stat",
        "datasource": "PostgreSQL",
        "targets": [
          {
            "rawSql": "SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE",
            "format": "table"
          }
        ]
      }
    ],
    "refresh": "30s"
  }
}
```

## Datadog Dashboard

### Setup

```bash
# Install Datadog agent
DD_API_KEY=<your-api-key> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"
```

### Dashboard Configuration

Create `monitoring/datadog-dashboard.json`:

```json
{
  "title": "joshburt.com.au - Overview",
  "description": "Main application dashboard",
  "widgets": [
    {
      "definition": {
        "title": "Average Response Time",
        "type": "timeseries",
        "requests": [
          {
            "q": "avg:netlify.function.duration{env:production}",
            "display_type": "line",
            "style": {
              "palette": "dog_classic",
              "line_type": "solid",
              "line_width": "normal"
            }
          }
        ]
      }
    },
    {
      "definition": {
        "title": "Error Rate",
        "type": "query_value",
        "requests": [
          {
            "q": "sum:netlify.function.errors{env:production}.as_rate()",
            "aggregator": "avg"
          }
        ],
        "precision": 2
      }
    },
    {
      "definition": {
        "title": "Top Errors",
        "type": "toplist",
        "requests": [
          {
            "q": "top(sum:sentry.error{env:production} by {error.type}, 10, 'sum', 'desc')"
          }
        ]
      }
    }
  ],
  "layout_type": "ordered"
}
```

## New Relic Dashboard

### Configuration

Create `monitoring/newrelic-dashboard.json`:

```json
{
  "name": "joshburt.com.au",
  "permissions": "PUBLIC_READ_WRITE",
  "pages": [
    {
      "name": "Application Overview",
      "widgets": [
        {
          "title": "Response Time",
          "visualization": { "id": "viz.line" },
          "rawConfiguration": {
            "nrqlQueries": [
              {
                "accountId": "YOUR_ACCOUNT_ID",
                "query": "SELECT average(duration) FROM Transaction WHERE appName = 'joshburt.com.au' TIMESERIES"
              }
            ]
          }
        },
        {
          "title": "Throughput",
          "visualization": { "id": "viz.line" },
          "rawConfiguration": {
            "nrqlQueries": [
              {
                "accountId": "YOUR_ACCOUNT_ID",
                "query": "SELECT rate(count(*), 1 minute) FROM Transaction WHERE appName = 'joshburt.com.au' TIMESERIES"
              }
            ]
          }
        },
        {
          "title": "Error Rate",
          "visualization": { "id": "viz.billboard" },
          "rawConfiguration": {
            "nrqlQueries": [
              {
                "accountId": "YOUR_ACCOUNT_ID",
                "query": "SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE appName = 'joshburt.com.au'"
              }
            ],
            "thresholds": [
              { "value": 1, "alertSeverity": "WARNING" },
              { "value": 5, "alertSeverity": "CRITICAL" }
            ]
          }
        }
      ]
    }
  ]
}
```

## Custom Dashboard (Self-Hosted)

For a self-hosted monitoring dashboard, create a simple Node.js application:

### Dashboard Server

Create `monitoring/dashboard-server.js`:

```javascript
const express = require('express');
const { getDb } = require('../config/database');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Serve static dashboard
app.use(express.static('monitoring/public'));

// API endpoint for metrics
app.get('/api/metrics', async (req, res) => {
  const db = await getDb();
  
  try {
    // Get various metrics
    const [
      totalUsers,
      activeUsers,
      todayOrders,
      todayRevenue,
      recentErrors
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users'),
      db.query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
      db.query('SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURRENT_DATE'),
      db.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE DATE(created_at) = CURRENT_DATE'),
      db.query('SELECT COUNT(*) as count FROM audit_logs WHERE action LIKE \'%error%\' AND created_at > NOW() - INTERVAL \'1 hour\'')
    ]);
    
    res.json({
      users: {
        total: totalUsers.rows[0].count,
        active: activeUsers.rows[0].count
      },
      orders: {
        today: todayOrders.rows[0].count,
        revenue: parseFloat(todayRevenue.rows[0].total)
      },
      errors: {
        lastHour: recentErrors.rows[0].count
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  } finally {
    await db.end();
  }
});

// Historical data endpoint
app.get('/api/metrics/history', async (req, res) => {
  const { days = 7 } = req.query;
  const db = await getDb();
  
  try {
    const result = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue
      FROM orders
      WHERE created_at > NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  } finally {
    await db.end();
  }
});

app.listen(PORT, () => {
  console.log(`📊 Dashboard server running on http://localhost:${PORT}`);
});
```

### Dashboard HTML

Create `monitoring/public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>joshburt.com.au - Monitoring Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { margin-bottom: 30px; color: #3b82f6; }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: #1e293b;
      border-radius: 8px;
      padding: 20px;
      border: 1px solid #334155;
    }
    .metric-title {
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 10px;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #3b82f6;
    }
    .metric-change {
      font-size: 12px;
      margin-top: 5px;
    }
    .metric-change.positive { color: #10b981; }
    .metric-change.negative { color: #ef4444; }
    .chart-container {
      background: #1e293b;
      border-radius: 8px;
      padding: 20px;
      border: 1px solid #334155;
      margin-bottom: 20px;
    }
    .status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .status.healthy { background: #10b981; color: white; }
    .status.warning { background: #f59e0b; color: white; }
    .status.error { background: #ef4444; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 joshburt.com.au - Monitoring Dashboard</h1>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-title">Total Users</div>
        <div class="metric-value" id="totalUsers">-</div>
        <div class="metric-change positive" id="usersChange">-</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">Active Users</div>
        <div class="metric-value" id="activeUsers">-</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">Orders Today</div>
        <div class="metric-value" id="ordersToday">-</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">Revenue Today</div>
        <div class="metric-value" id="revenueToday">-</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">Errors (Last Hour)</div>
        <div class="metric-value" id="errorsLastHour">-</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">System Status</div>
        <div class="metric-value">
          <span class="status healthy" id="systemStatus">Healthy</span>
        </div>
      </div>
    </div>
    
    <div class="chart-container">
      <h2 style="margin-bottom: 20px;">Orders Last 7 Days</h2>
      <canvas id="ordersChart"></canvas>
    </div>
    
    <div class="chart-container">
      <h2 style="margin-bottom: 20px;">Revenue Last 7 Days</h2>
      <canvas id="revenueChart"></canvas>
    </div>
  </div>
  
  <script>
    const API_BASE = '/api';
    let ordersChart, revenueChart;
    
    async function fetchMetrics() {
      try {
        const response = await fetch(`${API_BASE}/metrics`);
        const data = await response.json();
        
        document.getElementById('totalUsers').textContent = data.users.total;
        document.getElementById('activeUsers').textContent = data.users.active;
        document.getElementById('ordersToday').textContent = data.orders.today;
        document.getElementById('revenueToday').textContent = 
          '$' + data.orders.revenue.toFixed(2);
        document.getElementById('errorsLastHour').textContent = data.errors.lastHour;
        
        // Update status
        const status = document.getElementById('systemStatus');
        if (data.errors.lastHour > 10) {
          status.textContent = 'Degraded';
          status.className = 'status warning';
        } else if (data.errors.lastHour > 50) {
          status.textContent = 'Critical';
          status.className = 'status error';
        } else {
          status.textContent = 'Healthy';
          status.className = 'status healthy';
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    }
    
    async function fetchHistory() {
      try {
        const response = await fetch(`${API_BASE}/metrics/history?days=7`);
        const data = await response.json();
        
        const labels = data.map(d => new Date(d.date).toLocaleDateString());
        const orders = data.map(d => parseInt(d.orders));
        const revenue = data.map(d => parseFloat(d.revenue));
        
        updateOrdersChart(labels, orders);
        updateRevenueChart(labels, revenue);
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    }
    
    function updateOrdersChart(labels, data) {
      const ctx = document.getElementById('ordersChart').getContext('2d');
      
      if (ordersChart) {
        ordersChart.data.labels = labels;
        ordersChart.data.datasets[0].data = data;
        ordersChart.update();
      } else {
        ordersChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Orders',
              data: data,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
              x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
            }
          }
        });
      }
    }
    
    function updateRevenueChart(labels, data) {
      const ctx = document.getElementById('revenueChart').getContext('2d');
      
      if (revenueChart) {
        revenueChart.data.labels = labels;
        revenueChart.data.datasets[0].data = data;
        revenueChart.update();
      } else {
        revenueChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Revenue ($)',
              data: data,
              backgroundColor: '#10b981'
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
              x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
            }
          }
        });
      }
    }
    
    // Initial load
    fetchMetrics();
    fetchHistory();
    
    // Refresh every 30 seconds
    setInterval(fetchMetrics, 30000);
    setInterval(fetchHistory, 300000); // 5 minutes
  </script>
</body>
</html>
```

## Alerting Rules

### Prometheus Alert Rules

Create `monitoring/alert-rules.yml`:

```yaml
groups:
  - name: joshburt_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} (threshold: 0.05)"
      
      # Slow response time
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow response times"
          description: "P95 response time is {{ $value }}s"
      
      # Database connection issues
      - alert: DatabaseDown
        expr: up{job="database"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database is down"
          description: "Cannot connect to database"
      
      # Low disk space
      - alert: LowDiskSpace
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space"
          description: "Disk usage is at {{ $value | humanizePercentage }}"
```

## Dashboard Best Practices

1. **Keep it Simple**: Don't overcrowd with too many metrics
2. **Prioritize**: Put most important metrics at the top
3. **Use Colors Wisely**: Green for good, yellow for warning, red for critical
4. **Auto-refresh**: Set appropriate refresh intervals (30s-5min)
5. **Mobile Friendly**: Ensure dashboards work on mobile devices
6. **Document Thresholds**: Explain what values mean
7. **Link to Details**: Provide links to detailed logs/traces
8. **Team Access**: Ensure team can access and understand dashboards

## Testing Dashboards

```bash
# Start dashboard server
node monitoring/dashboard-server.js

# Access dashboard
open http://localhost:3001

# Generate test load
for i in {1..100}; do
  curl -s http://localhost:8888/.netlify/functions/health > /dev/null
done
```

## Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [Datadog Dashboard Guide](https://docs.datadoghq.com/dashboards/)
- [New Relic Dashboard API](https://docs.newrelic.com/docs/apis/nerdgraph/examples/nerdgraph-dashboards/)
- [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/overview/)

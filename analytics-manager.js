// Analytics Data Management System
class AnalyticsDataManager {
  constructor() {
    this.storageKey = 'analyticsData';
    this.settingsKey = 'analyticsSettings';
    this.initialize();
  }

  initialize() {
    // Initialize analytics data structure if not exists
    if (!localStorage.getItem(this.storageKey)) {
      this.createInitialData();
    }

    // Set default settings
    if (!localStorage.getItem(this.settingsKey)) {
      const defaultSettings = {
        dataRetentionDays: 90,
        trackingEnabled: true,
        realTimeUpdates: true,
        exportFormat: 'csv'
      };
      localStorage.setItem(this.settingsKey, JSON.stringify(defaultSettings));
    }
  }

  createInitialData() {
    const initialData = {
      visitors: this.generateVisitorData(30),
      pageViews: this.generatePageViewData(30),
      userSessions: this.generateSessionData(30),
      oilOrders: this.generateOrderData(30),
      performance: this.generatePerformanceData(30),
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem(this.storageKey, JSON.stringify(initialData));
  }

  generateVisitorData(days) {
    const data = [];
    const baseVisitors = 150;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Simulate realistic visitor patterns
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const weekendMultiplier = isWeekend ? 0.6 : 1;
      const trendMultiplier = 1 + (days - i) / days * 0.4; // Growing trend
      const randomVariation = 0.7 + Math.random() * 0.6;

      const visitors = Math.floor(baseVisitors * weekendMultiplier * trendMultiplier * randomVariation);
      const uniqueVisitors = Math.floor(visitors * (0.7 + Math.random() * 0.2));
      const returningVisitors = Math.floor(uniqueVisitors * (0.3 + Math.random() * 0.3));

      data.push({
        date: date.toISOString().split('T')[0],
        totalVisitors: visitors,
        uniqueVisitors: uniqueVisitors,
        returningVisitors: returningVisitors,
        newVisitors: uniqueVisitors - returningVisitors
      });
    }

    return data;
  }

  generatePageViewData(days) {
    const pages = [
      { path: '/index.html', name: 'Home', weight: 0.4 },
      { path: '/oil-products.html', name: 'Oil Orders', weight: 0.25 },
      { path: '/analytics.html', name: 'Analytics', weight: 0.15 },
      { path: '/administration.html', name: 'Administration', weight: 0.08 },
      { path: '/users.html', name: 'User Management', weight: 0.07 },
      { path: '/settings.html', name: 'Settings', weight: 0.05 }
    ];

    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayData = { date: date.toISOString().split('T')[0], pages: {} };

      const totalViews = Math.floor((200 + Math.random() * 150) * (1 + (days - i) / days * 0.3));

      pages.forEach(page => {
        const views = Math.floor(totalViews * page.weight * (0.8 + Math.random() * 0.4));
        const avgTime = Math.floor((120 + Math.random() * 300)); // 2-7 minutes
        const bounceRate = 0.2 + Math.random() * 0.4; // 20-60%

        dayData.pages[page.path] = {
          name: page.name,
          views: views,
          avgTimeOnPage: avgTime,
          bounceRate: bounceRate
        };
      });

      data.push(dayData);
    }

    return data;
  }

  generateSessionData(days) {
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const sessions = Math.floor(80 + Math.random() * 60);
      const avgDuration = Math.floor(180 + Math.random() * 240); // 3-7 minutes
      const pagesPerSession = 2 + Math.random() * 3;

      data.push({
        date: date.toISOString().split('T')[0],
        totalSessions: sessions,
        avgSessionDuration: avgDuration,
        pagesPerSession: pagesPerSession,
        bounceRate: 0.25 + Math.random() * 0.35
      });
    }

    return data;
  }

  generateOrderData(days) {
    const products = [
      'Castrol GTX', 'Castrol Magnatec', 'Castrol EDGE',
      'Castrol GTX Diesel', 'Castrol Actevo'
    ];

    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const dayData = {
        date: date.toISOString().split('T')[0],
        totalOrders: Math.floor(Math.random() * 15 + 5),
        totalRevenue: 0,
        products: {}
      };

      products.forEach(product => {
        const orders = Math.floor(Math.random() * 8);
        const avgPrice = 35 + Math.random() * 25;
        const revenue = orders * avgPrice;

        dayData.products[product] = {
          orders: orders,
          revenue: revenue,
          avgPrice: avgPrice
        };

        dayData.totalRevenue += revenue;
      });

      data.push(dayData);
    }

    return data;
  }

  generatePerformanceData(days) {
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      data.push({
        date: date.toISOString().split('T')[0],
        avgLoadTime: 1.2 + Math.random() * 0.8, // 1.2-2.0 seconds
        serverUptime: 99.5 + Math.random() * 0.5, // 99.5-100%
        errorRate: Math.random() * 0.02, // 0-2%
        cacheHitRate: 0.85 + Math.random() * 0.1 // 85-95%
      });
    }

    return data;
  }

  getData(filters = {}) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    const settings = JSON.parse(localStorage.getItem(this.settingsKey));

    if (!data) {return null;}

    // Apply filters
    const filteredData = { ...data };

    if (filters.dateRange) {
      const days = parseInt(filters.dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      ['visitors', 'pageViews', 'userSessions', 'oilOrders', 'performance'].forEach(key => {
        if (filteredData[key]) {
          filteredData[key] = filteredData[key].filter(item =>
            new Date(item.date) >= cutoffDate
          );
        }
      });
    }
    // Generate actionable insights and additional chart data
    const conversionRate = this.getConversionRate(filteredData);
    const retentionRate = this.getRetentionRate(filteredData);
    const funnel = this.getFunnelData(filteredData);
    const deviceBreakdown = this.getDeviceBreakdown(filteredData);
    const browserBreakdown = this.getBrowserBreakdown(filteredData);
    const multiMetric = this.getMultiMetricComparison(filteredData);
    const sparklines = this.getSparklineData(filteredData);

    return {
      data: filteredData,
      settings: settings,
      lastUpdated: data.lastUpdated,
      insights: {
        conversionRate,
        retentionRate,
        funnel,
        deviceBreakdown,
        browserBreakdown,
        multiMetric,
        sparklines
      }
    };
  }

  // Mock: Browser breakdown (randomized for demo)
  getBrowserBreakdown(_data) {
    // Simulate breakdown for demo
    const chrome = 60 + Math.floor(Math.random() * 10); // 60-70%
    const firefox = 20 + Math.floor(Math.random() * 10); // 20-30%
    const safari = 10;
    const edge = 10;
    return {
      browsers: [chrome, firefox, safari, edge],
      browserLabels: ['Chrome', 'Firefox', 'Safari', 'Edge']
    };
  }

  // Mock: Multi-metric comparison (Visitors, Orders, Sessions per day)
  getMultiMetricComparison(data) {
    const labels = (data.visitors || []).map(d => d.date);
    const visitors = (data.visitors || []).map(d => d.totalVisitors);
    const orders = (data.oilOrders || []).map(d => d.totalOrders);
    const sessions = (data.userSessions || []).map(d => d.totalSessions);
    return {
      labels,
      visitors,
      orders,
      sessions
    };
  }

  // Mock: Sparkline data for quick stats (last 14 days)
  getSparklineData(data) {
    const last14 = (arr) => arr.slice(-14);
    return {
      visitors: last14((data.visitors || []).map(d => d.totalVisitors)),
      orders: last14((data.oilOrders || []).map(d => d.totalOrders)),
      sessions: last14((data.userSessions || []).map(d => d.totalSessions))
    };
  }

  // Mock: Conversion rate = orders / unique visitors
  getConversionRate(data) {
    const totalOrders = (data.oilOrders || []).reduce((sum, d) => sum + (d.totalOrders || 0), 0);
    const totalUniqueVisitors = (data.visitors || []).reduce((sum, d) => sum + (d.uniqueVisitors || 0), 0);
    if (totalUniqueVisitors === 0) {return 0;}
    return ((totalOrders / totalUniqueVisitors) * 100).toFixed(1);
  }

  // Mock: Retention rate = % of users who visited at least twice in period
  getRetentionRate(data) {
    const userVisits = {};
    (data.visitors || []).forEach(day => {
      // Simulate user IDs by index
      for (let i = 0; i < (day.uniqueVisitors || 0); i++) {
        const userId = `user${i}`;
        userVisits[userId] = (userVisits[userId] || 0) + 1;
      }
    });
    const totalUsers = Object.keys(userVisits).length;
    const retained = Object.values(userVisits).filter(v => v > 1).length;
    if (totalUsers === 0) {return 0;}
    return ((retained / totalUsers) * 100).toFixed(1);
  }

  // Mock: Funnel data (Visit → Signup → Order)
  getFunnelData(data) {
    // Simulate: 100% visit, 40% signup, 20% order
    const totalVisitors = (data.visitors || []).reduce((sum, d) => sum + (d.totalVisitors || 0), 0);
    const signups = Math.floor(totalVisitors * 0.4);
    const orders = (data.oilOrders || []).reduce((sum, d) => sum + (d.totalOrders || 0), 0);
    return {
      steps: ['Visit', 'Signup', 'Order'],
      values: [totalVisitors, signups, orders]
    };
  }

  // Mock: Device/browser breakdown (randomized for demo)
  getDeviceBreakdown(_data) {
    // Simulate breakdown for demo
    const _total = 100;
    const desktop = 50 + Math.floor(Math.random() * 20); // 50-70%
    const mobile = 100 - desktop - 10;
    const tablet = 10;
    const chrome = 60 + Math.floor(Math.random() * 10); // 60-70%
    const firefox = 20 + Math.floor(Math.random() * 10); // 20-30%
    const safari = 10;
    return {
      devices: [desktop, mobile, tablet],
      deviceLabels: ['Desktop', 'Mobile', 'Tablet'],
      browsers: [chrome, firefox, safari],
      browserLabels: ['Chrome', 'Firefox', 'Safari']
    };
  }

  addVisitorEvent(event) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    const today = new Date().toISOString().split('T')[0];

    // Find or create today's visitor data
    let todayData = data.visitors.find(v => v.date === today);
    if (!todayData) {
      todayData = {
        date: today,
        totalVisitors: 0,
        uniqueVisitors: 0,
        returningVisitors: 0,
        newVisitors: 0
      };
      data.visitors.push(todayData);
    }

    // Update visitor counts based on event
    todayData.totalVisitors++;
    if (event.isUnique) {todayData.uniqueVisitors++;}
    if (event.isReturning) {todayData.returningVisitors++;} else {todayData.newVisitors++;}

    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  addPageView(page, duration = null) {
    const data = JSON.parse(localStorage.getItem(this.storageKey));
    const today = new Date().toISOString().split('T')[0];

    // Find or create today's page view data
    let todayData = data.pageViews.find(p => p.date === today);
    if (!todayData) {
      todayData = { date: today, pages: {} };
      data.pageViews.push(todayData);
    }

    if (!todayData.pages[page]) {
      todayData.pages[page] = {
        name: this.getPageName(page),
        views: 0,
        avgTimeOnPage: 0,
        bounceRate: 0
      };
    }

    todayData.pages[page].views++;
    if (duration) {
      // Update average time on page
      const currentAvg = todayData.pages[page].avgTimeOnPage;
      const views = todayData.pages[page].views;
      todayData.pages[page].avgTimeOnPage = (currentAvg * (views - 1) + duration) / views;
    }

    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  getPageName(path) {
    const pageNames = {
      '/index.html': 'Home',
      '/oil-products.html': 'Oil Orders',
      '/analytics.html': 'Analytics',
      '/administration.html': 'Administration',
      '/users.html': 'User Management',
      '/settings.html': 'Settings'
    };
    return pageNames[path] || path;
  }

  exportData(format = 'csv', dateRange = 30) {
    const analyticsData = this.getData({ dateRange });

    if (format === 'csv') {
      return this.exportToCSV(analyticsData);
    } else if (format === 'json') {
      return this.exportToJSON(analyticsData);
    }
    return null;
  }

  exportToCSV(analyticsData) {
    let csv = 'Date,Total Visitors,Unique Visitors,Returning Visitors,New Visitors,Total Sessions,Avg Session Duration,Pages Per Session,Bounce Rate\n';

    analyticsData.data.visitors.forEach((visitor, index) => {
      const session = analyticsData.data.userSessions[index] || {};
      csv += `${visitor.date},${visitor.totalVisitors},${visitor.uniqueVisitors},${visitor.returningVisitors},${visitor.newVisitors},${session.totalSessions || 0},${session.avgSessionDuration || 0},${(session.pagesPerSession || 0).toFixed(1)},${((session.bounceRate || 0) * 100).toFixed(1)}%\n`;
    });

    return csv;
  }

  exportToJSON(analyticsData) {
    return JSON.stringify(analyticsData, null, 2);
  }

  getRealtimeStats() {
    // Simulate real-time statistics
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const users = JSON.parse(localStorage.getItem('siteUsers') || '[]');

    return {
      activeUsers: currentUser ? 1 : 0,
      totalUsers: users.length,
      currentPageViews: Math.floor(Math.random() * 20 + 5),
      serverStatus: 'Online',
      lastUpdate: new Date().toISOString()
    };
  }
}

// Initialize analytics manager
window.analyticsManager = new AnalyticsDataManager();

// Auto-track page views when script loads
window.addEventListener('load', () => {
  const currentPage = window.location.pathname || '/index.html';
  window.analyticsManager.addPageView(currentPage);

  // Track as unique visitor if first visit of the day
  const lastVisit = localStorage.getItem('lastVisitDate');
  const today = new Date().toISOString().split('T')[0];
  const isUnique = lastVisit !== today;
  const isReturning = !!lastVisit;

  window.analyticsManager.addVisitorEvent({ isUnique, isReturning });
  localStorage.setItem('lastVisitDate', today);
});
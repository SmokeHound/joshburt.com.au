# Phase 4 Quick Reference Guide

## 🚀 Getting Started

### Run Migrations
```bash
npm run migrate
```

### Test New Features
```bash
# Check product search
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8888/netlify/functions/products?search=engine&category_id=1"

# Check notifications
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8888/netlify/functions/notifications?unread_only=true"

# Check analytics
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8888/netlify/functions/analytics?report_type=order_summary"
```

## 📡 New API Endpoints

### Product Categories
```
GET    /netlify/functions/product-categories
POST   /netlify/functions/product-categories
PUT    /netlify/functions/product-categories
DELETE /netlify/functions/product-categories
```

### Enhanced Products (with search & filtering)
```
GET /netlify/functions/products?search=term&category_id=1&min_price=10&max_price=100
```

### Enhanced Orders (with status tracking & export)
```
GET    /netlify/functions/orders?status=pending&export_format=csv
PATCH  /netlify/functions/orders (update status)
DELETE /netlify/functions/orders (cancel order)
```

### Analytics
```
GET /netlify/functions/analytics?report_type=order_trends
GET /netlify/functions/analytics?report_type=top_products
GET /netlify/functions/analytics?report_type=category_breakdown
GET /netlify/functions/analytics?report_type=order_summary&compare_previous=true
GET /netlify/functions/analytics?report_type=user_activity
```

### Notifications
```
GET    /netlify/functions/notifications?unread_only=true
POST   /netlify/functions/notifications (admin only)
PATCH  /netlify/functions/notifications (mark as read)
DELETE /netlify/functions/notifications
```

### Notification Preferences
```
GET /netlify/functions/notification-preferences
PUT /netlify/functions/notification-preferences
```

## 🎨 New UI Pages

- **Notifications**: `notifications.html`
- **Preferences**: `notification-preferences.html`
- **Component**: `shared-notifications-center.html` (ready to integrate)

## 🔧 Configuration

### Required Environment Variables
```bash
# Email notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@joshburt.com.au
SMTP_PASS=your-password
FROM_EMAIL=noreply@joshburt.com.au
FRONTEND_URL=https://joshburt.com.au
```

## 🧪 Testing Checklist

### Products
- [ ] Search products: `?search=engine+oil`
- [ ] Filter by category: `?category_id=1`
- [ ] Filter by price: `?min_price=20&max_price=100`
- [ ] Pagination: `?page=2&limit=10`
- [ ] Create/update/delete categories

### Orders
- [ ] Update order status
- [ ] View status history
- [ ] Export to CSV: `?export_format=csv`
- [ ] Cancel order
- [ ] Verify email sent

### Analytics
- [ ] Get order trends
- [ ] View top products
- [ ] Category breakdown
- [ ] Period comparison: `?compare_previous=true`

### Notifications
- [ ] Receive in-app notification
- [ ] Unread count correct
- [ ] Mark as read works
- [ ] Preferences save
- [ ] Email notifications sent

## 🐛 Troubleshooting

### Migrations fail
```bash
# Check connection
node scripts/health-check.js

# Run migrations manually
node scripts/run-migrations.js
```

### Emails not sending
```bash
# Check environment
echo $SMTP_HOST
echo $NODE_ENV  # Should not be 'development' in production

# Test email config
node -e "console.log(process.env.SMTP_HOST)"
```

### Notifications not appearing
```bash
# Check token
echo $TOKEN

# Test endpoint directly
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8888/netlify/functions/notifications
```

## 📊 Performance Targets

- Product search: <50ms
- Order queries: <100ms
- Analytics: <500ms
- Notifications: <50ms

## 🔐 Security

- ✅ JWT authentication required
- ✅ RBAC authorization enforced
- ✅ SQL injection prevented (parameterized queries)
- ✅ XSS prevented (HTML escaping)
- ✅ Input validation on all endpoints

## 📚 Documentation

- **Implementation**: `PHASE4_IMPLEMENTATION.md`
- **Summary**: `PHASE4_SUMMARY.md`
- **API Docs**: `API_DOCUMENTATION.md`
- **Database**: `DATABASE.md`

## 🎯 Quick Wins

1. **Enable product search**: Already works, just start using it
2. **Track order status**: Update orders with new statuses
3. **View analytics**: Call analytics endpoint for insights
4. **Get notifications**: Check notification center

## 🔮 Coming Soon

- [ ] Notification center in navigation
- [ ] Analytics charts visualization
- [ ] Custom date range picker
- [ ] Product image upload
- [ ] Product variants UI

## 🆘 Support

- Check logs: `console.error` output
- Review database: `npm run health`
- Run tests: `npm test`
- Lint code: `npm run lint`

---

**Version**: 1.0  
**Last Updated**: 2025-10-30  
**Status**: Production Ready ✅

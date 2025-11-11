# Monitoring & Observability

System monitoring, health checks, and observability for joshburt.com.au.

## Health Checks

### Database Connectivity

**Endpoint**: `GET /.netlify/functions/health`

**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-11T10:30:00.000Z"
}
```

**Script**: `npm run health`

### Manual Check

```bash
curl https://joshburt.netlify.app/.netlify/functions/health
```

---

## Audit Logs

### Access

**UI**: `audit-logs.html` (admin only)

**API**: `GET /.netlify/functions/audit-logs`

### Search/Filter

- By user
- By action type
- By date range
- Export to CSV

### Common Events

- `user:login`, `user:logout`
- `user:create`, `user:update`, `user:delete`
- `product:create`, `product:update`
- `order:create`, `order:update`
- `settings:update`

---

## Netlify Monitoring

### Function Logs

**Dashboard**: Netlify → Functions → Select function → Logs

**Real-time**: `netlify dev` (local)

### Uptime Monitoring

Netlify provides automatic uptime monitoring with email alerts.

---

## Performance Metrics

### Current Performance

- Page load: <2s
- API response: <100ms p95
- Database queries: <50ms
- Lighthouse score: 95/100

### Monitoring Tools

- Netlify Analytics (built-in)
- Browser DevTools (Performance tab)
- Database query EXPLAIN ANALYZE

---

**Last Updated**: 2025-11-11  
**Maintained By**: Development Team

// Netlify Function: Analytics Events
// Handles event tracking and querying for analytics dashboard

const { database } = require('../../config/database');
const { withHandler, ok, error } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const crypto = require('crypto');

exports.handler = withHandler(async function (event) {
  await database.connect();

  const method = event.httpMethod;

  // POST: Track new event (open to all authenticated users)
  if (method === 'POST') {
    return await trackEvent(event);
  }

  // GET: Query events (admin/manager only)
  if (method === 'GET') {
    const { user, response: authResponse } = await requirePermission(event, 'analytics', 'read');
    if (authResponse) {
      return authResponse;
    }
    return await queryEvents(event);
  }

  // DELETE: Clean up old events (admin only)
  if (method === 'DELETE') {
    const { user, response: authResponse } = await requirePermission(event, 'analytics', 'delete');
    if (authResponse) {
      return authResponse;
    }
    return await cleanupEvents(event);
  }

  return error(405, 'Method Not Allowed');

  // Track a new analytics event
  async function trackEvent(event) {
    try {
      const body = JSON.parse(event.body || '{}');
      const { event_type, session_id, page_url, referrer, properties = {} } = body;

      // Validate required fields
      if (!event_type || !session_id) {
        return error(400, 'Missing required fields: event_type, session_id');
      }

      // Extract user_id from token if available (optional)
      let user_id = null;
      try {
        const authHeader = event.headers['authorization'] || event.headers['Authorization'];
        if (authHeader) {
          const jwt = require('jsonwebtoken');
          const token = authHeader.replace('Bearer ', '');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          user_id = decoded.userId;
        }
      } catch (e) {
        // Anonymous tracking is fine, user_id will be null
      }

      // Get IP address and user agent
      const ip_address =
        event.headers['x-forwarded-for']?.split(',')[0] || event.headers['client-ip'] || null;
      const user_agent = event.headers['user-agent'] || null;

      // Insert event
      const insertEventQuery = `
        INSERT INTO analytics_events (event_type, user_id, session_id, page_url, referrer, properties, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `;

      const eventResult = await database.run(insertEventQuery, [
        event_type,
        user_id,
        session_id,
        page_url,
        referrer,
        JSON.stringify(properties)
      ]);

      // Update or create session
      await updateSession(session_id, user_id, ip_address, user_agent, page_url, event_type);

      return ok({
        message: 'Event tracked successfully',
        event: eventResult.rows && eventResult.rows[0] ? eventResult.rows[0] : { id: eventResult.id }
      });
    } catch (e) {
      console.error('Error tracking event:', e);
      return error(500, 'Failed to track event');
    }
  }

  // Update session tracking
  async function updateSession(session_id, user_id, ip_address, user_agent, page_url, event_type) {
    // Check if session exists
    const sessionQuery = 'SELECT * FROM analytics_sessions WHERE session_id = $1';
    const session = await database.get(sessionQuery, [session_id]);

    if (!session) {
      // Create new session
      const insertSessionQuery = `
        INSERT INTO analytics_sessions 
        (session_id, user_id, ip_address, user_agent, started_at, last_activity, page_views, entry_page)
        VALUES ($1, $2, $3, $4, NOW(), NOW(), 1, $5)
      `;
      await database.run(insertSessionQuery, [
        session_id,
        user_id,
        ip_address,
        user_agent,
        page_url
      ]);
    } else {
      // Update existing session
      const updateSessionQuery = `
        UPDATE analytics_sessions
        SET 
          last_activity = NOW(),
          page_views = page_views + CASE WHEN $1 = 'page_view' THEN 1 ELSE 0 END,
          exit_page = $2,
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
        WHERE session_id = $3
      `;
      await database.run(updateSessionQuery, [event_type, page_url, session_id]);
    }
  }

  // Query analytics events with filters
  async function queryEvents(event) {
    try {
      const params = event.queryStringParameters || {};
      const {
        event_type,
        user_id,
        session_id,
        date_from,
        date_to,
        page = 1,
        per_page = 100,
        aggregate = 'false'
      } = params;

      const limit = Math.min(parseInt(per_page, 10) || 100, 500);
      const offset = (parseInt(page, 10) - 1) * limit;

      // If aggregate is requested, return aggregated stats
      if (aggregate === 'true') {
        return await getAggregatedStats(params);
      }

      // Build query with filters
      let query = 'SELECT * FROM analytics_events WHERE 1=1';
      const queryParams = [];
      let paramCount = 1;

      if (event_type) {
        query += ` AND event_type = $${paramCount}`;
        queryParams.push(event_type);
        paramCount++;
      }

      if (user_id) {
        query += ` AND user_id = $${paramCount}`;
        queryParams.push(parseInt(user_id, 10));
        paramCount++;
      }

      if (session_id) {
        query += ` AND session_id = $${paramCount}`;
        queryParams.push(session_id);
        paramCount++;
      }

      if (date_from) {
        query += ` AND timestamp >= $${paramCount}::timestamp`;
        queryParams.push(`${date_from} 00:00:00`);
        paramCount++;
      }

      if (date_to) {
        query += ` AND timestamp <= $${paramCount}::timestamp`;
        queryParams.push(`${date_to} 23:59:59`);
        paramCount++;
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      queryParams.push(limit, offset);

      const events = await database.all(query, queryParams);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM analytics_events WHERE 1=1';
      const countParams = queryParams.slice(0, -2); // Remove limit and offset
      let countParamIndex = 1;

      if (event_type) {
        countQuery += ` AND event_type = $${countParamIndex++}`;
      }
      if (user_id) {
        countQuery += ` AND user_id = $${countParamIndex++}`;
      }
      if (session_id) {
        countQuery += ` AND session_id = $${countParamIndex++}`;
      }
      if (date_from) {
        countQuery += ` AND timestamp >= $${countParamIndex++}::timestamp`;
      }
      if (date_to) {
        countQuery += ` AND timestamp <= $${countParamIndex++}::timestamp`;
      }

      const countResult = await database.get(countQuery, countParams);
      const total = parseInt(countResult.count, 10);

      return ok({
        events: events,
        pagination: {
          page: parseInt(page, 10),
          per_page: limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });
    } catch (e) {
      console.error('Error querying events:', e);
      return error(500, 'Failed to query events');
    }
  }

  // Get aggregated statistics
  async function getAggregatedStats(params) {
    try {
      const { date_from, date_to, group_by = 'day' } = params;

      const endDate = date_to || new Date().toISOString().split('T')[0];
      const startDate =
        date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Ensure dates are properly formatted for PostgreSQL
      const startTimestamp = `${startDate} 00:00:00`;
      const endTimestamp = `${endDate} 23:59:59`;

      // Get stats by event type
      const eventTypeQuery = `
        SELECT 
          event_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM analytics_events
        WHERE timestamp >= $1::timestamp AND timestamp <= $2::timestamp
        GROUP BY event_type
        ORDER BY count DESC
      `;
      const eventTypeResult = await database.all(eventTypeQuery, [startTimestamp, endTimestamp]);

      // Get daily/hourly trends
      let timeFormat;
      switch (group_by) {
        case 'hour':
          timeFormat = "DATE_TRUNC('hour', timestamp)";
          break;
        case 'day':
        default:
          timeFormat = 'DATE(timestamp)';
      }

      const trendsQuery = `
        SELECT 
          ${timeFormat} as period,
          event_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM analytics_events
        WHERE timestamp >= $1::timestamp AND timestamp <= $2::timestamp
        GROUP BY period, event_type
        ORDER BY period DESC, event_type
      `;
      const trendsResult = await database.all(trendsQuery, [startTimestamp, endTimestamp]);

      // Get session statistics
      const sessionQuery = `
        SELECT 
          COUNT(*) as total_sessions,
          COALESCE(AVG(duration_seconds), 0) as avg_duration,
          COALESCE(AVG(page_views), 0) as avg_page_views,
          COUNT(DISTINCT user_id) as unique_users
        FROM analytics_sessions
        WHERE started_at >= $1::timestamp AND started_at <= $2::timestamp
      `;
      const sessionStats = await database.get(sessionQuery, [startTimestamp, endTimestamp]);

      // Get top pages
      const topPagesQuery = `
        SELECT 
          page_url,
          COUNT(*) as views,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM analytics_events
        WHERE event_type = 'page_view' 
          AND timestamp >= $1::timestamp 
          AND timestamp <= $2::timestamp
        GROUP BY page_url
        ORDER BY views DESC
        LIMIT 20
      `;
      const topPagesResult = await database.all(topPagesQuery, [startTimestamp, endTimestamp]);

      return ok({
        date_range: { start: startDate, end: endDate },
        event_types: eventTypeResult,
        trends: trendsResult,
        sessions: sessionStats || {
          total_sessions: 0,
          avg_duration: 0,
          avg_page_views: 0,
          unique_users: 0
        },
        top_pages: topPagesResult
      });
    } catch (e) {
      console.error('Error getting aggregated stats:', e);
      console.error('Stack trace:', e.stack);
      return error(500, `Failed to get aggregated stats: ${e.message}`);
    }
  }

  // Clean up old events (data retention)
  async function cleanupEvents(event) {
    try {
      const params = event.queryStringParameters || {};
      const { days_to_keep = 90 } = params;

      const cutoffDate = new Date(Date.now() - parseInt(days_to_keep, 10) * 24 * 60 * 60 * 1000);

      // Delete old events
      const deleteEventsQuery = `
        DELETE FROM analytics_events
        WHERE timestamp < $1
      `;
      const eventsResult = await database.run(deleteEventsQuery, [cutoffDate]);

      // Delete old sessions
      const deleteSessionsQuery = `
        DELETE FROM analytics_sessions
        WHERE started_at < $1
      `;
      const sessionsResult = await database.run(deleteSessionsQuery, [cutoffDate]);

      return ok({
        message: 'Cleanup completed',
        events_deleted: eventsResult.changes,
        sessions_deleted: sessionsResult.changes,
        cutoff_date: cutoffDate
      });
    } catch (e) {
      console.error('Error cleaning up events:', e);
      return error(500, 'Failed to cleanup events');
    }
  }
});

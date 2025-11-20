# Phase 3 Implementation Guide

**Date**: 2025-11-19
**Status**: ✅ Complete
**Phase**: 3 - Search & Discovery

## Overview

Phase 3 implements full-text search and advanced filtering capabilities using PostgreSQL's built-in features. This enhancement provides fast, weighted search across products, consumables, filters, and users.

---

## What Was Implemented

### 3.1 Full-Text Search

#### Database Layer

- **Migration 011**: `migrations/011_add_full_text_search.sql`
  - Added `search_vector` tsvector columns to: products, consumables, filters, users
  - Created trigger functions to automatically update search vectors on data changes
  - Implemented weighted ranking (A=highest for names, B for codes, C for descriptions, D for specs)
  - Created `search_queries` table for tracking and analytics
  - Added GIN indexes for fast full-text search
  - Created `popular_searches` view for trending queries

#### Backend API

- **Function**: `netlify/functions/search.js`
  - **GET /search?q=query&type=all&limit=20&offset=0&sort=relevance**
    - Universal search across all content types
    - Content type filtering: `all`, `product`, `consumable`, `filter`, `user`
    - Sort options: `relevance`, `name`, `recent`
    - Pagination support
    - Weighted ranking with ts_rank
  - **GET /search?suggest=partial&limit=5**
    - Real-time search suggestions
    - Combines recent searches with product/consumable/filter names
    - Deduplicated results
  - **GET /search?popular=true&limit=10**
    - Popular searches from last 30 days
    - Aggregated by search count
  - **POST /search**
    - Track clicked search results
    - Analytics for search effectiveness

#### Client-Side Components

- **Autocomplete**: `assets/js/search-autocomplete.js`
  - Real-time suggestions as user types
  - Keyboard navigation (arrow keys, enter, escape)
  - Recent searches integration
  - Click outside to close
  - Debounced API calls (300ms default)
  - Customizable options

- **Search Results Page**: `search-results.html`
  - Unified search interface
  - Filter tabs by content type
  - Sort options (relevance, name, recent)
  - Pagination controls
  - Popular searches display
  - Click tracking
  - Responsive design

### 3.2 Advanced Filtering

#### Filter Component

- **Component**: `assets/js/advanced-filters.js`
  - Multi-criteria filtering
  - Filter types:
    - Checkbox (multi-select)
    - Range (min-max with numbers)
    - Select (single choice dropdown)
    - Radio (single choice buttons)
  - Faceted counts (shows number of items per filter option)
  - Filter persistence via localStorage
  - Active filters display with remove buttons
  - Collapsible filter sections
  - Dynamic filter generation
  - SQL WHERE clause builder

---

## API Documentation

### Search Endpoint

**Base URL**: `/.netlify/functions/search`

#### Perform Search

```http
GET /search?q={query}&type={type}&limit={limit}&offset={offset}&sort={sort}
```

**Query Parameters**:

- `q` (required): Search query string
- `type` (optional): Filter by content type - `all` (default), `product`, `consumable`, `filter`, `user`
- `limit` (optional): Max results per type (1-100, default 20)
- `offset` (optional): Pagination offset (default 0)
- `sort` (optional): Sort order - `relevance` (default), `name`, `recent`

**Response**:

```json
{
  "query": "oil filter",
  "type": "all",
  "total": 5,
  "products": [
    {
      "id": 1,
      "name": "Premium Engine Oil 5W-30",
      "code": "OIL-001",
      "type": "Engine Oil",
      "description": "High performance synthetic motor oil",
      "stock_quantity": 50,
      "rank": 0.9,
      "result_type": "product"
    }
  ],
  "consumables": [],
  "filters": [],
  "users": [],
  "metadata": {
    "limit": 20,
    "offset": 0,
    "sort": "relevance"
  }
}
```

#### Get Suggestions

```http
GET /search?suggest={partial}&limit={limit}
```

**Query Parameters**:

- `suggest` (required): Partial search query (minimum 2 characters)
- `limit` (optional): Max suggestions (default 5)

**Response**:

```json
{
  "suggestions": [
    {
      "text": "oil filter",
      "source": "recent",
      "frequency": 10
    },
    {
      "text": "oil change kit",
      "source": "product",
      "frequency": 0
    }
  ]
}
```

#### Get Popular Searches

```http
GET /search?popular=true&limit={limit}
```

**Response**:

```json
{
  "popular": [
    {
      "query": "oil filter",
      "search_count": 100,
      "unique_users": 25,
      "avg_results": 12.5,
      "last_searched": "2025-11-19T08:00:00Z"
    }
  ]
}
```

#### Track Search Click

```http
POST /search
```

**Request Body**:

```json
{
  "query": "oil filter",
  "result_id": 1,
  "result_type": "product"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Search click tracked"
}
```

---

## Usage Examples

### Client-Side Search Implementation

#### Initialize Autocomplete

```html
<input type="text" id="searchInput" placeholder="Search..." />
<script src="/assets/js/search-autocomplete.js"></script>
<script>
  const autocomplete = window.initSearchAutocomplete('#searchInput', {
    minChars: 2,
    debounceMs: 300,
    maxSuggestions: 5,
    onSelect: suggestion => {
      console.log('Selected:', suggestion);
      // Redirect to search results or perform search
      window.location.href = `/search-results.html?q=${encodeURIComponent(suggestion.text)}`;
    }
  });
</script>
```

#### Perform Search

```javascript
const FN_BASE = '/.netlify/functions';

async function performSearch(query) {
  const response = await fetch(
    `${FN_BASE}/search?q=${encodeURIComponent(query)}&type=all&sort=relevance`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
      }
    }
  );

  const results = await response.json();
  console.log('Found', results.total, 'results');
  displayResults(results);
}
```

### Advanced Filters Implementation

#### Initialize Filters

```javascript
const filters = new AdvancedFilters('#filtersContainer', {
  itemType: 'product',
  filters: [
    {
      key: 'type',
      label: 'Product Type',
      type: 'checkbox',
      options: [
        { value: 'Engine Oil', label: 'Engine Oil' },
        { value: 'Transmission Fluid', label: 'Transmission Fluid' },
        { value: 'Coolant', label: 'Coolant' }
      ]
    },
    {
      key: 'stock_quantity',
      label: 'Stock Level',
      type: 'range',
      min: 0,
      max: 1000,
      unit: 'units'
    },
    {
      key: 'category_id',
      label: 'Category',
      type: 'select',
      options: [
        { value: '1', label: 'Automotive' },
        { value: '2', label: 'Industrial' }
      ]
    }
  ],
  onFilterChange: activeFilters => {
    console.log('Filters changed:', activeFilters);
    // Reload data with filters
    loadProducts(activeFilters);
  }
});
```

#### Build SQL Query

```javascript
// Get WHERE clause for SQL query
const { clause, params } = filters.buildWhereClause();

// Example SQL query
const query = `
  SELECT * FROM products
  WHERE ${clause}
  ORDER BY name ASC
`;

// Execute with params
const result = await db.query(query, params);
```

---

## Database Schema

### Search Vector Columns

Each searchable table now has a `search_vector` tsvector column:

```sql
-- Products table
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- Automatically updated by trigger:
-- A-weight: name
-- B-weight: code
-- C-weight: description
-- D-weight: specs
```

### Search Queries Table

```sql
CREATE TABLE search_queries (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  results_count INTEGER DEFAULT 0,
  clicked_result_id INTEGER,
  clicked_result_type VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### Popular Searches View

```sql
CREATE VIEW popular_searches AS
SELECT
  query,
  COUNT(*) as search_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(results_count) as avg_results,
  MAX(timestamp) as last_searched
FROM search_queries
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY query
ORDER BY search_count DESC
LIMIT 100;
```

---

## Performance Considerations

### Search Performance

- **GIN Indexes**: All search_vector columns use GIN indexes for fast lookups
- **Materialized Views**: Consider creating materialized views for frequently searched content
- **Query Optimization**: ts_rank calculation is efficient but scales with result set size
- **Caching**: Implement caching for popular searches and autocomplete results

### Best Practices

1. **Limit Result Sets**: Always use LIMIT/OFFSET for pagination
2. **Debounce Autocomplete**: Use 300ms+ debounce to reduce API calls
3. **Cache Suggestions**: Cache autocomplete suggestions client-side
4. **Index Maintenance**: Regularly VACUUM and ANALYZE tables with search vectors
5. **Monitor Performance**: Track slow queries and optimize as needed

---

## Testing

### Unit Tests

All search functionality is covered by unit tests in `tests/unit/search.test.js`:

```bash
npm test -- tests/unit/search.test.js
```

**Test Coverage**:

- ✅ Universal search across all content types
- ✅ Content type filtering
- ✅ Missing query validation
- ✅ Search suggestions
- ✅ Popular searches
- ✅ Search click tracking
- ✅ Required fields validation
- ✅ Pagination parameters
- ✅ Maximum results limit
- ✅ Unsupported HTTP methods

### Manual Testing

1. **Search Functionality**

   ```bash
   # Start dev server
   npm run dev:functions

   # Test search
   curl "http://localhost:8888/.netlify/functions/search?q=oil"

   # Test suggestions
   curl "http://localhost:8888/.netlify/functions/search?suggest=oil"

   # Test popular
   curl "http://localhost:8888/.netlify/functions/search?popular=true"
   ```

2. **UI Testing**
   - Navigate to `/search-results.html`
   - Enter search query
   - Test autocomplete
   - Test filter tabs
   - Test sort options
   - Test popular searches

---

## Migration Steps

### Development

```bash
# Run migration
npm run migrate:run

# Verify migration
psql $DATABASE_URL -c "\d products" | grep search_vector
```

### Production

```bash
# 1. Backup database
pg_dump $DATABASE_URL > backup.sql

# 2. Run migration
node scripts/run-migrations.js

# 3. Verify search functionality
curl "https://yoursite.com/.netlify/functions/search?q=test"

# 4. Monitor performance
# Check query execution times in PostgreSQL logs
```

---

## Future Enhancements

### Planned Features

- [ ] **Fuzzy Matching**: Implement pg_trgm for typo tolerance
- [ ] **Search Filters**: Add filters directly to search results page
- [ ] **Search Analytics Dashboard**: Visualize search trends and popular queries
- [ ] **Synonyms**: Create synonym dictionary for better results
- [ ] **Multi-language**: Support for multiple languages in search
- [ ] **Saved Searches**: Allow users to save and reuse searches
- [ ] **Advanced Operators**: Support for AND, OR, NOT operators
- [ ] **Faceted Navigation**: Dynamic facet generation based on results

### Performance Improvements

- [ ] **Caching Layer**: Implement Redis for search result caching
- [ ] **Elasticsearch Integration**: Consider for very large datasets
- [ ] **Query Optimization**: Analyze slow queries and add indexes
- [ ] **Partitioning**: Partition search_queries by date for performance

---

## Troubleshooting

### Common Issues

1. **No search results**
   - Verify migration ran successfully
   - Check search_vector columns exist: `\d products`
   - Verify triggers are active: `SELECT * FROM pg_trigger WHERE tgname LIKE '%search%'`
   - Check data in search_vector: `SELECT search_vector FROM products LIMIT 5`

2. **Slow searches**
   - Verify GIN indexes exist: `\d products` look for idx_products_search_vector
   - Run VACUUM ANALYZE on tables
   - Check query execution plan: `EXPLAIN ANALYZE SELECT ...`
   - Consider limiting result set size

3. **Autocomplete not working**
   - Check browser console for errors
   - Verify API endpoint is accessible
   - Check CORS settings if needed
   - Verify JWT token is valid (if required)

4. **Filters not persisting**
   - Check localStorage is enabled
   - Verify storageKey is unique per page
   - Check for JavaScript errors in console

---

## Security Considerations

### Authentication

- Search endpoint works for both authenticated and anonymous users
- User-specific results require valid JWT token
- User search results are filtered based on permissions

### Input Validation

- All search queries are sanitized
- SQL injection prevented via parameterized queries
- Maximum query length enforced
- Special characters handled properly

### Rate Limiting

- Consider implementing rate limiting for search endpoint
- Recommended: 60 requests per minute per IP
- Use existing rate limiting middleware

---

## Maintenance

### Regular Tasks

**Daily**:

- Monitor search query performance
- Check error logs for search failures

**Weekly**:

- Review popular searches for insights
- Analyze search click-through rates
- Update autocomplete suggestions

**Monthly**:

- Run VACUUM ANALYZE on search tables
- Archive old search_queries data (>90 days)
- Review and optimize slow queries
- Update documentation if needed

---

## Support

For questions or issues:

- Check documentation in `/docs`
- Review test files for usage examples
- Open issue on GitHub: https://github.com/SmokeHound/joshburt.com.au/issues

---

**Last Updated**: 2025-11-19
**Maintained By**: Development Team
**Version**: 1.0.0

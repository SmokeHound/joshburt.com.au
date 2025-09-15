# Deployment Instructions for Neon DB Integration

This document explains how to deploy the joshburt.com.au website with Neon DB integration using Netlify Functions.

## Prerequisites

1. **Neon DB Account**: You need a Neon DB account with the provided connection string
2. **Netlify Account**: For hosting the website and functions
3. **GitHub Repository**: Connected to Netlify for automatic deployments

## Database Setup

### 1. Create Database Tables

Run the SQL commands from `database-schema.sql` in your Neon DB console:

```bash
# Copy the contents of database-schema.sql and execute in Neon DB SQL Editor
```

This will create:
- `products` table with Castrol oil products
- `orders` table for customer orders
- `order_items` table for individual order items
- `users` table for future authentication
- Sample product data pre-populated

### 2. Environment Variables

Set the following environment variable in your Netlify dashboard:

**Netlify Dashboard → Site Settings → Environment Variables:**

```
NEON_DATABASE_URL = postgresql://neondb_owner:npg_RCwEhZ2pm6vx@ep-broad-term-a75jcieo-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Netlify Deployment

### 1. Connect Repository

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "New site from Git"
3. Connect your GitHub account
4. Select the `joshburt.com.au` repository
5. Configure build settings:
   - **Build command**: `echo "No build required for static site"`
   - **Publish directory**: `/` (root directory)
   - **Functions directory**: `netlify/functions`

### 2. Enable Netlify Functions

Netlify will automatically detect the `netlify/functions` directory and deploy the serverless functions.

Available endpoints after deployment:
- `/.netlify/functions/products` - GET/POST for products
- `/.netlify/functions/orders` - GET/POST for orders

### 3. Install Dependencies

Create a `netlify.toml` file if automatic dependency detection doesn't work:

```toml
[build]
  command = "npm install"
  functions = "netlify/functions"
  publish = "."

[build.environment]
  NODE_VERSION = "18"
```

## Testing

### Local Development

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run locally with functions:
   ```bash
   netlify dev
   ```

4. Access at: http://localhost:8888

### Production Testing

After deployment, test the API endpoints:

```bash
# Test products endpoint
curl https://your-site.netlify.app/.netlify/functions/products

# Test orders endpoint
curl -X POST https://your-site.netlify.app/.netlify/functions/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"name":"Test Product","code":"TEST123","quantity":1}]}'
```

## Features

### Oil Ordering System (`oil.html`)

- **Products Loading**: Fetches products from Neon DB via `/products` API
- **Order Submission**: Saves orders to Neon DB via `/orders` API
- **CSV Download**: Still generates CSV files for local record keeping
- **Error Handling**: Shows user-friendly error messages if API calls fail

### API Functions

#### Products Function (`/netlify/functions/products.js`)
- **GET**: Retrieve all products or filter by type
- **POST**: Add new products (admin functionality)
- **CORS**: Properly configured for browser requests

#### Orders Function (`/netlify/functions/orders.js`)
- **POST**: Submit new orders with multiple items
- **GET**: Retrieve order history (admin functionality)
- **Database Transactions**: Ensures data consistency

## Troubleshooting

### Common Issues

1. **"Failed to load products from database"**
   - Check Neon DB connection string in environment variables
   - Verify database tables exist by running the schema SQL
   - Check Netlify function logs for detailed error messages

2. **"Failed to submit order"**
   - Ensure orders and order_items tables exist
   - Check CORS configuration if testing from different domain
   - Verify API endpoint URL is correct

3. **Functions not deploying**
   - Ensure `netlify/functions` directory structure is correct
   - Check that `package.json` includes `pg` dependency
   - Verify Node.js version compatibility (use Node 18+)

### Monitoring

- **Netlify Function Logs**: Monitor function execution and errors
- **Neon DB Monitoring**: Track database queries and performance
- **Browser Console**: Check for JavaScript errors on frontend

## Security Considerations

- Database connection string is stored as environment variable
- CORS headers configured for security
- SQL injection prevention through parameterized queries
- Consider adding rate limiting for production use

## Future Enhancements

- User authentication and order history
- Admin panel for product management
- Email notifications for orders
- Real-time inventory tracking
- Enhanced error reporting and monitoring
# Manual Testing Guide for Order Submission Fix

This document describes how to manually test the order submission authentication fix.

## Prerequisites
- User must be logged in (have an access token in localStorage)
- Database must be accessible
- Products must exist in the database

## Test Scenarios

### Scenario 1: Order Submission with Valid Authentication

**Steps:**
1. Navigate to `/oil-products.html`
2. Login if not already authenticated
3. Add products to the order list by clicking on available oil products
4. Fill in order information:
   - Requested By: Your name
   - Order Date: Today's date
   - Priority: Normal/Urgent/Low
   - Notes: Test order submission
5. Click "Submit Order" button

**Expected Results:**
- Order submission request includes `Authorization: Bearer <token>` header
- API responds with 201 Created status
- Success message: "Order submitted successfully!"
- Order list clears after successful submission
- Order appears in orders-review.html

**Error Scenarios:**
- If not logged in: Redirected to login page with return URL
- If token expired: Auto-refresh attempted, then redirected to login if refresh fails
- If API error: Error message displayed: "Error submitting order"

### Scenario 2: Order Submission without Authentication (Should Auto-Redirect)

**Steps:**
1. Clear localStorage: `localStorage.clear()`
2. Navigate to `/oil-products.html`
3. Add products to order list
4. Click "Submit Order"

**Expected Results:**
- `authFetch` detects missing token
- User redirected to `/login.html?message=login-required&returnUrl=...`
- After login, user redirected back to oil-products.html
- Order draft should be preserved in localStorage

### Scenario 3: Products Loading with Authentication

**Steps:**
1. Navigate to `/oil-products.html`
2. Ensure you are logged in
3. Page loads and products are fetched from API

**Expected Results:**
- Products API request includes `Authorization: Bearer <token>` header
- Products list displays in "Available Oil Products" section
- If auth fails: Falls back to local JSON data in `data/products.json`
- Success toast: "Products loaded from API successfully"

### Scenario 4: Orders Review with Authentication

**Steps:**
1. Navigate to `/orders-review.html`
2. Ensure you are logged in

**Expected Results:**
- Orders list API request includes `Authorization: Bearer <token>` header
- Orders display with details (status, requested by, items, etc.)
- Click "View Details" opens modal with full order information
- Approve/Reject buttons work and update order status

### Scenario 5: Order Status Update with Authentication

**Steps:**
1. Navigate to `/orders-review.html`
2. Click "View Details" on any pending order
3. Click "Approve Order" or "Reject Order"
4. Confirm the action

**Expected Results:**
- Order status update request includes `Authorization: Bearer <token>` header
- API responds with 200 OK
- Success message: "Order #X has been approved/rejected"
- Order status badge updates in the list
- Page reloads orders to show updated status

## Testing with Network Tools

Use browser DevTools Network tab to verify authentication headers:

1. Open DevTools (F12)
2. Go to Network tab
3. Perform actions above
4. Look for API requests to `/netlify/functions/orders`
5. Check Request Headers for `Authorization: Bearer <token>`

## Testing with DISABLE_AUTH=true

For testing without authentication:

1. Set environment variable: `DISABLE_AUTH=true`
2. Restart Netlify dev server
3. All API requests should work without authentication
4. Demo user automatically created in localStorage

## Known Issues

- Products smoke test needs update to use authentication headers for products endpoint
- Settings API requires admin role, may fail for regular users (falls back to default)

## Verification Checklist

- [ ] Order submission includes Authorization header
- [ ] Products loading includes Authorization header
- [ ] Settings loading includes Authorization header
- [ ] Orders listing includes Authorization header
- [ ] Order status updates include Authorization header
- [ ] Token refresh works on 401 responses
- [ ] Redirect to login works when refresh fails
- [ ] Return URL preserved for post-login redirect
- [ ] Success and error messages display correctly
- [ ] All existing tests still pass

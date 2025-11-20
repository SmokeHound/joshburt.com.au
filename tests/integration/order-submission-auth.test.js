/**
 * Integration test for order submission with authentication
 * Tests that authFetch properly adds authentication headers to order submission
 */

const fs = require('fs');
const path = require('path');

describe('Order Submission Authentication', () => {
  test('should use authFetch for order submission', () => {
    // Verify the HTML contains authFetch calls
    const htmlContent = fs.readFileSync(path.join(__dirname, '../../oil-products.html'), 'utf8');

    expect(htmlContent).toContain('window.authFetch');
    expect(htmlContent).toContain('window.authFetch(`${FN_BASE}/orders`');
  });

  test('should include authentication in order POST request', () => {
    const htmlContent = fs.readFileSync(path.join(__dirname, '../../oil-products.html'), 'utf8');

    // Verify that the order submission uses authFetch
    expect(htmlContent).toContain('window.authFetch(`${FN_BASE}/orders`');
    expect(htmlContent).toContain("method: 'POST'");
  });

  test('should use authFetch for products API', () => {
    const htmlContent = fs.readFileSync(path.join(__dirname, '../../oil-products.html'), 'utf8');

    // Verify products loading uses authFetch
    expect(htmlContent).toContain('window.authFetch(`${FN_BASE}/products`)');
  });

  test('should use authFetch for settings API', () => {
    const htmlContent = fs.readFileSync(path.join(__dirname, '../../oil-products.html'), 'utf8');

    // Verify settings loading uses authFetch
    expect(htmlContent).toContain('window.authFetch(`${FN_BASE}/settings`)');
  });
});

describe('Orders Review Authentication', () => {
  test('should use authFetch for orders listing', () => {
    const htmlContent = fs.readFileSync(path.join(__dirname, '../../orders-review.html'), 'utf8');

    // Verify orders listing uses authFetch
    expect(htmlContent).toContain('window.authFetch(`${FN_BASE}/orders`)');
  });

  test('should use authFetch for order status updates', () => {
    const htmlContent = fs.readFileSync(path.join(__dirname, '../../orders-review.html'), 'utf8');

    // Verify order updates use authFetch with PATCH method
    expect(htmlContent).toContain('window.authFetch(`${FN_BASE}/orders`');
    expect(htmlContent).toContain("method: 'PATCH'");
  });
});

describe('Consumables Page Authentication', () => {
  test('should use authFetch for order submission', () => {
    const htmlContent = fs.readFileSync(path.join(__dirname, '../../consumables.html'), 'utf8');

    // Verify order submission uses authFetch
    expect(htmlContent).toContain('window.authFetch(`${FN_BASE}/orders`');
    expect(htmlContent).toContain("method: 'POST'");
  });

  test('should use authFetch for settings API', () => {
    const htmlContent = fs.readFileSync(path.join(__dirname, '../../consumables.html'), 'utf8');

    // Verify settings loading uses authFetch
    expect(htmlContent).toContain('window.authFetch(`${FN_BASE}/settings`)');
  });
});

describe('Analytics Page Authentication', () => {
  test('should use authFetch in fetchJSON helper', () => {
    const htmlContent = fs.readFileSync(path.join(__dirname, '../../analytics.html'), 'utf8');

    // Verify fetchJSON uses authFetch
    expect(htmlContent).toContain('window.authFetch(url)');
  });
});

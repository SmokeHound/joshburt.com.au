/**
 * Integration test for order submission with authentication
 * Tests that authFetch properly adds authentication headers to order submission
 */

const fs = require('fs');
const path = require('path');

describe('Order Submission Authentication', () => {
  test('should use authFetch for order submission', () => {
    // Verify the HTML contains authFetch calls
    const htmlContent = fs.readFileSync(
      path.join(__dirname, '../../oil-products.html'),
      'utf8'
    );
    
    expect(htmlContent).toContain('window.authFetch');
    expect(htmlContent).toContain('window.authFetch(`${FN_BASE}/orders`');
  });
  
  test('should include authentication in order POST request', () => {
    const htmlContent = fs.readFileSync(
      path.join(__dirname, '../../oil-products.html'),
      'utf8'
    );
    
    // Verify that the order submission uses authFetch, not plain fetch
    const orderSubmissionPattern = /const res = await window\.authFetch\(`\$\{FN_BASE\}\/orders`,\s*\{[^}]*method: 'POST'/;
    expect(htmlContent).toMatch(orderSubmissionPattern);
  });
  
  test('should use authFetch for products API', () => {
    const htmlContent = fs.readFileSync(
      path.join(__dirname, '../../oil-products.html'),
      'utf8'
    );
    
    // Verify products loading uses authFetch
    expect(htmlContent).toContain('window.authFetch(`${FN_BASE}/products`)');
  });
  
  test('should use authFetch for settings API', () => {
    const htmlContent = fs.readFileSync(
      path.join(__dirname, '../../oil-products.html'),
      'utf8'
    );
    
    // Verify settings loading uses authFetch
    expect(htmlContent).toContain('window.authFetch(`${FN_BASE}/settings`)');
  });
});

describe('Orders Review Authentication', () => {
  test('should use authFetch for orders listing', () => {
    const htmlContent = fs.readFileSync(
      path.join(__dirname, '../../orders-review.html'),
      'utf8'
    );
    
    // Verify orders listing uses authFetch
    expect(htmlContent).toContain('window.authFetch(`${FN_BASE}/orders`)');
  });
  
  test('should use authFetch for order status updates', () => {
    const htmlContent = fs.readFileSync(
      path.join(__dirname, '../../orders-review.html'),
      'utf8'
    );
    
    // Verify order updates use authFetch with PATCH method
    const patchPattern = /window\.authFetch\(`\$\{FN_BASE\}\/orders`,\s*\{[^}]*method: 'PATCH'/;
    expect(htmlContent).toMatch(patchPattern);
  });
});

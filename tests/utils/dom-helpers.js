// DOM testing utilities
const fs = require('fs');
const path = require('path');

/**
 * Load HTML file content for testing
 * @param {string} filename - HTML file name
 * @returns {string} File content
 */
function loadHTMLFile(filename) {
  const filePath = path.join(__dirname, '../../', filename);
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Create a mock DOM from HTML string
 * @param {string} html - HTML content
 * @returns {Document} Mock document
 */
function createMockDOM(html) {
  document.body.innerHTML = html;
  return document;
}

/**
 * Simulate click event on element
 * @param {Element} element - DOM element
 */
function simulateClick(element) {
  const event = new Event('click', { bubbles: true });
  element.dispatchEvent(event);
}

/**
 * Simulate form submission
 * @param {Element} form - Form element
 */
function simulateSubmit(form) {
  const event = new Event('submit', { bubbles: true });
  event.preventDefault = jest.fn();
  form.dispatchEvent(event);
}

/**
 * Wait for async operations to complete
 * @param {number} ms - Milliseconds to wait
 */
function waitFor(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if element has specific CSS class
 * @param {Element} element - DOM element
 * @param {string} className - CSS class name
 * @returns {boolean}
 */
function hasClass(element, className) {
  return element && element.classList && element.classList.contains(className);
}

module.exports = {
  loadHTMLFile,
  createMockDOM,
  simulateClick,
  simulateSubmit,
  waitFor,
  hasClass
};

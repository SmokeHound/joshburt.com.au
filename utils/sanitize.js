// Input sanitization and validation utilities
/* eslint-disable indent */

/**
 * Sanitize string input by removing dangerous characters
 * @param {string} input - Input string to sanitize
 * @param {object} options - Sanitization options
 * @returns {string} - Sanitized string
 */
function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Trim whitespace
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters (except newlines and tabs if allowed)
  if (options.allowNewlines) {
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  }

  // Remove HTML tags if specified
  if (options.stripHtml) {
    // Use a loop to handle nested or incomplete tags
    let prevLength;
    do {
      prevLength = sanitized.length;
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    } while (sanitized.length !== prevLength);
  }

  // Escape HTML entities if specified
  if (options.escapeHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Maximum length
  if (options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Validate email address
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }

  // Basic email regex (RFC 5322 simplified)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @param {object} options - Validation options { allowedProtocols: ['http', 'https'] }
 * @returns {boolean} - True if valid
 */
function isValidURL(url, options = {}) {
  if (typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    const allowedProtocols = options.allowedProtocols || ['http:', 'https:'];

    return allowedProtocols.includes(parsed.protocol);
  } catch (e) {
    return false;
  }
}

/**
 * Validate integer
 * @param {any} value - Value to validate
 * @param {object} options - Validation options { min, max }
 * @returns {boolean} - True if valid
 */
function isValidInteger(value, options = {}) {
  const num = Number(value);

  if (isNaN(num) || !Number.isInteger(num)) {
    return false;
  }

  if (options.min !== undefined && num < options.min) {
    return false;
  }

  if (options.max !== undefined && num > options.max) {
    return false;
  }

  return true;
}

/**
 * Sanitize and validate object based on schema
 * @param {object} input - Input object to validate
 * @param {object} schema - Validation schema
 * @returns {object} - { valid: boolean, data: object, errors: array }
 */
function validateObject(input, schema) {
  if (typeof input !== 'object' || input === null) {
    return {
      valid: false,
      data: null,
      errors: ['Input must be an object']
    };
  }

  const result = {};
  const errors = [];

  for (const [key, rules] of Object.entries(schema)) {
    const value = input[key];

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${key} is required`);
      continue;
    }

    // Skip if not required and not present
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${key} must be a string`);
          continue;
        }
        result[key] = sanitizeString(value, rules.sanitize || {});

        // Additional string validations
        if (rules.minLength && result[key].length < rules.minLength) {
          errors.push(`${key} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && result[key].length > rules.maxLength) {
          errors.push(`${key} must be at most ${rules.maxLength} characters`);
        }
        if (rules.pattern && !rules.pattern.test(result[key])) {
          errors.push(`${key} has invalid format`);
        }
        break;

      case 'email':
        if (!isValidEmail(value)) {
          errors.push(`${key} must be a valid email address`);
          continue;
        }
        result[key] = sanitizeString(value, { trim: true, maxLength: 254 }).toLowerCase();
        break;

      case 'integer':
        if (!isValidInteger(value, rules)) {
          errors.push(`${key} must be a valid integer`);
          continue;
        }
        result[key] = parseInt(value, 10);
        break;

      case 'boolean':
        result[key] = Boolean(value);
        break;

      case 'url':
        if (!isValidURL(value, rules)) {
          errors.push(`${key} must be a valid URL`);
          continue;
        }
        result[key] = sanitizeString(value, { trim: true });
        break;

      default:
        result[key] = value;
    }

    // Custom validator
    if (rules.validator && !rules.validator(result[key])) {
      errors.push(`${key} failed custom validation`);
    }
  }

  return {
    valid: errors.length === 0,
    data: result,
    errors
  };
}

/**
 * Prevent SQL injection by validating SQL-safe strings
 * @param {string} input - Input string
 * @returns {boolean} - True if safe
 */
function isSQLSafe(input) {
  if (typeof input !== 'string') {
    return false;
  }

  // Check for common SQL injection patterns
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|\/\*|\*\/|;)/,
    /(\bOR\b|\bAND\b).*=.*\1/i,
    /(['"])\s*(OR|AND)\s*\1/i,
    /['"].*['"].*=/i
  ];

  return !sqlInjectionPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize filename to prevent directory traversal
 * @param {string} filename - Filename to sanitize
 * @returns {string} - Safe filename
 */
function sanitizeFilename(filename) {
  if (typeof filename !== 'string') {
    return '';
  }

  // Remove directory traversal patterns
  let safe = filename.replace(/\.\./g, '');

  // Remove path separators
  safe = safe.replace(/[/\\]/g, '');

  // Remove null bytes
  safe = safe.replace(/\0/g, '');

  // Allow only alphanumeric, dash, underscore, and dot
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '');

  return safe;
}

module.exports = {
  sanitizeString,
  isValidEmail,
  isValidURL,
  isValidInteger,
  validateObject,
  isSQLSafe,
  sanitizeFilename
};

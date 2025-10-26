// Password validation utilities

/**
 * Password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*(),.?":{}|<>]/
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validatePassword(password) {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }
  
  if (!PASSWORD_REGEX.uppercase.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!PASSWORD_REGEX.lowercase.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!PASSWORD_REGEX.number.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!PASSWORD_REGEX.special.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get password requirements as a user-friendly message
 * @returns {string} - Password requirements message
 */
function getPasswordRequirements() {
  return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.`;
}

module.exports = {
  validatePassword,
  getPasswordRequirements,
  PASSWORD_MIN_LENGTH
};

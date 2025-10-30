// Two-Factor Authentication (2FA) utilities using TOTP
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const nodeCrypto = require('crypto');

/**
 * Generate a TOTP secret for a user
 * @param {string} email - User's email address
 * @param {string} issuer - Issuer name (e.g., "JoshBurt.com.au")
 * @returns {object} - { secret: string, otpauthUrl: string }
 */
function generateTOTPSecret(email, issuer = 'JoshBurt.com.au') {
  const secret = speakeasy.generateSecret({
    name: `${issuer} (${email})`,
    issuer: issuer,
    length: 32
  });
  
  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url
  };
}

/**
 * Verify a TOTP token
 * @param {string} token - 6-digit TOTP token
 * @param {string} secret - Base32-encoded secret
 * @param {object} options - Verification options { window: number }
 * @returns {boolean} - True if token is valid
 */
function verifyTOTPToken(token, secret, options = {}) {
  if (!token || !secret) {
    return false;
  }
  
  try {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: options.window || 1 // Allow 1 time step before/after for clock drift
    });
  } catch (e) {
    console.error('TOTP verification error:', e);
    return false;
  }
}

/**
 * Generate QR code data URL for TOTP setup
 * @param {string} otpauthUrl - OTPAuth URL from generateTOTPSecret
 * @returns {Promise<string>} - Data URL for QR code image
 */
async function generateQRCode(otpauthUrl) {
  try {
    return await QRCode.toDataURL(otpauthUrl, {
      width: 300,
      margin: 2
    });
  } catch (e) {
    console.error('QR code generation error:', e);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate backup codes for 2FA recovery
 * @param {number} count - Number of backup codes to generate (default: 10)
 * @returns {string[]} - Array of backup codes
 */
function generateBackupCodes(count = 10) {
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = nodeCrypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  
  return codes;
}

/**
 * Hash a backup code for storage
 * @param {string} code - Backup code to hash
 * @returns {string} - SHA256 hash of the code
 */
function hashBackupCode(code) {
  return nodeCrypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify a backup code
 * @param {string} code - Backup code to verify
 * @param {string[]} hashedCodes - Array of hashed backup codes
 * @returns {object} - { valid: boolean, remainingCodes: string[] }
 */
function verifyBackupCode(code, hashedCodes) {
  if (!code || !Array.isArray(hashedCodes)) {
    return { valid: false, remainingCodes: hashedCodes };
  }
  
  const codeHash = hashBackupCode(code);
  const index = hashedCodes.indexOf(codeHash);
  
  if (index === -1) {
    return { valid: false, remainingCodes: hashedCodes };
  }
  
  // Remove used backup code
  const remainingCodes = [...hashedCodes];
  remainingCodes.splice(index, 1);
  
  return {
    valid: true,
    remainingCodes
  };
}

/**
 * Store backup codes in database format (JSON string of hashed codes)
 * @param {string[]} codes - Plain text backup codes
 * @returns {string} - JSON string of hashed codes for storage
 */
function prepareBackupCodesForStorage(codes) {
  const hashedCodes = codes.map(code => hashBackupCode(code));
  return JSON.stringify(hashedCodes);
}

/**
 * Parse backup codes from database storage
 * @param {string} storedCodes - JSON string of hashed codes from database
 * @returns {string[]} - Array of hashed codes
 */
function parseStoredBackupCodes(storedCodes) {
  if (!storedCodes) {
    return [];
  }
  
  try {
    const parsed = JSON.parse(storedCodes);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse backup codes:', e);
    return [];
  }
}

module.exports = {
  generateTOTPSecret,
  verifyTOTPToken,
  generateQRCode,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  prepareBackupCodesForStorage,
  parseStoredBackupCodes
};

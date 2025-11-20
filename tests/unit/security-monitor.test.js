/**
 * Tests for Security Monitoring Utilities
 * Part of Phase 6: Security Enhancements
 */

const {
  EVENT_TYPES,
  SEVERITY,
  detectSqlInjection,
  detectXss,
  getClientIp
} = require('../../utils/security-monitor');

describe('Security Monitor Utilities', () => {
  describe('EVENT_TYPES constant', () => {
    test('should have all required event types', () => {
      expect(EVENT_TYPES.SUSPICIOUS_LOGIN).toBe('suspicious_login');
      expect(EVENT_TYPES.BRUTE_FORCE).toBe('brute_force');
      expect(EVENT_TYPES.UNAUTHORIZED_ACCESS).toBe('unauthorized_access');
      expect(EVENT_TYPES.RATE_LIMIT_EXCEEDED).toBe('rate_limit_exceeded');
      expect(EVENT_TYPES.SQL_INJECTION_ATTEMPT).toBe('sql_injection_attempt');
      expect(EVENT_TYPES.XSS_ATTEMPT).toBe('xss_attempt');
      expect(EVENT_TYPES.INVALID_TOKEN).toBe('invalid_token');
      expect(EVENT_TYPES.SESSION_HIJACKING).toBe('session_hijacking');
      expect(EVENT_TYPES.IP_BLACKLISTED).toBe('ip_blacklisted');
      expect(EVENT_TYPES.UNUSUAL_ACTIVITY).toBe('unusual_activity');
    });
  });

  describe('SEVERITY constant', () => {
    test('should have all severity levels', () => {
      expect(SEVERITY.LOW).toBe('low');
      expect(SEVERITY.MEDIUM).toBe('medium');
      expect(SEVERITY.HIGH).toBe('high');
      expect(SEVERITY.CRITICAL).toBe('critical');
    });
  });

  describe('detectSqlInjection', () => {
    test('should detect SQL SELECT injection', () => {
      expect(detectSqlInjection("1' OR '1'='1")).toBe(true);
      expect(detectSqlInjection("admin' OR 1=1--")).toBe(true);
      expect(detectSqlInjection("'; DROP TABLE users;--")).toBe(true);
    });

    test('should detect UNION SELECT attacks', () => {
      expect(detectSqlInjection("1' UNION SELECT * FROM users--")).toBe(true);
      expect(detectSqlInjection('id=1 UNION SELECT password')).toBe(true);
    });

    test('should detect SQL comments', () => {
      expect(detectSqlInjection("admin'--")).toBe(true);
      expect(detectSqlInjection('value=1; /* comment */')).toBe(true);
    });

    test('should not flag normal input', () => {
      expect(detectSqlInjection('john.doe@example.com')).toBe(false);
      expect(detectSqlInjection('normal text')).toBe(false);
      expect(detectSqlInjection('123456')).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(detectSqlInjection(null)).toBe(false);
      expect(detectSqlInjection(undefined)).toBe(false);
    });

    test('should handle non-string input', () => {
      expect(detectSqlInjection(123)).toBe(false);
      expect(detectSqlInjection({})).toBe(false);
      expect(detectSqlInjection([])).toBe(false);
    });
  });

  describe('detectXss', () => {
    test('should detect script tags', () => {
      expect(detectXss('<script>alert("XSS")</script>')).toBe(true);
      expect(detectXss('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
      expect(detectXss('<script src="evil.js"></script>')).toBe(true);
    });

    test('should detect javascript: protocol', () => {
      expect(detectXss('javascript:alert(1)')).toBe(true);
      expect(detectXss('JAVASCRIPT:void(0)')).toBe(true);
    });

    test('should detect event handlers', () => {
      expect(detectXss('<img onerror="alert(1)">')).toBe(true);
      expect(detectXss('<body onload=alert(1)>')).toBe(true);
      expect(detectXss('<div onclick="malicious()">')).toBe(true);
    });

    test('should detect iframe injection', () => {
      expect(detectXss('<iframe src="evil.com"></iframe>')).toBe(true);
      expect(detectXss('<IFRAME>content</IFRAME>')).toBe(true);
    });

    test('should detect object and embed tags', () => {
      expect(detectXss('<object data="evil.swf"></object>')).toBe(true);
      expect(detectXss('<embed src="evil.swf">')).toBe(true);
    });

    test('should not flag normal HTML', () => {
      expect(detectXss('<p>Normal paragraph</p>')).toBe(false);
      expect(detectXss('<div class="container">content</div>')).toBe(false);
      expect(detectXss('plain text')).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(detectXss(null)).toBe(false);
      expect(detectXss(undefined)).toBe(false);
    });

    test('should handle non-string input', () => {
      expect(detectXss(123)).toBe(false);
      expect(detectXss({})).toBe(false);
      expect(detectXss([])).toBe(false);
    });
  });

  describe('getClientIp', () => {
    test('should extract IP from x-forwarded-for header', () => {
      const event = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1'
        }
      };
      expect(getClientIp(event)).toBe('203.0.113.1');
    });

    test('should extract IP from x-real-ip header', () => {
      const event = {
        headers: {
          'x-real-ip': '203.0.113.5'
        }
      };
      expect(getClientIp(event)).toBe('203.0.113.5');
    });

    test('should extract IP from client-ip header', () => {
      const event = {
        headers: {
          'client-ip': '203.0.113.10'
        }
      };
      expect(getClientIp(event)).toBe('203.0.113.10');
    });

    test('should return unknown for missing headers', () => {
      const event = { headers: {} };
      expect(getClientIp(event)).toBe('unknown');
    });

    test('should handle event without headers', () => {
      const event = {};
      expect(getClientIp(event)).toBe('unknown');
    });

    test('should prioritize x-forwarded-for', () => {
      const event = {
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'x-real-ip': '203.0.113.2',
          'client-ip': '203.0.113.3'
        }
      };
      expect(getClientIp(event)).toBe('203.0.113.1');
    });

    test('should trim whitespace from x-forwarded-for', () => {
      const event = {
        headers: {
          'x-forwarded-for': '  203.0.113.1  ,  198.51.100.1  '
        }
      };
      expect(getClientIp(event)).toBe('203.0.113.1');
    });
  });
});

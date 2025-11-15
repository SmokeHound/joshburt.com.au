// Unit tests for utils/logger.js

// Mock dependencies
jest.mock('../../config/database', () => ({
  connect: jest.fn(),
  query: jest.fn(),
  getClient: jest.fn(),
  DB_TYPE: 'postgres'
}));

const {
  Logger,
  createLogger,
  generateCorrelationId,
  getCorrelationId,
  LOG_LEVELS
} = require('../../utils/logger');

describe('Logger Utilities', () => {
  // Store original console methods
  let originalConsoleLog;

  beforeAll(() => {
    originalConsoleLog = console.log;
    console.log = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  beforeEach(() => {
    console.log.mockClear();
  });

  describe('LOG_LEVELS constant', () => {
    test('should define all log levels', () => {
      expect(LOG_LEVELS.ERROR).toBe('error');
      expect(LOG_LEVELS.WARN).toBe('warn');
      expect(LOG_LEVELS.INFO).toBe('info');
      expect(LOG_LEVELS.DEBUG).toBe('debug');
    });
  });

  describe('generateCorrelationId', () => {
    test('should generate a unique correlation ID', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
    });

    test('should include timestamp component', () => {
      const id = generateCorrelationId();
      const timestamp = id.split('-')[0];
      expect(parseInt(timestamp)).toBeGreaterThan(0);
    });
  });

  describe('getCorrelationId', () => {
    test('should extract correlation ID from event headers', () => {
      const correlationId = 'test-correlation-id';
      const event = {
        headers: { 'x-correlation-id': correlationId }
      };

      expect(getCorrelationId(event)).toBe(correlationId);
    });

    test('should handle case-insensitive header name', () => {
      const correlationId = 'test-correlation-id';
      const event = {
        headers: { 'X-Correlation-ID': correlationId }
      };

      expect(getCorrelationId(event)).toBe(correlationId);
    });

    test('should generate new ID if not present in headers', () => {
      const event = { headers: {} };
      const id = getCorrelationId(event);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    test('should handle missing headers', () => {
      const event = {};
      const id = getCorrelationId(event);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });
  });

  describe('Logger class', () => {
    test('should create logger with correlation ID', () => {
      const logger = new Logger('test-id');
      expect(logger.correlationId).toBe('test-id');
    });

    test('should generate correlation ID if not provided', () => {
      const logger = new Logger();
      expect(logger.correlationId).toBeDefined();
      expect(typeof logger.correlationId).toBe('string');
    });

    test('should store context', () => {
      const context = { userId: 123, action: 'test' };
      const logger = new Logger('test-id', context);

      expect(logger.context).toEqual(context);
    });

    test('should log error messages', () => {
      const logger = new Logger('test-id');
      logger.error('Test error', { detail: 'error detail' });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('error'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test error'));
    });

    test('should log warning messages', () => {
      const logger = new Logger('test-id');
      logger.warn('Test warning');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('warn'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test warning'));
    });

    test('should log info messages', () => {
      const logger = new Logger('test-id');
      logger.info('Test info');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('info'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test info'));
    });

    test('should include correlation ID in logs', () => {
      const correlationId = 'test-correlation-123';
      const logger = new Logger(correlationId);
      logger.info('Test message');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(correlationId));
    });

    test('should include context in logs', () => {
      const context = { userId: 123 };
      const logger = new Logger('test-id', context);
      logger.info('Test message');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('userId'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('123'));
    });

    test('should create child logger with additional context', () => {
      const logger = new Logger('test-id', { userId: 123 });
      const childLogger = logger.child({ action: 'test-action' });

      expect(childLogger.correlationId).toBe(logger.correlationId);
      expect(childLogger.context).toEqual({
        userId: 123,
        action: 'test-action'
      });
    });

    test('should log timing information', () => {
      const logger = new Logger('test-id');
      const startTime = Date.now() - 100; // 100ms ago
      logger.logTiming('testFunction', startTime);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('testFunction'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('durationMs'));
    });

    test('should sanitize authorization headers', () => {
      const logger = new Logger('test-id');
      const headers = {
        authorization: 'Bearer secret-token',
        'content-type': 'application/json'
      };

      const sanitized = logger.sanitizeHeaders(headers);

      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized['content-type']).toBe('application/json');
    });

    test('should sanitize cookie headers', () => {
      const logger = new Logger('test-id');
      const headers = {
        cookie: 'session=secret',
        'user-agent': 'Mozilla/5.0'
      };

      const sanitized = logger.sanitizeHeaders(headers);

      expect(sanitized.cookie).toBe('[REDACTED]');
      expect(sanitized['user-agent']).toBe('Mozilla/5.0');
    });

    test('should log HTTP request', () => {
      const logger = new Logger('test-id');
      const event = {
        httpMethod: 'POST',
        path: '/api/test',
        queryStringParameters: { id: '123' },
        headers: { authorization: 'Bearer token' }
      };

      logger.logRequest(event);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('POST'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/api/test'));
    });

    test('should log HTTP response', () => {
      const logger = new Logger('test-id');
      logger.logResponse(200, { duration: 50 });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('200'));
    });

    test('should only log debug messages when DEBUG is set', () => {
      const originalDebug = process.env.DEBUG;
      delete process.env.DEBUG;

      const logger = new Logger('test-id');
      logger.debug('Debug message');

      expect(console.log).not.toHaveBeenCalled();

      process.env.DEBUG = 'true';
      logger.debug('Debug message');

      expect(console.log).toHaveBeenCalled();

      // Restore
      if (originalDebug) {
        process.env.DEBUG = originalDebug;
      } else {
        delete process.env.DEBUG;
      }
    });
  });

  describe('createLogger', () => {
    test('should create logger from event', () => {
      const event = {
        headers: { 'x-correlation-id': 'test-id' }
      };
      const context = {
        requestId: 'req-123',
        functionName: 'testFunction'
      };

      const logger = createLogger(event, context);

      expect(logger).toBeInstanceOf(Logger);
      expect(logger.correlationId).toBe('test-id');
      expect(logger.context.requestId).toBe('req-123');
      expect(logger.context.functionName).toBe('testFunction');
    });

    test('should handle missing context', () => {
      const event = { headers: {} };
      const logger = createLogger(event);

      expect(logger).toBeInstanceOf(Logger);
      expect(logger.correlationId).toBeDefined();
    });
  });
});

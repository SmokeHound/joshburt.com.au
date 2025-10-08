const request = require('supertest');

// Use server.js and make sure it doesn't start a real server in test mode
process.env.NODE_ENV = 'test';
const app = require('../server.js.delete');

/**
 * Authentication & User Management API Tests
 * Notes:
 * - Updated to remove deprecated 'manager' role assumptions.
 * - Ensure your seed data includes:
 *   admin@joshburt.com.au / admin123!
 * - Adjust emails/passwords to match actual seed values if different.
 */

describe('Authentication API', () => {
  let testUserToken;
  let testAdminToken;

  // Registration
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'testuser@test.com',
        password: 'TestPassword123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.email).toBe(userData.email);
      expect(response.body.name).toBe(userData.name);
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'testuser@test.com',
        password: 'TestPassword123!',
        name: 'Test User 2'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe('User already exists with this email');
    });

    it('should reject weak password', async () => {
      const userData = {
        email: 'weak@test.com',
        password: 'weak',
        name: 'Weak User' // Too short / too weak
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  // Login
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'testuser@test.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();

      testUserToken = response.body.accessToken;
    });

    it('should login admin user', async () => {
      const loginData = {
        email: 'admin@joshburt.com.au',
        password: 'admin123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.user.role).toBe('admin');
      testAdminToken = response.body.accessToken;
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  // Token validation
  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.user.email).toBe('testuser@test.com');
      expect(response.body.user.name).toBe('Test User');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  // Logout
  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.message).toBeDefined();
    });
  });

  // Password reset
  describe('Password Reset Flow', () => {
    it('should accept password reset request for existing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'testuser@test.com' })
        .expect(200);

      expect(response.body.message).toContain('reset link');
    });

    it('should accept password reset request for non-existent email (no user enumeration)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      expect(response.body.message).toContain('reset link');
    });
  });
});

describe('User Management API', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    // Admin login
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@joshburt.com.au',
        password: 'admin123!'
      });
    adminToken = adminLogin.body.accessToken;

    // Regular user login (previously registered)
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@test.com',
        password: 'TestPassword123!'
      });
    userToken = userLogin.body.accessToken;
  });

  describe('GET /api/users', () => {
    it('should allow admin to list users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should deny regular user access to user list', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/users', () => {
    it('should allow admin to create user with supported role', async () => {
      const userData = {
        email: 'newadminuser@test.com',
        password: 'NewPassword123!',
        name: 'New Admin User',
        role: 'admin' // manager removed → escalate old manager users via migration
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.message).toBeDefined();
      expect(response.body.user.role).toBe('admin');
    });

    it('should deny regular user from creating users', async () => {
      const userData = {
        email: 'blocked@test.com',
        password: 'Password123!',
        name: 'Blocked User'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(userData)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });
});

describe('Rate Limiting', () => {
  it('should rate limit repeated failed login attempts', async () => {
    const loginData = {
      email: 'ratelimit@test.com',
      password: 'wrongpassword'
    };

    // 5 attempts (assuming 6th triggers rate limit)
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send(loginData);
    }

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(429);

    expect(response.body.error).toMatch(/Too many/i);
  }, 10000);
});

describe('API Health Check', () => {
  it('should return healthy status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
    expect(response.body.environment).toBeDefined();
  });
});
const request = require('supertest');
const app = require('../server');

describe('Authentication API', () => {
  let testUserToken;
  let testAdminToken;

  // Test user registration
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
        name: 'Weak User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  // Test user login
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
      const loginData = {
        email: 'testuser@test.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  // Test token validation
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

      expect(response.body.error).toBe('Access token required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  // Test logout
  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  // Test password reset flow
  describe('Password Reset Flow', () => {
    it('should accept password reset request', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'testuser@test.com' })
        .expect(200);

      expect(response.body.message).toContain('reset link has been sent');
    });

    it('should accept password reset request for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      expect(response.body.message).toContain('reset link has been sent');
    });
  });
});

describe('User Management API', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    // Login as admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@joshburt.com.au',
        password: 'admin123!'
      });
    adminToken = adminLogin.body.accessToken;

    // Login as regular user
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password'
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

      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('POST /api/users', () => {
    it('should allow admin to create user', async () => {
      const userData = {
        email: 'newadminuser@test.com',
        password: 'NewPassword123!',
        name: 'New Admin User',
        role: 'manager'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User created successfully');
      expect(response.body.user.role).toBe('manager');
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

      expect(response.body.error).toBe('Insufficient permissions');
    });
  });
});

describe('Rate Limiting', () => {
  it('should rate limit login attempts', async () => {
    const loginData = {
      email: 'ratelimit@test.com',
      password: 'wrongpassword'
    };

    // Make multiple failed login attempts
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/auth/login')
        .send(loginData);
    }

    // The 6th attempt should be rate limited
    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(429);

    expect(response.body.error).toContain('Too many');
  }, 10000);
});

describe('API Health Check', () => {
  it('should return healthy status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
    expect(response.body.environment).toBe('test');
  });
});
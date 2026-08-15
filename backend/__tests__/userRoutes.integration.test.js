/**
 * backend/__tests__/userRoutes.integration.test.js
 *
 * Integration tests for /users routes using supertest.
 *
 * Strategy: mock the CONTROLLERS directly (not the models).
 * This is more reliable than mocking deep dependencies like Mongoose models,
 * because it avoids the entire import chain (model → mongoose → schema → statics).
 * Route-level integration tests should verify that routes call the right controllers
 * with the right args and return the right HTTP responses — not implementation details.
 */

import request from 'supertest';
import express from 'express';

// ─── Mock controllers at the controller level ─────────────────────────────────
// This is the cleanest approach: mock the boundary the route uses directly.

jest.mock('../Controllers/userController.js', () => ({
  registerUser: jest.fn((req, res) =>
    res.status(201).json({ message: 'User registered successfully', token: 'mock.jwt.token', resumes: [] })
  ),
  loginUser: jest.fn((req, res) =>
    res.status(200).json({ message: 'User logged in successfully', token: 'mock.jwt.token', resumes: [] })
  ),
  googleLogin: jest.fn((req, res) =>
    res.status(200).json({ message: 'User logged in successfully', token: 'mock.jwt.token', resumes: [] })
  ),
  renewToken: jest.fn((req, res) =>
    res.status(200).json({ message: 'Token renewed successfully', token: 'mock.jwt.token' })
  ),
  getUserProfile: jest.fn((req, res) =>
    res.status(200).json({ name: 'Test User', profilePic: 'https://cdn.example.com/avatar.jpg' })
  ),
  updateUserProfile: jest.fn((req, res) =>
    res.status(200).json({ message: 'Profile updated successfully' })
  ),
  updatePassword: jest.fn((req, res) =>
    res.status(200).json({ message: 'Password updated successfully' })
  ),
}));

jest.mock('../Controllers/ResumeDataController.js', () => ({
  getAllResumes: jest.fn((req, res) => res.status(200).json({ resumes: [] })),
  fetchResumesForUser: jest.fn().mockResolvedValue([]),
}));

jest.mock('../Controllers/imageUpload.js', () => ({
  imageUpload: jest.fn((req, res) =>
    res.status(200).json({ message: 'Image uploaded', url: 'https://cdn.example.com/img.jpg' })
  ),
}));

jest.mock('multer', () => {
  const multer = () => ({ single: () => (req, res, next) => next() });
  multer.memoryStorage = jest.fn();
  return multer;
});

// Auth middleware: inject a test email on authenticated routes
jest.mock('../middleware/AuthenticationMIddleware.js', () =>
  jest.fn((req, res, next) => {
    req.email = 'test@example.com';
    next();
  })
);

// ─── Static imports (resolved AFTER mocks are registered) ────────────────────
import userRoute from '../Routes/userRoute.js';

// ─── Get live mock references for per-test overrides ─────────────────────────
const {
  registerUser,
  loginUser,
  renewToken,
  getUserProfile,
} = jest.requireMock('../Controllers/userController.js');

const authMiddleware = jest.requireMock('../middleware/AuthenticationMIddleware.js');

// ─── Build test app ───────────────────────────────────────────────────────────
const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/users', userRoute);
  return app;
};

// ─────────────────────────────────────────────────────────────────────────────

describe('/users Routes — Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply default implementations after clearAllMocks clears call history
    registerUser.mockImplementation((req, res) =>
      res.status(201).json({ message: 'User registered successfully', token: 'mock.jwt.token', resumes: [] })
    );
    loginUser.mockImplementation((req, res) =>
      res.status(200).json({ message: 'User logged in successfully', token: 'mock.jwt.token', resumes: [] })
    );
    renewToken.mockImplementation((req, res) =>
      res.status(200).json({ message: 'Token renewed successfully', token: 'mock.jwt.token' })
    );
    getUserProfile.mockImplementation((req, res) =>
      res.status(200).json({ name: 'Test User', profilePic: 'https://cdn.example.com/avatar.jpg' })
    );
    authMiddleware.mockImplementation((req, res, next) => {
      req.email = 'test@example.com';
      next();
    });
  });

  // ── POST /users/register ───────────────────────────────────────────────────
  describe('POST /users/register', () => {
    it('returns 201 with token and resumes on successful registration', async () => {
      const res = await request(app).post('/users/register').send({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'SecurePass1!',
        role: 'user',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token', 'mock.jwt.token');
      expect(res.body).toHaveProperty('message', 'User registered successfully');
      expect(registerUser).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when registration fails', async () => {
      registerUser.mockImplementationOnce((req, res) =>
        res.status(400).json({ message: 'Email already exists' })
      );

      const res = await request(app).post('/users/register').send({
        name: 'Bob',
        email: 'existing@example.com',
        password: 'pass',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Email already exists');
    });
  });

  // ── POST /users/login ──────────────────────────────────────────────────────
  describe('POST /users/login', () => {
    it('returns 200 with token and resumes on successful login', async () => {
      const res = await request(app).post('/users/login').send({
        email: 'alice@example.com',
        password: 'SecurePass1!',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token', 'mock.jwt.token');
      expect(res.body).toHaveProperty('message', 'User logged in successfully');
      expect(loginUser).toHaveBeenCalledTimes(1);
    });

    it('returns 401 when credentials are invalid', async () => {
      loginUser.mockImplementationOnce((req, res) =>
        res.status(401).json({ message: 'Invalid credentials' })
      );

      const res = await request(app).post('/users/login').send({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message', 'Invalid credentials');
    });
  });

  // ── POST /users/renew-token ────────────────────────────────────────────────
  describe('POST /users/renew-token', () => {
    it('returns 200 with a new token when the current token is valid', async () => {
      const res = await request(app)
        .post('/users/renew-token')
        .set('Authorization', 'Bearer valid.token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token', 'mock.jwt.token');
      expect(res.body).toHaveProperty('message', 'Token renewed successfully');
    });

    it('returns 401 when auth fails', async () => {
      renewToken.mockImplementationOnce((req, res) =>
        res.status(401).json({ message: 'Authorization token is required' })
      );

      const res = await request(app).post('/users/renew-token');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /users/profile ─────────────────────────────────────────────────────
  describe('GET /users/profile', () => {
    it('returns 200 with user name and profilePic for authenticated requests', async () => {
      const res = await request(app)
        .get('/users/profile')
        .set('Authorization', 'Bearer valid.token');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        name: 'Test User',
        profilePic: 'https://cdn.example.com/avatar.jpg',
      });
      expect(getUserProfile).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when user is not found', async () => {
      getUserProfile.mockImplementationOnce((req, res) =>
        res.status(404).json({ message: 'User not found' })
      );

      const res = await request(app)
        .get('/users/profile')
        .set('Authorization', 'Bearer valid.token');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message', 'User not found');
    });

    it('returns 401 when auth middleware rejects', async () => {
      authMiddleware.mockImplementationOnce((req, res) =>
        res.status(401).json({ error: 'Access Denied' })
      );

      const res = await request(app).get('/users/profile');

      expect(res.status).toBe(401);
      expect(getUserProfile).not.toHaveBeenCalled();
    });
  });
});

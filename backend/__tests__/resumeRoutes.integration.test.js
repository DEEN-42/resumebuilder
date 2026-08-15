/**
 * backend/__tests__/resumeRoutes.integration.test.js
 *
 * Integration tests for /resumes routes using supertest.
 * All Mongoose models, auth middleware, and external services are mocked.
 *
 * Tests validate: CRUD operation responses, auth protection,
 * and sharing functionality.
 */

import request from 'supertest';
import express from 'express';

// ─── Mock all dependencies BEFORE importing routes ────────────────────────────

// Mock the ResumeDataController — each function is independently mockable
jest.mock('../Controllers/ResumeDataController.js', () => ({
  createResume: jest.fn((req, res) =>
    res.status(201).json({ message: 'Resume created', resume: { _id: 'r1', title: 'New Resume' } })
  ),
  getAllResumes: jest.fn((req, res) =>
    res.status(200).json({ resumes: [{ _id: 'r1', title: 'Resume 1' }] })
  ),
  getSharedList: jest.fn((req, res) =>
    res.status(200).json({ sharedWith: ['collab@example.com'] })
  ),
  shareResume: jest.fn((req, res) =>
    res.status(200).json({ message: 'Resume shared successfully' })
  ),
  unshareResume: jest.fn((req, res) =>
    res.status(200).json({ message: 'Resume unshared successfully' })
  ),
  deleteResume: jest.fn((req, res) =>
    res.status(200).json({ message: 'Resume deleted successfully' })
  ),
  loadResumeSocket: jest.fn((req, res) =>
    res.status(200).json({ resume: { _id: 'r1', data: {} } })
  ),
  updateResumeSocket: jest.fn((req, res) =>
    res.status(200).json({ message: 'Resume updated' })
  ),
  fetchResumesForUser: jest.fn().mockResolvedValue([]),
}));

// Mock imageUpload controller
jest.mock('../Controllers/imageUpload.js', () => ({
  imageUpload: jest.fn((req, res) =>
    res.status(200).json({ url: 'https://cdn.example.com/image.jpg' })
  ),
}));

// Mock multer
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req, res, next) => next(),
  });
  multer.memoryStorage = jest.fn();
  return multer;
});

// Mock auth middleware — inject a default test email on all requests
const mockAuthMiddleware = jest.fn((req, res, next) => {
  req.email = 'test@example.com';
  next();
});
jest.mock('../middleware/AuthenticationMIddleware.js', () => mockAuthMiddleware);

// ─── Build test app ───────────────────────────────────────────────────────────
const buildApp = async () => {
  const { default: resumeRoute } = await import('../Routes/resumeRoutes.js');
  const app = express();
  app.use(express.json());
  app.use('/resumes', resumeRoute);
  return app;
};

// ─────────────────────────────────────────────────────────────────────────────
import {
  createResume,
  getAllResumes,
  deleteResume,
  shareResume,
  unshareResume,
  getSharedList,
} from '../Controllers/ResumeDataController.js';

describe('/resumes Routes — Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore default mock implementations after clearAllMocks
    createResume.mockImplementation((req, res) =>
      res.status(201).json({ message: 'Resume created', resume: { _id: 'r1', title: 'New Resume' } })
    );
    getAllResumes.mockImplementation((req, res) =>
      res.status(200).json({ resumes: [{ _id: 'r1', title: 'Resume 1' }] })
    );
    deleteResume.mockImplementation((req, res) =>
      res.status(200).json({ message: 'Resume deleted successfully' })
    );
    shareResume.mockImplementation((req, res) =>
      res.status(200).json({ message: 'Resume shared successfully' })
    );
    unshareResume.mockImplementation((req, res) =>
      res.status(200).json({ message: 'Resume unshared successfully' })
    );
    getSharedList.mockImplementation((req, res) =>
      res.status(200).json({ sharedWith: ['collab@example.com'] })
    );
    mockAuthMiddleware.mockImplementation((req, res, next) => {
      req.email = 'test@example.com';
      next();
    });
  });

  // ── GET /resumes/list ──────────────────────────────────────────────────────
  describe('GET /resumes/list', () => {
    it('returns 200 with an array of resumes for authenticated requests', async () => {
      const res = await request(app)
        .get('/resumes/list')
        .set('Authorization', 'Bearer valid.token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('resumes');
      expect(Array.isArray(res.body.resumes)).toBe(true);
    });

    it('calls the auth middleware before the controller', async () => {
      await request(app)
        .get('/resumes/list')
        .set('Authorization', 'Bearer valid.token');

      expect(mockAuthMiddleware).toHaveBeenCalledTimes(1);
      expect(getAllResumes).toHaveBeenCalledTimes(1);
    });

    it('returns 401 when auth middleware rejects the request', async () => {
      mockAuthMiddleware.mockImplementationOnce((req, res) => {
        res.status(401).json({ error: 'Access Denied' });
      });

      const res = await request(app).get('/resumes/list');

      expect(res.status).toBe(401);
      expect(getAllResumes).not.toHaveBeenCalled();
    });
  });

  // ── POST /resumes/create ───────────────────────────────────────────────────
  describe('POST /resumes/create', () => {
    it('returns 201 with the created resume object', async () => {
      const res = await request(app)
        .post('/resumes/create')
        .set('Authorization', 'Bearer valid.token')
        .send({ title: 'Software Engineer Resume', template: 'modern' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Resume created');
      expect(res.body.resume).toHaveProperty('_id', 'r1');
    });

    it('blocks unauthenticated requests', async () => {
      mockAuthMiddleware.mockImplementationOnce((req, res) => {
        res.status(401).json({ error: 'Access Denied' });
      });

      const res = await request(app).post('/resumes/create').send({ title: 'Test' });

      expect(res.status).toBe(401);
      expect(createResume).not.toHaveBeenCalled();
    });
  });

  // ── DELETE /resumes/delete/:id ─────────────────────────────────────────────
  describe('DELETE /resumes/delete/:id', () => {
    it('returns 200 and success message when resume is deleted', async () => {
      const res = await request(app)
        .delete('/resumes/delete/r1')
        .set('Authorization', 'Bearer valid.token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Resume deleted successfully');
    });

    it('passes the route param :id to the controller', async () => {
      deleteResume.mockImplementationOnce((req, res) => {
        res.status(200).json({ deleted: req.params.id });
      });

      const res = await request(app)
        .delete('/resumes/delete/abc-123')
        .set('Authorization', 'Bearer valid.token');

      expect(res.body.deleted).toBe('abc-123');
    });
  });

  // ── PUT /resumes/share/:id ─────────────────────────────────────────────────
  describe('PUT /resumes/share/:id', () => {
    it('returns 200 when a resume is shared successfully', async () => {
      const res = await request(app)
        .put('/resumes/share/r1')
        .set('Authorization', 'Bearer valid.token')
        .send({ email: 'collab@example.com' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Resume shared successfully');
    });
  });

  // ── PUT /resumes/unshare/:id ───────────────────────────────────────────────
  describe('PUT /resumes/unshare/:id', () => {
    it('returns 200 when a resume is unshared successfully', async () => {
      const res = await request(app)
        .put('/resumes/unshare/r1')
        .set('Authorization', 'Bearer valid.token')
        .send({ email: 'collab@example.com' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Resume unshared successfully');
    });
  });

  // ── GET /resumes/share/:id/sharelist ──────────────────────────────────────
  describe('GET /resumes/share/:id/sharelist', () => {
    it('returns 200 with a list of collaborators', async () => {
      const res = await request(app)
        .get('/resumes/share/r1/sharelist')
        .set('Authorization', 'Bearer valid.token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sharedWith');
      expect(Array.isArray(res.body.sharedWith)).toBe(true);
    });
  });
});

/**
 * backend/app.js
 *
 * Testable Express application factory.
 * Exports createApp() which wires up middleware and routes WITHOUT:
 *  - Connecting to MongoDB
 *  - Connecting to Redis
 *  - Starting BullMQ workers
 *  - Creating the HTTP server
 *
 * index.js remains the production entry-point that calls createApp()
 * and then starts the server + background services.
 * Tests import createApp() directly and can mock dependencies at module level.
 */

import express from 'express';
import cors from 'cors';
import userRoute from './Routes/userRoute.js';
import resumeRoute from './Routes/resumeRoutes.js';
import aiRoutes from './Routes/aiRoutes.js';
import deployRoute from './Routes/deployRoute.js';

/**
 * Creates and returns a configured Express application.
 * Does NOT start listening — call server.listen() separately.
 * @returns {import('express').Application}
 */
export function createApp() {
  const app = express();

  // ─── CORS ────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    })
  );

  // ─── Body Parsing ─────────────────────────────────────────────────────────
  app.use(express.json());

  // ─── Health Check (useful for uptime monitoring on Render) ────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── Routes ───────────────────────────────────────────────────────────────
  app.use('/users', userRoute);
  app.use('/resumes', resumeRoute);
  app.use('/ai', aiRoutes);
  app.use('/deploy', deployRoute);

  // ─── 404 Catch-all ────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  return app;
}

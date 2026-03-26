import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
dotenv.config();
import { connectToDatabase } from "./db.js";
import { socketAuth } from "./middleware/socketAuth.js";
import { handleSocketConnection } from "./socket/socketHandlers.js";
import userRoute from "./Routes/userRoute.js";
import resumeRoute from "./Routes/resumeRoutes.js";
import aiRoutes from "./Routes/aiRoutes.js";
import deployRoute from "./Routes/deployRoute.js";
import { setupYjsWSServer } from "./crdt/WSServer.js";
import { startPersistenceWorker } from "./crdt/persistenceWorker.js";
import { startPersistenceScheduler } from "./crdt/persistenceScheduler.js";
import { startDeployWorker } from "./jobs/deployWorker.js";
import { initDeployQueue } from "./Controllers/deployController.js";

const PORT = process.env.PORT || 3030;

/** Parse a redis[s]:// URL into ioredis-compatible options for BullMQ. */
function parseRedisUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 6379,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    username: parsed.username || undefined,
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: null, // required by BullMQ
  };
}

const startServer = async () => {
  const app = express();
  const server = createServer(app);

  const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
  const allowedOrigins = [frontendUrl, "http://localhost:5173"].filter(Boolean);

  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  // Connect to Redis before starting the server
  await Promise.all([pubClient.connect(), subClient.connect()]);

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT"],
      credentials: true,
    },
    // <-- 4. Tell Socket.IO to use the Redis adapter
    adapter: createAdapter(pubClient, subClient, {
      requestsTimeout: 5000, // time in ms (10 seconds)
    }),
  });

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    })
  );

  await connectToDatabase();

  app.use(express.json());

  // ─── Request logger ───────────────────────────────────────────────────
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
  });

  app.use("/users", userRoute);
  app.use("/resumes", resumeRoute);
  app.use("/ai", aiRoutes);
  app.use("/deploy", deployRoute);
  // Socket.io middleware for authentication
  io.use(socketAuth);

  // Handle socket connections
  io.on("connection", (socket) => {
    handleSocketConnection(io, socket, pubClient);
  });

  // Make io available globally for use in other files
  app.set("io", io);

  // ─── Yjs CRDT WebSocket server (co-exists on same HTTP server) ────────
  setupYjsWSServer(server, pubClient, subClient);
  console.log("✅ Yjs WebSocket server attached on /yjs path.");

  // ─── BullMQ persistence (write-behind to MongoDB every 30s) ───────────
  const bullRedisOpts = parseRedisUrl(process.env.REDIS_URL);
  startPersistenceWorker(bullRedisOpts);
  const { stop: stopScheduler } = startPersistenceScheduler(bullRedisOpts);
  console.log("✅ BullMQ persistence worker & scheduler started.");

  // ─── BullMQ deploy worker (portfolio deploy jobs) ────────────────────
  initDeployQueue(bullRedisOpts);
  startDeployWorker(bullRedisOpts);
  console.log("✅ BullMQ deploy worker started.");

  // Graceful shutdown
  process.on('SIGTERM', () => { stopScheduler(); process.exit(0); });
  process.on('SIGINT',  () => { stopScheduler(); process.exit(0); });

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log("✅ Redis adapter connected for Socket.IO scaling.");
  });
};

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
});

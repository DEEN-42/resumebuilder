# System Design

End-to-end architecture for the ResumeBuilder platform. This document covers component responsibilities, data flows, the persistence strategy, horizontal scaling approach, and security model.

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Component Map](#component-map)
3. [Data Flows](#data-flows)
   - [Authentication](#authentication)
   - [Resume CRUD](#resume-crud)
   - [Real-Time Collaborative Editing](#real-time-collaborative-editing)
   - [AI Features](#ai-features)
   - [Portfolio Deployment](#portfolio-deployment)
4. [Database Schema](#database-schema)
5. [Persistence Strategy](#persistence-strategy)
6. [Horizontal Scaling](#horizontal-scaling)
7. [Security Model](#security-model)
8. [Frontend Architecture](#frontend-architecture)
9. [Infrastructure Diagram](#infrastructure-diagram)

---

## High-Level Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                           CLIENTS (React)                            │
│                                                                      │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │
│  │  Browser A  │   │  Browser B  │   │  Browser C  │               │
│  │  Y.Doc      │   │  Y.Doc      │   │  Y.Doc      │               │
│  │  IndexedDB  │   │  IndexedDB  │   │  IndexedDB  │               │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘               │
└─────────┼────────────────┼────────────────┼────────────────────────┘
          │ ws /yjs/<id>   │ ws /yjs/<id>   │ ws /yjs/<id>
          │ HTTP REST      │ HTTP REST      │ HTTP REST
          │ Socket.IO      │ Socket.IO      │ Socket.IO
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       NODE.JS SERVER(S)                             │
│                                                                     │
│  ┌──────────────────┐  ┌───────────────────┐  ┌─────────────────┐  │
│  │  Yjs WS Server   │  │   Socket.IO        │  │  REST API       │  │
│  │  (WSServer.js)   │  │   (Socket.IO)      │  │  (Express)      │  │
│  └────────┬─────────┘  └────────┬──────────┘  └────────┬────────┘  │
│           │                     │                       │            │
│  ┌────────▼────────────────────────────────────────────▼──────────┐ │
│  │                    DocumentManager                              │ │
│  │               In-memory Y.Doc + connections                    │ │
│  └────────────────────────────┬───────────────────────────────────┘ │
│                               │ markDirty                           │
│  ┌────────────────────────────▼───────────────────────────────────┐ │
│  │   PersistenceScheduler (30s)  →  BullMQ  →  PersistenceWorker │ │
│  └────────────────────────────┬───────────────────────────────────┘ │
│                               │                                     │
│  ┌────────────────────────────▼───────────────────────────────────┐ │
│  │              DeployWorker (BullMQ)                              │ │
│  │       GitHub API  +  Vercel API  +  Email                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
          │                                      │
          ▼                                      ▼
┌─────────────────┐                   ┌──────────────────┐
│    MongoDB       │                   │      Redis        │
│  Resumes, Users  │                   │  Socket.IO adapter│
│  yjsState (bin)  │                   │  Yjs pub/sub      │
│  resumeData (JSON│                   │  BullMQ queues    │
└─────────────────┘                   └──────────────────┘
          │                                      │
          ▼                                      ▼
┌─────────────────┐                   ┌──────────────────┐
│  Google Gemini   │                   │  GitHub + Vercel  │
│  (AI / ATS)      │                   │  (Portfolio deploy│
└─────────────────┘                   └──────────────────┘
```

---

## Component Map

### Backend

| Component | File(s) | Responsibility |
|---|---|---|
| **HTTP Server** | `index.js` | Entry point — wires Express, Socket.IO, Yjs WS, Redis, BullMQ workers |
| **REST API** | `Routes/` + `Controllers/` | CRUD for resumes and users, share management, image upload |
| **Auth Middleware** | `middleware/AuthenticationMiddleware.js` | Verifies JWT, attaches `req.email` |
| **Yjs WS Server** | `crdt/WSServer.js` | WebSocket server co-hosted on same HTTP port — handles binary Yjs sync + awareness |
| **DocumentManager** | `crdt/DocumentManager.js` | In-memory `Y.Doc` registry, connection tracking, dirty set, 5-min GC |
| **Persistence Scheduler** | `crdt/persistenceScheduler.js` | 30s interval — drains dirty set → enqueues BullMQ jobs |
| **Persistence Worker** | `crdt/persistenceWorker.js` | BullMQ worker — encodes Y.Doc → writes to MongoDB |
| **Deploy Controller** | `Controllers/deployController.js` | Validates deploy request, enqueues deploy job, serves job status |
| **Deploy Worker** | `jobs/deployWorker.js` | BullMQ worker — GitHub repo, Vercel project/deployment, email |
| **AI Controllers** | `Controllers/AiControllers.js` | Gemini API calls for section rewrites and ATS scoring |
| **Socket Handlers** | `socket/socketHandlers.js` | Socket.IO connection handling (presence, legacy notifications) |
| **Models** | `models/` | Mongoose schemas for `Resume` and `User` |

### Frontend

| Component | File(s) | Responsibility |
|---|---|---|
| **Yjs Setup** | `crdt/yjsSetup.js` | Creates `Y.Doc`, `WebsocketProvider` (WS), `IndexeddbPersistence` (IDB) |
| **useYjsDocument** | `crdt/useYjsDocument.jsx` | Observes Y.Doc changes → React state |
| **CRDT Handlers** | `crdt/yjsResumeDataHandlers.js` | Mutation functions that write into Y.Map/Y.Array |
| **project.jsx** | `project.jsx` | Main editor orchestrator — layout, Yjs init, awareness, routing |
| **Header** | `Components/Header/` | Toolbar — template switch, zoom, action buttons, status pills |
| **Left Panel** | Inline in `project.jsx` | Editor forms, section selector, structure reorder, deploy tab |
| **Right Panel** | `Components/RightPanel/` | Share section, ATS scorer, AI suggestions |
| **SharingSection** | `RightPanel/SharingSection/` | Share by email, live online badges, remove collaborator |
| **DeployPortfolio** | `Components/DeployPortfolio/` | Deploy trigger, job status polling, live URL display |
| **Templates** | `templates/` | IIT KGP, ISI, John Doe — pure React render components |
| **Dashboard** | `Components/Dashboard/` | Resume list, create/delete, resume cards |
| **Auth Pages** | `Components/AuthPages/` | Login (email + Google OAuth), Register |

---

## Data Flows

### Authentication

```
POST /users/login
  │ email + password (or Google credential)
  ▼
userModel.login() / googleAuth()
  │
  ▼
jwt.sign({ email }, JWT_SECRET, { expiresIn: '40m' })
  │
  ▼
Response: { token, resumes[] }
  │
  ▼
Frontend: localStorage.setItem('token', token)
```

Token renewal (`POST /users/renew-token`) is called automatically when requests return 401, avoiding forced logouts during active sessions.

---

### Resume CRUD

```
POST /resumes/create           → creates new Resume document, returns { id }
GET  /resumes/list             → returns all resumes owned or shared with user
GET  /resumes/load/:id         → returns resume metadata + yjsEnabled flag
DELETE /resumes/delete/:id     → owner only
PUT  /resumes/share/:id        → owner adds collaborator by email
PUT  /resumes/unshare/:id      → owner removes collaborator
GET  /resumes/share/:id/sharelist → returns shared[] with profile pictures
```

All routes require `Authorization: Bearer <JWT>`.

---

### Real-Time Collaborative Editing

See [COLLABORATION.md](COLLABORATION.md) for the full detailed flow. Summary:

```
1. Browser opens WS /yjs/<resumeId>?token=<JWT>
2. Server authenticates, loads Y.Doc from memory (or MongoDB)
3. Server sends SyncStep1 + SyncStep2 (full doc state) + awareness states
4. Client sends its own SyncStep1 → server replies with missing deltas
5. Both sides are now in sync

On each edit keystroke:
  Browser → Y.Doc mutation
         → Yjs encodes delta
         → WS send to server
         → server applies to shared Y.Doc
         → markDirty
         → broadcast to all other peers in room
         → Redis publish for cross-instance fanout

Every 30 seconds:
  PersistenceScheduler drains dirty set
  → BullMQ job → PersistenceWorker
  → MongoDB write (yjsState binary + resumeData JSON)
```

---

### AI Features

All AI endpoints proxy to **Google Gemini 2.0 Flash**. The pattern is the same for each:

```
POST /ai/<section>
  body: { content: <existing section data> }
  │
  ▼
AiController builds structured prompt
  │
  ▼
ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt })
  │
  ▼
Parse JSON response → return to frontend
  │
  ▼
Frontend applies suggestions via yjsResumeDataHandlers (writes into Y.Doc)
```

**Available AI endpoints:**

| Endpoint | Purpose |
|---|---|
| `POST /ai/atsScore` | Score resume 0–100 against SDE criteria, return strengths / improvements |
| `POST /ai/internships` | Rewrite internship bullet points |
| `POST /ai/projects` | Rewrite project descriptions |
| `POST /ai/skills` | Expand or reformat skills section |
| `POST /ai/awards` | Rewrite awards and achievements |
| `POST /ai/coursework` | Rewrite coursework section |
| `POST /ai/position` | Rewrite positions of responsibility |

---

### Portfolio Deployment

See [PORTFOLIO_DEPLOY.md](PORTFOLIO_DEPLOY.md) for the full detailed flow. Summary:

```
POST /deploy/:id
  → validates ownership
  → BullMQ enqueue
  → return { jobId }

BullMQ Worker:
  First time:  GitHub create repo → commit 3 files → Vercel create project → trigger deploy → save URLs → email
  Re-deploy:   GitHub push updated script.js → Vercel auto-redeploys

GET /deploy/status/:jobId
  → returns { status: 'waiting' | 'active' | 'completed' | 'failed' }
```

---

## Database Schema

### Resume

```
{
  id:              String (UUID, indexed)         // public-facing ID used in URLs
  title:           String
  description:     String
  owner:           String (email, indexed)        // only owner can delete/share/deploy
  shared:          [{ email, name, profilePicture }]
  selectedTemplate: String
  globalStyles:    Mixed                          // font sizes, colors, spacing
  resumeData:      Mixed                          // JSON snapshot (legacy + REST reads)
  yjsState:        Buffer                         // binary Y.Doc state (fast load)
  deployment: {
    githubRepo:    String (unique)
    vercelUrl:     String (unique)
  }
  createdAt:       Date
  updatedAt:       Date (auto)
}
```

**Why two data fields?**  
`yjsState` is the authoritative source — it preserves full CRDT history and loads instantly via `Y.applyUpdate`. `resumeData` is a JSON snapshot maintained alongside it so the REST API (dashboard list, AI endpoints, deploy worker) can read resume content without needing to decode binary Yjs state.

### User

```
{
  name:            String
  email:           String (unique, indexed)
  password:        String (bcrypt hashed, null for OAuth users)
  profilePicture:  String (URL)
  authProvider:    'local' | 'google'
  googleId:        String (for OAuth users)
  createdAt:       Date
}
```

---

## Persistence Strategy

| Layer | Technology | TTL / Behaviour |
|---|---|---|
| **Hot (in-memory)** | `DocumentManager` Map | Kept alive while connections exist; evicted 5 min after last connection closes |
| **Warm (IndexedDB)** | `y-indexeddb` in browser | Persists locally across reloads; synced on reconnect |
| **Cold (MongoDB)** | BullMQ write-behind | Written every 30s for any dirty doc; `yjsState` + `resumeData` |
| **Job queue** | BullMQ + Redis | `yjs-persist` queue for doc persistence; `deploy` queue for portfolio |

The WebSocket hot path is never blocked by MongoDB I/O — every write is deferred to the background worker. This keeps the sync latency under 10ms for local network connections regardless of database performance.

---

## Horizontal Scaling

Two separate Redis integrations enable multi-instance deployments:

### Socket.IO — Redis Adapter
```js
const io = new Server(server, {
  adapter: createAdapter(pubClient, subClient)
});
```
Socket.IO events (presence, notifications) are automatically forwarded between instances via Redis.

### Yjs — Redis Pub/Sub
When an instance receives a Yjs delta from a WebSocket client, it publishes to:
```
yjs:<resumeId>  →  base64-encoded delta
```
Every other instance subscribes via `pSubscribe('yjs:*', ...)` and applies the delta to its in-memory Y.Doc (if it exists). This ensures all instances share the same document state without routing all users to the same instance.

```
Instance A (User 1) ──► redisPub.publish("yjs:abc", delta)
                              │
                     Redis Pub/Sub
                              │
Instance B (User 2) ◄── crossSub receives "yjs:abc" → Y.applyUpdate(doc, delta)
```

### What does NOT scale horizontally yet
- `DocumentManager` stores Y.Doc instances in process memory. If a doc is not loaded on an instance (no active connections), Redis deltas for that doc are silently dropped on that instance. This is fine because the doc will be loaded fresh from MongoDB on next access.
- The `PersistenceScheduler` runs on every instance independently. Multiple instances may enqueue jobs for the same `resumeId`. BullMQ deduplication is not configured — the last write wins, which is safe because all instances converge to the same Y.Doc state.

---

## Security Model

### Authentication
- All REST endpoints are protected by `AuthenticationMiddleware` which calls `jwt.verify`.
- The Yjs WebSocket verifies the JWT from the query parameter before touching any document data.
- Google OAuth tokens are verified via `google-auth-library` (`OAuth2Client.verifyIdToken`).
- JWTs expire in 40 minutes. A `/users/renew-token` endpoint extends the session transparently.

### Authorisation
- **Resume ownership:** Create, delete, share, unshare, and deploy are gated to the `owner` field.
- **Collaborator access:** Shared users can read and edit (via Yjs WS) but cannot share further, delete, or deploy.
- **Yjs WS:** Access check happens at connection time — `owner === email` OR `shared[].email === email`. No per-message auth (the connection is authenticated once).

### Input validation
- Email format is validated on the frontend before share requests.
- AI endpoints validate that `id` is provided and the requester has access before calling Gemini.
- Image upload uses `multer` with file type restrictions and stores files in `uploads/` outside the source tree.

### CORS
Strict origin allowlist:
```js
const allowedOrigins = [
  "https://resumebuilder-frontend-i6nn.vercel.app",
  "http://localhost:5173"
];
```

---

## Frontend Architecture

### State ownership model

| State | Owner | Mechanism |
|---|---|---|
| Resume content (data, styles, template) | Yjs `Y.Doc` | Observed via `useYjsDocument` hook |
| Online users | `project.jsx` | Awareness change listener |
| Layout (panel widths, open/closed) | `project.jsx` | `useState` |
| Active tab, active section | `project.jsx` | `useState` |
| Deploy URL | `project.jsx` | Fetched from REST on load |
| Auth token / user identity | `localStorage` | Set on login |

### Why no global state manager (Redux/Zustand)?

The Yjs `Y.Doc` **is** the global state for resume data. React state is only for ephemeral UI concerns (panel layout, active tab). Adding a state manager on top of Yjs would create two sources of truth and introduce synchronisation bugs.

### Rendering pipeline

```
Y.Doc mutation (via yjsResumeDataHandlers)
  │ Yjs fires observeDeep callback
  ▼
useYjsDocument rebuilds plain JS state
  │
  ▼
React re-renders affected form + template preview
```

The template preview component receives `resumeData`, `globalStyles`, and `sectionOrder` as props and is a pure render function — it has no side effects and re-renders entirely on any change.

---

## Infrastructure Diagram

```
                    ┌──────────────────────────────────┐
                    │          Vercel (Frontend)         │
                    │        frontend (React)            │
                    └─────────────────┬────────────────┘
                                      │ HTTPS / WSS
                    ┌─────────────────▼────────────────┐
                    │        Render / Railway            │
                    │     Node.js Backend Server         │
                    │   ┌─────────┐  ┌──────────────┐  │
                    │   │  REST   │  │  Yjs WS + IO │  │
                    │   └────┬────┘  └──────┬───────┘  │
                    └────────┼──────────────┼──────────┘
                             │              │
                 ┌───────────▼──┐    ┌──────▼────────┐
                 │   MongoDB     │    │     Redis      │
                 │  (Atlas)      │    │  (Upstash /    │
                 │               │    │   Redis Cloud) │
                 └───────────────┘    └───────────────┘
                                             │
                                    ┌────────▼────────┐
                                    │   BullMQ queues  │
                                    │  yjs-persist     │
                                    │  deploy          │
                                    └────────┬─────────┘
                                             │
                               ┌─────────────▼──────────────┐
                               │   External Services         │
                               │  • Google Gemini API        │
                               │  • GitHub API (Octokit)     │
                               │  • Vercel API               │
                               │  • SMTP (email)             │
                               └─────────────────────────────┘
```

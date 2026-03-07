# Real-Time Collaborative Resume Builder — System Architecture

## Table of Contents

1. [Overview](#overview)
2. [High-Level System Diagram](#high-level-system-diagram)
3. [Tech Stack](#tech-stack)
4. [Core Concept: CRDTs and Yjs](#core-concept-crdts-and-yjs)
5. [Data Flow](#data-flow)
   - [Real-Time Editing (Hot Path)](#real-time-editing-hot-path)
   - [Persistence (Cold Path)](#persistence-cold-path)
   - [Offline Editing & Reconnection](#offline-editing--reconnection)
6. [Backend Architecture](#backend-architecture)
   - [Entry Point & Server Wiring](#entry-point--server-wiring)
   - [DocumentManager](#documentmanager)
   - [Yjs WebSocket Server](#yjs-websocket-server)
   - [Write-Behind Persistence (BullMQ)](#write-behind-persistence-bullmq)
   - [Socket.IO (Presence Only)](#socketio-presence-only)
   - [REST API Layer](#rest-api-layer)
7. [Frontend Architecture](#frontend-architecture)
   - [Yjs Setup & Providers](#yjs-setup--providers)
   - [useYjsDocument Hook](#useyjsdocument-hook)
   - [CRDT Data Handlers](#crdt-data-handlers)
   - [Project Component (Orchestrator)](#project-component-orchestrator)
8. [Data Model](#data-model)
   - [Y.Doc Structure](#ydoc-structure)
   - [MongoDB Schema](#mongodb-schema)
   - [Legacy Migration](#legacy-migration)
9. [Horizontal Scaling](#horizontal-scaling)
10. [Security Model](#security-model)
11. [File Map](#file-map)
12. [Appendix: Before vs After](#appendix-before-vs-after)

---

## Overview

This system is a **real-time collaborative CV/resume builder** that allows multiple users to simultaneously edit the same resume document with **zero-conflict convergence**. The architecture is built around **Conflict-free Replicated Data Types (CRDTs)** using the [Yjs](https://yjs.dev/) library.

**Key properties:**

- **Conflict-free:** No custom merge logic, timestamps, or tie-breakers. Yjs's mathematical CRDT guarantees that all peers converge to the same state regardless of operation order.
- **Offline-first:** Users can edit while disconnected. When they reconnect, only the missing operations are exchanged via State Vector handshake.
- **Non-blocking persistence:** The WebSocket hot path never touches MongoDB. A background BullMQ worker flushes dirty documents to the database every 30 seconds.
- **Horizontally scalable:** Multiple Node.js instances share state via Redis Pub/Sub for cross-instance delta fanout.

---

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                        │
│                                                                             │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐                           │
│  │ Browser A  │    │ Browser B  │    │ Browser C  │   (React + Yjs)         │
│  │            │    │            │    │            │                          │
│  │  Y.Doc ◄──┼────┼──► Y.Doc ◄─┼────┼──► Y.Doc   │                         │
│  │     │      │    │     │      │    │     │      │                          │
│  │ IndexedDB  │    │ IndexedDB  │    │ IndexedDB  │   (Offline Cache)       │
│  └─────┬──────┘    └─────┬──────┘    └─────┬──────┘                         │
│        │ ws://           │ ws://           │ ws://                           │
└────────┼─────────────────┼─────────────────┼────────────────────────────────┘
         │                 │                 │
         │    Binary Yjs Sync Protocol (y-protocols)
         │    Path: /yjs/<resumeId>?token=<JWT>
         │                 │                 │
┌────────▼─────────────────▼─────────────────▼────────────────────────────────┐
│                         NODE.JS SERVER                                      │
│                                                                             │
│  ┌──────────────────────────────────┐  ┌────────────────────────────────┐   │
│  │       Yjs WebSocket Server       │  │      Socket.IO Server          │   │
│  │       (WSServer.js)              │  │   (Presence & Notifications)   │   │
│  │                                  │  │                                │   │
│  │  ┌────────────────────────────┐  │  │  • join/leave room events     │   │
│  │  │    DocumentManager         │  │  │  • user-joined / user-left    │   │
│  │  │                            │  │  │  • users-in-room broadcast    │   │
│  │  │  In-Memory Y.Doc instances │  │  │                                │   │
│  │  │  Dirty-tracking Set        │  │  └────────────────────────────────┘   │
│  │  │  Connection registry       │  │                                       │
│  │  │  GC timer (5 min idle)     │  │  ┌────────────────────────────────┐   │
│  │  └────────────┬───────────────┘  │  │      REST API (Express)        │   │
│  │               │ marks dirty      │  │                                │   │
│  └───────────────┼──────────────────┘  │  • /resumes/* (CRUD, share)   │   │
│                  │                     │  • /users/*   (auth)           │   │
│                  ▼                     │  • /ai/*      (Gemini)         │   │
│  ┌──────────────────────────────────┐  │  • /deploy/*  (portfolio)     │   │
│  │   Persistence Scheduler (30s)    │  └────────────────────────────────┘   │
│  │   Flushes dirty IDs → BullMQ    │                                       │
│  └──────────────┬───────────────────┘                                       │
│                 │ enqueue                                                    │
│                 ▼                                                            │
│  ┌──────────────────────────────────┐                                       │
│  │   BullMQ Worker (yjs-persist)    │                                       │
│  │                                  │                                       │
│  │  1. Y.encodeStateAsUpdate(doc)   │          ┌───────────────────┐        │
│  │  2. doc.toJSON()                 ├─────────►│    MongoDB        │        │
│  │  3. Write yjsState + JSON ───────┤          │                   │        │
│  │     to MongoDB in one update     │          │  yjsState (Buffer)│        │
│  └──────────────────────────────────┘          │  resumeData (JSON)│        │
│                                                │  globalStyles     │        │
│  ┌──────────────────────────────────┐          └───────────────────┘        │
│  │         Redis                    │                                       │
│  │                                  │                                       │
│  │  • Pub/Sub: yjs:<resumeId>       │  ◄── Cross-instance delta fanout     │
│  │  • Socket.IO Adapter             │  ◄── Presence scaling                │
│  │  • BullMQ job queue              │  ◄── Persistence job queue           │
│  └──────────────────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React 19, Vite | UI rendering, form components |
| **CRDT** | Yjs | Conflict-free replicated data types |
| **Frontend Sync** | y-websocket | WebSocket provider for Yjs |
| **Offline Cache** | y-indexeddb | Browser-side persistence for offline editing |
| **Backend Runtime** | Node.js, Express 5 | HTTP API server |
| **WebSocket** | ws (native) | Binary Yjs sync protocol transport |
| **Presence** | Socket.IO + Redis Adapter | User join/leave notifications |
| **Sync Protocol** | y-protocols | Yjs binary encoding/decoding (sync + awareness) |
| **Message Bus** | Redis Pub/Sub | Cross-instance CRDT delta fanout |
| **Job Queue** | BullMQ + ioredis | Background persistence jobs |
| **Database** | MongoDB (Mongoose) | Cold storage for resume documents |
| **AI** | Google Gemini API | ATS scoring, resume suggestions |
| **Auth** | JWT | Stateless authentication |
| **File Storage** | Cloudinary | Profile/logo image uploads |

---

## Core Concept: CRDTs and Yjs

### What is a CRDT?

A **Conflict-free Replicated Data Type** is a data structure that can be replicated across multiple peers, updated independently and concurrently without coordination, and always converges to a consistent state when updates are merged.

### Why Yjs?

Yjs implements CRDTs optimized for collaborative text and structured data editing. It provides:

- **`Y.Map`** — CRDT equivalent of a JavaScript object. Used for `personalInfo`, `globalStyles`, `meta`.
- **`Y.Array`** — CRDT equivalent of a JavaScript array. Used for `education[]`, `internships[]`, `projects[]`, etc.
- **`Y.Text`** — CRDT equivalent of a string with character-level operations (available but not yet used in this project).
- **`Y.Doc`** — The root container that holds all shared types for a single document.

### Key Guarantee

> If two users edit different fields simultaneously, both edits are preserved. If two users edit the same field simultaneously, Yjs deterministically picks one — no data loss, no custom merge code.

---

## Data Flow

### Real-Time Editing (Hot Path)

```
User types in form input
         │
         ▼
Form component calls handler
(e.g., dataHandlers.handlePersonalInfoChange('name', 'Alice'))
         │
         ▼
Handler mutates Y.Doc in-memory
(e.g., yMap.set('name', 'Alice'))
         │
         ▼
Yjs generates a binary delta (Uint8Array)
         │
    ┌────┴────────────────────────┐
    │                             │
    ▼                             ▼
y-websocket sends delta      Y.Doc fires 'update' event
to server via WebSocket       → useYjsDocument re-reads state
    │                          → React re-renders preview
    ▼
Server's WSServer.js receives binary message
    │
    ├── Applies to in-memory Y.Doc
    ├── Marks document as dirty
    ├── Broadcasts delta to all other connected WebSockets
    └── Publishes delta to Redis channel `yjs:<resumeId>`
              │
              ▼
         Other server instances (if scaled)
         receive via Redis subscription
         and apply to their in-memory Y.Doc
```

**Critical property:** Zero database writes in this entire path. The hot loop is purely in-memory + network.

### Persistence (Cold Path)

```
Every 30 seconds:
    │
    ▼
Persistence Scheduler checks DocumentManager.dirtyDocs
    │
    ▼ (for each dirty resumeId)
Enqueues a BullMQ job: { resumeId }
    │
    ▼
BullMQ Worker picks up the job:
    1. Y.encodeStateAsUpdate(doc) → Uint8Array (binary CRDT state)
    2. doc.toJSON() → { resumeData, globalStyles, selectedTemplate }
    3. MongoDB updateOne:
       - yjsState = Buffer.from(binaryState)    ← for CRDT restoration
       - resumeData = plainJSON                  ← for backward compat / API reads
       - globalStyles = plainJSON
       - selectedTemplate = string
```

### Offline Editing & Reconnection

```
1. User goes offline
   └── Edits continue locally (y-indexeddb persists to browser IndexedDB)

2. User comes back online
   └── y-websocket reconnects automatically

3. State Vector Handshake:
   ┌─────────────────┐                    ┌─────────────────┐
   │     Client       │                    │     Server       │
   │                  │  Sync Step 1       │                  │
   │  Sends its       ├───────────────────►│  Computes diff   │
   │  State Vector    │                    │  from server doc │
   │                  │  Sync Step 2       │                  │
   │  Receives only   │◄───────────────────┤  Sends missing   │
   │  missing ops     │                    │  operations      │
   │                  │                    │                  │
   │  Sends its own   │  Client updates    │                  │
   │  offline ops  ───┼───────────────────►│  Applies to doc  │
   │                  │                    │  Broadcasts to   │
   │                  │                    │  other peers     │
   └─────────────────┘                    └─────────────────┘

4. Result: All peers converge — zero data loss, zero conflicts.
```

---

## Backend Architecture

### Entry Point & Server Wiring

**File:** `backend/index.js`

The entry point bootstraps three co-existing server subsystems on a single HTTP server:

```
HTTP Server (port 3030)
  ├── Express (REST API)                    → /users, /resumes, /ai, /deploy
  ├── Socket.IO (with Redis adapter)        → presence events
  └── Yjs WebSocket Server (raw ws)         → /yjs/:resumeId (binary CRDT sync)
```

Additionally, it starts the BullMQ persistence layer:
- `startPersistenceWorker(redisOpts)` — processes `yjs-persist` queue jobs
- `startPersistenceScheduler(redisOpts)` — 30s interval dirty-doc flush

A `parseRedisUrl()` helper converts the `REDIS_URL` environment variable (redis[s]:// format) into ioredis-compatible connection options required by BullMQ.

### DocumentManager

**File:** `backend/crdt/DocumentManager.js`

The DocumentManager is a **singleton** that manages the lifecycle of in-memory `Y.Doc` instances.

**Responsibilities:**

| Method | Purpose |
|--------|---------|
| `getDoc(resumeId)` | Returns the in-memory Y.Doc, loading from MongoDB if needed. Uses a `loading` Map to coalesce concurrent requests for the same document. |
| `addConnection(resumeId, ws)` | Registers a WebSocket client for a document room. Cancels any pending garbage collection. |
| `removeConnection(resumeId, ws)` | Unregisters a client. When the last client disconnects, schedules garbage collection. |
| `markDirty(resumeId)` | Flags a document as having un-persisted changes. |
| `flushDirtyIds()` | Returns and clears all dirty document IDs (called by the scheduler). |
| `encodeState(resumeId)` | Returns `Y.encodeStateAsUpdate(doc)` — the full binary Yjs state. |
| `toJSON(resumeId)` | Converts the Y.Doc into plain `{ resumeData, globalStyles, selectedTemplate }` for backward-compatible MongoDB storage. |

**Garbage Collection:**
- When all clients disconnect from a document, a 5-minute timer starts.
- After 5 minutes idle, the Y.Doc is destroyed and evicted from memory.
- If a new client connects before the timer fires, the GC is cancelled.

**Legacy Migration:**
- When a document is loaded from MongoDB and has no `yjsState` field (pre-migration data), the `_hydrateFromPlain()` method populates the Y.Doc from the existing `resumeData`, `globalStyles`, and `selectedTemplate` JSON fields.
- This runs in a single Y.Doc transaction to avoid generating multiple update events.

### Yjs WebSocket Server

**File:** `backend/crdt/WSServer.js`

A raw WebSocket server (using the `ws` library) that handles the binary Yjs sync protocol.

**Connection Lifecycle:**

1. **HTTP Upgrade** — The `httpServer.on('upgrade')` handler routes requests starting with `/yjs/` to this server. All other upgrade requests (e.g., Socket.IO's `/socket.io/`) are ignored.

2. **Authentication** — JWT token is extracted from the query string (`?token=<jwt>`). The token is verified, and the user's email is extracted.

3. **Authorization** — The resume document is looked up in MongoDB. Access is verified: user must be the owner or in the `shared` array.

4. **Document Sync** — The server loads/gets the Y.Doc via DocumentManager, then:
   - Sends **Sync Step 1** to the client (the server's state vector)
   - Sends current **awareness states** (who else is editing)

5. **Message Loop** — Incoming binary messages are decoded:
   - `MSG_SYNC (0)` — Processed by `y-protocols/sync` (handles Sync Step 1, Step 2, and Update messages)
   - `MSG_AWARENESS (1)` — Processed by `y-protocols/awareness` (cursor positions, user names)

6. **Broadcasting** — When the Y.Doc receives an update:
   - The delta is broadcast to all connected WebSocket peers (excluding the sender)
   - The delta is published to Redis channel `yjs:<resumeId>` (base64-encoded)
   - The document is marked dirty

7. **Disconnect** — Cleanup: remove connection, remove awareness state, and if no clients remain, delete the awareness instance and allow GC.

**Redis Cross-Instance Subscriber:**
- A Redis subscriber listens on `yjs:*` pattern
- When a message arrives (from another server instance), the delta is decoded and applied to the local Y.Doc with origin `'redis'`
- The `'redis'` origin prevents infinite re-publish loops

### Write-Behind Persistence (BullMQ)

**Files:**
- `backend/crdt/persistenceScheduler.js` — Timer + queue producer
- `backend/crdt/persistenceWorker.js` — Queue consumer

**Scheduler (Producer):**
```
setInterval(every 30 seconds) {
    dirtyIds = documentManager.flushDirtyIds()
    for each resumeId:
        queue.add('persist', { resumeId }, {
            jobId: `persist-${resumeId}`,    // de-duplicates waiting jobs
            removeOnComplete: true,
            removeOnFail: 50
        })
}
```

**Worker (Consumer):**
```
For each job { resumeId }:
    1. state = documentManager.encodeState(resumeId)     → Uint8Array
    2. json  = documentManager.toJSON(resumeId)          → { resumeData, globalStyles, selectedTemplate }
    3. Resume.updateOne({ id: resumeId }, {
         yjsState: Buffer.from(state),
         resumeData: json.resumeData,
         globalStyles: json.globalStyles,
         selectedTemplate: json.selectedTemplate
       })
```

The worker writes **both** the binary Yjs state (for CRDT restoration) and the plain JSON (for backward-compatible API reads and AI features).

### Socket.IO (Presence Only)

**File:** `backend/socket/socketHandlers.js`

After the CRDT migration, Socket.IO no longer carries document data. It handles:

- `join-resume-room` — User joins a room, gets added to Redis presence set
- `leave-resume` — User leaves, gets removed from presence set
- `disconnect` — Cleanup on connection drop
- `user-joined` / `user-left` / `users-in-room` — Presence broadcasting

The old `update-resume` event handler is **deprecated** and returns an error directing clients to use the Yjs WebSocket connection.

### REST API Layer

The REST API remains unchanged for non-collaborative operations:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/resumes/create` | POST | Create a new resume |
| `/resumes/load/:id` | GET | Load resume metadata (triggers Yjs setup on frontend) |
| `/resumes/update/:id` | PUT | Legacy update (still functional for non-Yjs clients) |
| `/resumes/delete/:id` | DELETE | Delete a resume |
| `/resumes/share/:id` | PUT | Add a collaborator |
| `/resumes/unshare/:id` | PUT | Remove a collaborator |
| `/ai/atsScore` | POST | ATS scoring via Gemini API |
| `/ai/internships` | POST | AI suggestions for internships |
| `/deploy/:id` | POST | Deploy portfolio to Vercel |

The `loadResumeSocket` controller now returns `yjsEnabled: true` in its response, signaling the frontend to initialize Yjs providers instead of relying on Socket.IO for data sync.

---

## Frontend Architecture

### Yjs Setup & Providers

**File:** `frontend/src/crdt/yjsSetup.js`

Creates and returns three interconnected objects:

```javascript
{
  ydoc: Y.Doc,                    // The shared CRDT document
  wsProvider: WebsocketProvider,   // Network sync via WebSocket
  idbPersistence: IndexeddbPersistence,  // Offline cache in browser
  destroy: () => void             // Cleanup function
}
```

**WebSocket URL derivation:**
```
BACKEND_URL = "http://localhost:3030"
→ wsUrl = "ws://localhost:3030/yjs"
→ Full path: ws://localhost:3030/yjs/<resumeId>?token=<JWT>
```

The `y-websocket` provider handles:
- Automatic reconnection with exponential backoff
- State Vector handshake on connect/reconnect
- Binary delta encoding/decoding

The `y-indexeddb` provider handles:
- Persisting the Y.Doc to browser IndexedDB
- Restoring state on page reload (even before the WebSocket connects)
- Enabling full offline editing

### useYjsDocument Hook

**File:** `frontend/src/crdt/useYjsDocument.jsx`

A React hook that bridges the Yjs world (mutable shared types) into the React world (immutable snapshots).

```javascript
const { resumeData, globalStyles, selectedTemplate } = useYjsDocument(ydoc, synced);
```

**How it works:**

1. Listens to `ydoc.on('update', ...)` — fires on every local or remote mutation
2. On each update, reads the Y.Doc's shared types and converts them to plain JavaScript using recursive `yTypeToPlain()`:
   - `Y.Map` → `{}`
   - `Y.Array` → `[]`
   - `Y.Text` → `string`
   - primitives → as-is
3. Merges with defaults from `getInitialResumeData()` to fill any missing keys
4. Sets React state → triggers re-render

**Key design decision:** The hook does NOT use `useState` for the collaborative content itself — it only uses `useState` to hold the latest **snapshot** derived from the Y.Doc. The Y.Doc is the single source of truth.

### CRDT Data Handlers

**File:** `frontend/src/crdt/yjsResumeDataHandlers.js`

This file is the **drop-in replacement** for the old `handlers/resumeDataHandlers.jsx`. It exports handlers with the **exact same function signatures**, so form components require zero changes.

**Old (React setState):**
```javascript
const handlePersonalInfoChange = (field, value) => {
  setResumeData(prev => ({
    ...prev,
    personalInfo: { ...prev.personalInfo, [field]: value }
  }));
};
```

**New (Y.Doc mutation):**
```javascript
const handlePersonalInfoChange = (field, value) => {
  getOrCreateMap('personalInfo').set(field, value);
};
```

The mutation propagates automatically:
`Y.Map.set()` → Y.Doc update → WebSocket delta → server → other peers

**Array handlers** (education, internships, projects, etc.) support the same three-mode interface:
- `handler('add')` — pushes a new `Y.Map` with default fields
- `handler(index, 'remove')` — deletes the item at that index
- `handler(index, field, value)` — sets a field on the item's `Y.Map`

**UI handlers** for `globalStyles` and `selectedTemplate`:

```javascript
const { handleStyleChange, handleTemplateChange } = createYjsUIHandlers(ydoc);
```

These write directly to `ydoc.getMap('globalStyles')` and `ydoc.getMap('meta')`.

### Project Component (Orchestrator)

**File:** `frontend/src/project.jsx`

The main `ResumeBuilder` component was fully rewritten to use Yjs as the state backbone.

**What was removed:**
- `useState` for `resumeData`, `globalStyles`, `selectedTemplate` (replaced by Y.Doc observation)
- `saveHandlers` — debounced HTTP PUT saves (Yjs + BullMQ handles persistence)
- `socketHandlers` — Socket.IO data sync (replaced by y-websocket)
- `dataLoader` — full JSON load from server (initial state arrives via Yjs sync)
- `saveTimeoutRef`, `lastSaveDataRef`, `isSavingRef`, `isUpdatingFromSocketRef` — all save/sync refs

**What was added:**
- `ydoc` state + `yjsRef` ref — holds the active Y.Doc and cleanup handle
- `synced` state — tracks when the initial Yjs sync is complete
- `useYjsDocument(ydoc, synced)` — derives `resumeData`, `globalStyles`, `selectedTemplate`
- `createYjsResumeDataHandlers(ydoc)` / `createYjsUIHandlers(ydoc)` — memoized Yjs mutation handlers
- Awareness setup — broadcasts own user identity, tracks connected peers

**What was kept:**
- All form components (PersonalInfoForm, EducationForm, etc.) — unchanged
- Template component rendering
- Zoom, download, navigation UI
- RightPanel (sharing, AI suggestions, ATS scorer)
- DeployPortfolio component

**Initialization flow:**
```
1. Fetch /resumes/load/:id → get deployedUrl metadata
2. createYjsSetup(id, token) → Y.Doc + WebSocket + IndexedDB
3. wsProvider 'synced' event → setIsLoading(false)
4. useYjsDocument reads Y.Doc → populates React state
5. Form components render with data
```

---

## Data Model

### Y.Doc Structure

Each resume is a single Y.Doc containing three top-level shared types:

```
Y.Doc
├── Y.Map('resumeData')
│   ├── Y.Map('personalInfo')     → { name, rollNo, email, contact, ... }
│   ├── Y.Array('education')      → [ Y.Map({ year, degree, institute, cgpa }), ... ]
│   ├── Y.Array('internships')    → [ Y.Map({ title, company, duration, description }), ... ]
│   ├── Y.Array('projects')       → [ Y.Map({ title, duration, description, url }), ... ]
│   ├── Y.Array('skills')         → [ Y.Map({ title, description }), ... ]
│   ├── Y.Array('awards')         → [ Y.Map({ title, description }), ... ]
│   ├── Y.Array('extraAcademicActivities') → [ Y.Map({ title, description }), ... ]
│   ├── Y.Array('coursework')     → [ Y.Map({ title, description }), ... ]
│   ├── Y.Array('position')       → [ Y.Map({ title, time, description }), ... ]
│   └── Y.Array('sectionorder')   → [ Y.Map({ id, title }), ... ]
│
├── Y.Map('globalStyles')
│   ├── Y.Map('heading')          → { fontSize, fontFamily, color, bold, italic, underline }
│   └── Y.Map('description')      → { fontSize, fontFamily, color, bold, italic, underline }
│
└── Y.Map('meta')
    └── 'selectedTemplate'         → string ('iitkg' | 'isi' | 'johndoe')
```

### MongoDB Schema

```javascript
{
  id:               String,          // UUID (indexed, unique)
  title:            String,
  description:      String,
  owner:            String,          // Email of the creator
  shared:           [{ email, name, profilePicture }],
  selectedTemplate: String,
  globalStyles:     Mixed,           // Plain JSON (backward compat)
  resumeData:       Mixed,           // Plain JSON (backward compat)
  yjsState:         Buffer,          // Binary Yjs CRDT state (new)
  deployment:       { githubRepo, vercelUrl },
  createdAt:        Date,
  updatedAt:        Date
}
```

### Legacy Migration

Pre-migration resumes have `resumeData` and `globalStyles` as plain JSON but no `yjsState` field.

When `DocumentManager.getDoc()` loads such a document:

1. Checks for `yjsState.buffer` → not present
2. Falls through to `_hydrateFromPlain()`:
   - Creates Y.Map/Y.Array structures from the JSON
   - Runs in a single Y.Doc transaction
3. On next persistence flush, the BullMQ worker writes both `yjsState` and updated JSON
4. Subsequent loads use the binary `yjsState` directly

This ensures **zero-downtime migration** — old resumes are converted on first access.

---

## Horizontal Scaling

The system supports multiple Node.js instances behind a load balancer:

```
                        ┌── Instance A ──┐
Client ──► Load ────────┤                ├──── Redis
           Balancer     ├── Instance B ──┤
                        ├── Instance C ──┤
                        └────────────────┘
```

**How cross-instance sync works:**

1. **Yjs deltas:** When Instance A receives a Yjs update, it publishes to `yjs:<resumeId>` on Redis. Instances B and C subscribe to `yjs:*`, receive the delta, and apply it to their in-memory Y.Doc. Origin is set to `'redis'` to prevent re-publishing.

2. **Socket.IO presence:** The `@socket.io/redis-adapter` handles cross-instance Socket.IO event routing automatically.

3. **BullMQ jobs:** Redis-backed queue ensures only one worker processes each persistence job, regardless of which instance enqueued it.

---

## Security Model

| Boundary | Protection |
|----------|------------|
| **WebSocket auth** | JWT token in query param, verified by `jwt.verify()` before connection is accepted |
| **WebSocket authz** | Resume lookup in MongoDB: user must be `owner` or in `shared[]` array |
| **REST API auth** | JWT Bearer token in `Authorization` header, verified by `authMiddleware` |
| **Socket.IO auth** | JWT token in `handshake.auth.token`, verified by `socketAuth` middleware |
| **CORS** | Allowlisted origins only (production URL + localhost) |
| **Data isolation** | Each Y.Doc is keyed by resume UUID; cross-document access impossible |

---

## File Map

### Backend — New Files

| File | Lines | Purpose |
|------|-------|---------|
| `crdt/DocumentManager.js` | ~220 | Y.Doc lifecycle, dirty tracking, legacy migration, GC |
| `crdt/WSServer.js` | ~190 | Raw WebSocket server, Yjs sync protocol, Redis pub/sub |
| `crdt/persistenceWorker.js` | ~45 | BullMQ consumer: Y.Doc → MongoDB |
| `crdt/persistenceScheduler.js` | ~35 | 30s timer, BullMQ producer |

### Backend — Modified Files

| File | Change |
|------|--------|
| `index.js` | Added Yjs WS server, BullMQ worker/scheduler, `parseRedisUrl` |
| `models/resumeDatamodel.js` | Added `yjsState: Buffer` field |
| `socket/socketHandlers.js` | Deprecated `update-resume` handler |
| `Controllers/ResumeDataController.js` | `loadResumeSocket` returns `yjsEnabled: true` |

### Frontend — New Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/crdt/yjsSetup.js` | ~35 | Y.Doc + WebsocketProvider + IndexeddbPersistence factory |
| `src/crdt/useYjsDocument.jsx` | ~90 | React hook: Y.Doc observation → plain JS state |
| `src/crdt/yjsResumeDataHandlers.js` | ~140 | Y.Doc mutation handlers (same API as old setState handlers) |

### Frontend — Modified Files

| File | Change |
|------|--------|
| `src/project.jsx` | Full rewrite: Yjs-backed state, removed save/socket handlers, added awareness |

### Dependencies Added

| Package | Side | Purpose |
|---------|------|---------|
| `yjs` | Both | Core CRDT library |
| `y-protocols` | Backend | Binary sync + awareness encoding |
| `lib0` | Backend | Binary encoder/decoder utilities |
| `ws` | Backend | Native WebSocket server |
| `bullmq` | Backend | Job queue for persistence |
| `ioredis` | Backend | Redis client (required by BullMQ) |
| `y-websocket` | Frontend | Yjs WebSocket provider |
| `y-indexeddb` | Frontend | Yjs IndexedDB offline persistence |

---

## Appendix: Before vs After

| Aspect | Before (Socket.IO + Debounce) | After (Yjs CRDT) |
|--------|-------------------------------|-------------------|
| **Sync mechanism** | Debounced HTTP PUT every 1s, full JSON overwrite | Binary CRDT deltas over WebSocket, sub-millisecond |
| **Conflict handling** | Last-write-wins (data loss possible) | Mathematical convergence (zero data loss) |
| **DB writes per keystroke** | ~1 per second (debounced) | 0 (30s background flush) |
| **Offline support** | None (edits lost) | Full (IndexedDB cache, State Vector sync) |
| **Bandwidth** | Full JSON document on every save | Only binary diffs (bytes, not KB) |
| **State source of truth** | React `useState` | Y.Doc (observed by React) |
| **Form component changes** | N/A | Zero (handler interface unchanged) |
| **Scalability** | Single instance (no cross-server sync) | Multi-instance via Redis Pub/Sub |

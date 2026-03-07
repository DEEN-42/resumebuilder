# Real-Time Resume Collaboration

This document explains how the collaborative editing system works end-to-end — from what happens when two users open the same resume to how conflicts are prevented and how the document is persisted.

---

## Table of Contents

1. [Core Principle: CRDTs](#core-principle-crdts)
2. [What Yjs Provides](#what-yjs-provides)
3. [Connection Lifecycle](#connection-lifecycle)
4. [Sync Protocol](#sync-protocol)
5. [Presence & Awareness](#presence--awareness)
6. [Offline Editing](#offline-editing)
7. [Write-Behind Persistence](#write-behind-persistence)
8. [Access Control](#access-control)
9. [Frontend Integration](#frontend-integration)
10. [Key Files](#key-files)

---

## Core Principle: CRDTs

Traditional collaborative editors (like Google Docs) use **Operational Transformation (OT)** — they require a central server to serialize operations and apply transformations when two edits conflict. This is complex and doesn't scale well.

This project uses **Conflict-free Replicated Data Types (CRDTs)**. Every client holds a full local copy of the document as a `Y.Doc` object. When any client makes an edit, Yjs encodes it as a compact binary **update** (a delta). That delta is broadcast to all other connected clients. Each client applies the delta to its own `Y.Doc`.

The mathematical guarantee of CRDTs is that **applying the same set of updates in any order always produces the same final document state** — no conflicts, no server arbitration needed.

---

## What Yjs Provides

Yjs supplies the following primitives used in this project:

| Primitive | Used for |
|---|---|
| `Y.Doc` | The root document container, one per resume |
| `Y.Map` | Resume sections (personalInfo, education, projects, etc.) and globalStyles |
| `Y.Array` | Ordered lists within sections (e.g., list of education entries) |
| `Awareness` | Ephemeral per-user state (email, cursor) — not persisted |
| State Vector | Handshake mechanism so peers only exchange missing updates |

The document structure mirrors the resume JSON shape, but every field is a Yjs observable type so changes flow reactively to all peers.

---

## Connection Lifecycle

```
Browser                              Server (WSServer.js)
  │                                        │
  │── WS upgrade /yjs/<resumeId>?token=JWT ─►│
  │                                        │ 1. Verify JWT → extract email
  │                                        │ 2. Check resume ownership/shared access
  │                                        │ 3. documentManager.getDoc(resumeId)
  │                                        │    (loads from MongoDB if not in memory)
  │                                        │ 4. documentManager.addConnection(resumeId, ws)
  │                                        │
  │◄── SyncStep1 (state vector) ───────────│
  │◄── SyncStep2 (full doc state) ─────────│
  │◄── Current awareness states ───────────│
  │                                        │
  │── SyncStep1 (client state vector) ────►│
  │◄── missing updates ────────────────────│
  │                                        │
  │   [ editing session … ]               │
  │                                        │
  │── binary update delta ────────────────►│ applyUpdate to Y.Doc
  │                                        │ markDirty(resumeId)
  │                                        │──► broadcast delta to all other peers
  │                                        │──► redisPub.publish("yjs:<resumeId>", delta)
  │                                        │
  │── WS close ────────────────────────────►│ removeAwarenessStates
  │                                        │ broadcast removal to remaining peers
  │                                        │ removeConnection
```

### Message Types

Two message types are multiplexed on the same WebSocket:

| Type byte | Meaning |
|---|---|
| `0` (`MSG_SYNC`) | Yjs sync protocol messages (SyncStep1, SyncStep2, Update) |
| `1` (`MSG_AWARENESS`) | Awareness state updates (presence) |

---

## Sync Protocol

### Initial Sync (SyncStep1 / SyncStep2)

When a client connects:

1. The server sends **SyncStep1** — its state vector (a compact summary of which updates it already has).
2. The server immediately also sends **SyncStep2** — the full encoded document state — so the client gets content without a round-trip.
3. The client replies with its own **SyncStep1** (state vector from IndexedDB cache).
4. The server replies with all updates the client is missing.

This handshake ensures both sides converge to the same state with minimal data transfer.

### Live Updates

After the initial sync, every edit is:
1. Applied locally to the client's `Y.Doc` (instant, no round-trip).
2. Encoded as a compact binary delta by Yjs.
3. Sent to the server over the WebSocket.
4. Applied by the server to its in-memory `Y.Doc`.
5. Broadcast to every other connected WebSocket for this room (excluding the sender).
6. Also published to Redis (`yjs:<resumeId>` channel) so other server instances can fan it out to their connected clients.

### Message Buffering

The server buffers incoming messages while async auth and MongoDB doc-load are in progress. The y-websocket client sends SyncStep1 the instant the socket opens — without buffering, this would be silently lost and the client would never receive the document state.

---

## Presence & Awareness

Awareness is a separate Yjs subsystem for **ephemeral, per-user state** that does not persist to the database. In this project, each client broadcasts:

```json
{
  "user": {
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

The email is decoded directly from the JWT token payload (`atob(token.split('.')[1])`), guaranteeing it matches the authenticated identity.

### Online status in the Share Section

The `SharingSection` component receives the `connectedUsers` array (a list of emails currently in the Yjs awareness map) from `project.jsx` via props. For each user in the shared list, it calls `isUserOnline(email)` which does a simple `.includes()` check against that array. The avatar border and "ONLINE" / "OFFLINE" badge update in real time as awareness changes arrive.

### Join / Leave Toasts

`project.jsx` maintains a `prevEmailSet` across awareness change events. When the set grows, a "joined" toast fires. When it shrinks, a **debounced** leave toast fires after 3 seconds — if the user rejoins within that window (e.g., page refresh), the timer is cancelled and neither toast is shown.

### Server-Side Awareness Broadcast on Disconnect

A subtle issue: the `onAwarenessChange` relay in WSServer.js uses `conn !== ws` to skip broadcasting back to the sender. When user A disconnects, `removeAwarenessStates` fires the change event — but by then `ws` is the closing socket. If only one peer (B) remains, the `conn !== ws` filter would skip B, meaning B never receives the removal and its user count stays stale.

**Fix:** On disconnect, after calling `removeAwarenessStates`, the server explicitly broadcasts the encoded removal to **all** remaining connections (no exclusion filter).

---

## Offline Editing

Each client stores the `Y.Doc` state in **IndexedDB** via `y-indexeddb` (`IndexeddbPersistence`). This means:

- On reload, the document is available instantly from local cache (no waiting for the WebSocket to connect).
- If the WebSocket is unavailable, the user can keep editing — all changes are stored locally.
- On reconnect, the State Vector handshake exchanges only the missing deltas.

The `idbPersistence.whenSynced` promise resolves as soon as local data is loaded, and the app sets `isLoading = false` at that point regardless of WebSocket status.

---

## Write-Behind Persistence

The WebSocket hot path **never touches MongoDB**. This keeps latency low and decouples the real-time sync layer from the database layer.

Instead:

1. Every time the server's `Y.Doc` receives an update (`ydoc.on('update', ...)`), it calls `documentManager.markDirty(resumeId)` — adding the ID to a `Set<string>`.
2. A `PersistenceScheduler` runs every **30 seconds**. It drains the dirty set and enqueues one BullMQ job per dirty resume into the `yjs-persist` queue.
3. The `PersistenceWorker` processes each job:
   - Encodes the full Y.Doc state as a `Uint8Array` via `Y.encodeStateAsUpdate`.
   - Converts the Y.Doc maps to plain JSON via `doc.toJSON()`.
   - Writes both `yjsState` (binary, for fast load) and `resumeData` (JSON, for legacy REST reads) to MongoDB in a single `findOneAndUpdate`.

```
Y.Doc (in memory)
    │ ydoc.on('update')
    ▼
documentManager.markDirty(resumeId)
    │ every 30s
    ▼
PersistenceScheduler → BullMQ queue ("yjs-persist")
    │
    ▼
PersistenceWorker
    ├── Y.encodeStateAsUpdate(doc) → yjsState (Buffer)
    └── doc.toJSON()              → resumeData (JSON)
         └── MongoDB.findOneAndUpdate()
```

On next load, the server checks `yjsState` first (binary). If absent (legacy documents), it hydrates from the plain `resumeData` JSON fields via `_hydrateFromPlain`.

---

## Access Control

Every WebSocket connection is individually authenticated:

1. JWT is passed as a query parameter: `/yjs/<resumeId>?token=<JWT>`.
2. The server calls `jwt.verify(token, JWT_SECRET)` to extract `email`.
3. It queries MongoDB: the connecting user must be either the `owner` or appear in the `shared[]` array.
4. If either check fails, the WebSocket is closed with a 4401/4403/4404 code before any document data is sent.

Sharing is managed via REST:
- `PUT /resumes/share/:id` — add a collaborator by email (owner only)
- `PUT /resumes/unshare/:id` — remove a collaborator (owner only)
- `GET /resumes/share/:id/sharelist` — fetch the current shared list (for the Share panel)

---

## Frontend Integration

### `yjsSetup.js`
Creates the `Y.Doc`, `WebsocketProvider`, and `IndexeddbPersistence`. Returns a `destroy()` function for cleanup.

### `useYjsDocument.jsx`
A React hook that observes the `Y.Doc` for changes and returns plain JS state (`resumeData`, `globalStyles`, `selectedTemplate`). This is the bridge between the Yjs world and React rendering.

### `yjsResumeDataHandlers.js`
Mutation functions (e.g., `handlePersonalInfoChange`, `handleProjectsChange`) that write into the `Y.Doc`'s `Y.Map`/`Y.Array` structures. These replace the old `setResumeData` pattern and are the only way data should be mutated.

### `project.jsx`
The orchestrator. It:
- Initialises Yjs on mount and tears it down on unmount.
- Decodes the JWT to get `ownEmail` for the awareness state.
- Maintains `connectedUsers` state by listening to `awareness.on('change', ...)`.
- Passes `connectedUsers` down to `Header` (for the user-count pill) and `RightPanel → SharingSection` (for online badges).

---

## Key Files

| File | Role |
|---|---|
| `ResumeBuilder-backend/crdt/WSServer.js` | WebSocket server, sync protocol, awareness relay, disconnect broadcast |
| `ResumeBuilder-backend/crdt/DocumentManager.js` | In-memory Y.Doc lifecycle, dirty tracking, GC |
| `ResumeBuilder-backend/crdt/persistenceScheduler.js` | 30s timer → drains dirty set → enqueues BullMQ jobs |
| `ResumeBuilder-backend/crdt/persistenceWorker.js` | BullMQ worker → encodes Y.Doc → writes to MongoDB |
| `resumebuilder-frontend/src/crdt/yjsSetup.js` | Y.Doc + WebsocketProvider + IndexeddbPersistence factory |
| `resumebuilder-frontend/src/crdt/useYjsDocument.jsx` | React hook: Y.Doc → plain JS state |
| `resumebuilder-frontend/src/crdt/yjsResumeDataHandlers.js` | Y.Doc mutation handlers |
| `resumebuilder-frontend/src/project.jsx` | Main editor page, awareness management, presence toasts |
| `resumebuilder-frontend/src/Components/RightPanel/SharingSection/SharingSection.jsx` | Share UI, online badges |

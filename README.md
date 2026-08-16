# ResumeBuilder

A full-stack, real-time collaborative resume builder with conflict-free multiplayer editing, AI-powered suggestions, ATS scoring, and one-click portfolio deployment.

Multiple users can edit the same resume at the same time — edits merge automatically with zero conflicts and zero data loss, powered by [Yjs](https://yjs.dev/) CRDTs.

---


## Features

| Feature | Description |
|---|---|
| **Live Collaboration** | Multiple users edit the same resume simultaneously. Changes merge conflict-free using Yjs CRDTs |
| **Offline Editing** | Resume data is cached in IndexedDB. Edits made offline sync automatically on reconnect via a State Vector handshake |
| **AI Suggestions** | An isolated Python microservice calls Groq (`llama-3.3-70b-versatile`) to rewrite bullet points for internships, projects, skills, and more |
| **ATS Scorer** | Scores your resume against SDE job criteria and surfaces specific improvements |
| **Portfolio Deploy** | One click deploys a personal portfolio website to Vercel, sourced from your resume data |
| **Resume Templates** | Three templates: IIT KGP, ISI, John Doe (more can be added) |
| **Presence Awareness** | See who else is currently editing the document with live online/offline status |
| **Google OAuth** | Sign in with Google or email/password |
| **CI/CD** | GitHub Actions runs the full test suite on every push/PR and auto-deploys backend, AI service, and frontend from `main` |

---

## Architecture at a Glance

**System components**

```mermaid
flowchart TB
    subgraph Clients["Clients — React + Yjs"]
        A[Browser A]
        B[Browser B]
        C[Browser C]
    end

    subgraph NodeServer["Node.js Server — :3030"]
        WS[Yjs WebSocket Server]
        DM[DocumentManager]
        SIO[Socket.IO — Presence only]
        REST[REST API — Express]
        SCHED[Persistence Scheduler — 30s]
    end

    subgraph RedisLayer["Redis"]
        PUBSUB[Pub/Sub yjs:*]
        QPERSIST[BullMQ yjs-persist queue]
        QAI[BullMQ ai-tasks queue]
    end

    subgraph AIService["AI Microservice — Python / FastAPI"]
        FAPI[FastAPI /health]
        WORKER[BullMQ Worker]
        LLM[Groq LLM Client]
    end

    DB[(MongoDB)]
    GROQ[Groq API — llama-3.3-70b-versatile]

    A -- "ws://.../yjs/:id" --> WS
    B -- "ws://.../yjs/:id" --> WS
    C -- "ws://.../yjs/:id" --> WS

    WS --> DM
    DM -- "marks dirty" --> SCHED
    SCHED -- "enqueue" --> QPERSIST
    QPERSIST --> DB

    WS -- "publish delta" --> PUBSUB
    PUBSUB -- "cross-instance sync" --> WS

    REST -- "enqueue AI job" --> QAI
    QAI --> WORKER
    WORKER --> LLM
    LLM --> GROQ
    WORKER -- "job result" --> QAI
    QAI -- "resolves" --> REST

    A -.presence.-> SIO
    B -.presence.-> SIO
    C -.presence.-> SIO
```

**Real-time edit flow (hot path — zero DB writes)**

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant Y as Y.Doc (client)
    participant WS as Yjs WebSocket Server
    participant DM as DocumentManager
    participant R as Redis Pub/Sub
    participant Peers as Other Server Instances

    U->>Y: Edit field (e.g. name)
    Y->>Y: Generate binary CRDT delta
    Y->>WS: Send delta over WebSocket
    WS->>DM: Apply update to in-memory Y.Doc
    DM->>DM: Mark document dirty
    WS->>U: Broadcast delta to other connected peers
    WS->>R: Publish delta to yjs:<resumeId>
    R->>Peers: Fan out to subscribed instances
    Peers->>Peers: Apply delta (origin='redis')
    Note over DM: Every 30s, dirty docs are flushed<br/>to MongoDB via a BullMQ worker
```

For the full breakdown (DocumentManager internals, legacy migration, security model, file map), see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Monorepo Structure

```
resumebuilder/
├── .github/
│   └── workflows/
│       └── pipeline.yml      # GitHub Actions: test + deploy
├── backend/                  # Node.js + Express + Socket.IO + Yjs WebSocket server
├── frontend/                 # React + Vite + Yjs client
├── microservices/
│   └── ai-service/           # Python + FastAPI + BullMQ worker (AI suggestions & ATS scoring)
└── docs/                     # Architecture and feature documentation
```

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | React 19, Vite | UI rendering, form components |
| **CRDT** | Yjs | Conflict-free replicated data types |
| **Frontend Sync** | y-websocket | WebSocket provider for Yjs |
| **Offline Cache** | y-indexeddb | Browser-side persistence for offline editing |
| **Backend Runtime** | Node.js, Express 5 | HTTP API server |
| **WebSocket** | ws (native) | Binary Yjs sync protocol transport |
| **Presence** | Socket.IO + Redis Adapter | User join/leave notifications |
| **Sync Protocol** | y-protocols | Yjs binary encoding/decoding (sync + awareness) |
| **Message Bus** | Redis Pub/Sub | Cross-instance CRDT delta fanout |
| **Job Queue** | BullMQ + ioredis / bullmq-python | Background persistence & AI job dispatch |
| **Database** | MongoDB (Mongoose) | Cold storage for resume documents |
| **AI Microservice** | Python, FastAPI, uvicorn | Isolated AI processing service |
| **AI Runtime** | Groq API (`llama-3.3-70b-versatile`) | LLM-based ATS scoring & suggestions |
| **File Storage** | Cloudinary | Profile/logo image uploads |
| **Portfolio Deploy** | GitHub API (Octokit) + Vercel API | Deploy pipeline for generated portfolios |
| **Auth** | JWT, Google OAuth 2.0 | Stateless authentication |
| **CI/CD** | GitHub Actions | Test + deploy automation |
| **Testing** | Vitest, Jest, pytest | Frontend, backend, and AI service test suites |

---

## CI/CD Pipeline

Every push and pull request runs the full test suite across all three services. Merges to `main` that pass automatically deploy to production.

```mermaid
flowchart TD
    subgraph Tests["Every push / PR"]
        TF["test-frontend<br/>Vitest"]
        TB["test-backend<br/>Jest"]
        TA["test-ai-service<br/>pytest"]
    end

    GATE{"All tests pass<br/>AND branch = main"}

    DB["deploy-backend<br/>Render"]
    DA["deploy-ai-service<br/>Render"]
    DF["deploy-frontend<br/>Vercel"]

    TF --> GATE
    TB --> GATE
    TA --> GATE
    GATE --> DB
    GATE --> DA
    DB --> DF
    DA --> DF
```

- **test-frontend** — Vitest + React Testing Library (unit + integration smoke test)
- **test-backend** — Jest + Supertest against a testable Express app factory (`app.js`)
- **test-ai-service** — pytest, fully isolated (Groq calls auto-mocked in `conftest.py`, no Redis required)
- **deploy-backend** / **deploy-ai-service** — fire the respective Render deploy hook, run in parallel once tests pass on `main`
- **deploy-frontend** — runs only after both Render deploys succeed; deploys via the Vercel CLI

Required GitHub Actions secrets: `RENDER_DEPLOY_HOOK_URL`, `RENDER_DEPLOY_HOOK_URL_AI`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Full setup steps, troubleshooting, and how to obtain each secret live in [`docs/CICD_SETUP.md`](docs/CICD_SETUP.md).

---

## Deployment Architecture

| Service | Platform | Deploy Trigger | Deployment Model |
|---|---|---|---|
| Backend (Node.js) | Render | Deploy hook fired by `deploy-backend` | Standard Render redeploy of the web service |
| AI Microservice (Python) | Render | Deploy hook fired by `deploy-ai-service` | Standard Render redeploy of the web service |
| Frontend (React/Vite) | Vercel | Vercel CLI deploy fired by `deploy-frontend` | **Blue-green** — Vercel builds and fully warms the new deployment before atomically cutting traffic over, with instant rollback to the previous deployment if needed |

Backend and AI service deploys run in parallel on Render; the frontend only deploys to Vercel once both are confirmed live, so the client is never shipped ahead of an API it depends on.

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB instance
- Redis instance
- GitHub personal access token (for portfolio deploy)
- Vercel API token (for portfolio deploy)
- Groq API key (for AI suggestions & ATS scoring)

### Backend

```bash
cd backend
cp .env.example .env   # fill in your secrets
npm install
npm run dev
```

### AI Microservice

```bash
cd microservices/ai-service
cp .env.example .env   # fill in your secrets
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_BACKEND_URL` in `frontend/.env` to point at your backend.

### Running Tests Locally

```bash
# Frontend (Vitest)
cd frontend && npm test

# Backend (Jest)
cd backend && npm test

# AI Service (pytest — no Redis or Groq key required)
cd microservices/ai-service && pytest test_app.py
```

For CI/CD activation (GitHub Actions secrets, Render/Vercel setup), see [`docs/CICD_SETUP.md`](docs/CICD_SETUP.md).

---

## Documentation

| Doc | Description |
|---|---|
| [System Design](docs/SYSTEM_DESIGN.md) | End-to-end architecture, data flow diagrams, scaling strategy |
| [Real-Time Collaboration](docs/COLLABORATION.md) | How Yjs CRDTs, WebSocket sync, and presence awareness work |
| [Portfolio Deployment](docs/PORTFOLIO_DEPLOY.md) | The full GitHub → Vercel deploy pipeline |
| [CI/CD Setup](docs/CICD_SETUP.md) | GitHub Actions pipeline, secrets, and troubleshooting |
| [Architecture (legacy)](docs/ARCHITECTURE.md) | Original detailed CRDT architecture reference |

---

## License

MIT
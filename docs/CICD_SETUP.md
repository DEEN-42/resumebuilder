# CI/CD Setup Guide — Resume Builder

> Complete step-by-step checklist for activating the GitHub Actions pipeline.

---

## Directory Tree (after setup)

```
resumebuilder/
├── .github/
│   └── workflows/
│       └── pipeline.yml          ← GitHub Actions workflow
├── frontend/
│   ├── package.json              ← +vitest, @testing-library/*, jsdom scripts
│   ├── vite.config.js            ← +test block (environment, globals, setupFiles)
│   └── src/
│       ├── setupTests.js         ← @testing-library/jest-dom setup
│       └── __tests__/
│           ├── toast.unit.test.js          ← Unit: toast utility
│           └── App.integration.test.jsx    ← Integration: App render smoke test
├── backend/
│   ├── package.json              ← +jest, babel-jest, @babel/*, supertest scripts
│   ├── babel.config.json         ← ESM→CJS transform for Jest
│   ├── app.js                    ← Testable Express app factory (NEW)
│   └── __tests__/
│       ├── auth.unit.test.js                    ← Unit: auth middleware
│       ├── userRoutes.integration.test.js       ← Integration: /users routes
│       └── resumeRoutes.integration.test.js     ← Integration: /resumes routes
├── microservices/
│   └── ai-service/
│       ├── app.py                ← FastAPI entry point
│       ├── worker.py             ← BullMQ Python consumer
│       ├── llm_client.py         ← Lazy-initialized Groq client
│       ├── conftest.py           ← Pytest auto-mock fixture for Groq
│       ├── test_app.py           ← Isolated pytest test suite
│       └── requirements.txt      ← +pytest, httpx, pytest-asyncio
└── docs/
    └── CICD_SETUP.md             ← This file
```

---

## Pipeline Flow

```
Every push / PR
    │
    ├── test-frontend  (Vitest)   ──┐
    │                               ├── All three must pass
    ├── test-backend   (Jest)    ──┤
    │                               │
    └── test-ai-service (pytest) ──┘
                                    │
                            push to main only
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
           deploy-backend (Render)     deploy-ai-service (Render)
                    │                                │
                    └───────────────┬────────────────┘
                                    │
                           deploy-frontend (Vercel)
```

---

## Step 1 — Install Dependencies Locally

Run these **once** to install the new test packages:

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install

# AI Service
cd ../microservices/ai-service
pip install -r requirements.txt
```

---

## Step 2 — Verify Tests Run Locally

```bash
# Frontend (Vitest)
cd frontend
npm test
# Expected: all tests pass, process exits cleanly

# Backend (Jest)
cd backend
npm test
# Expected: 3 test suites pass, process exits cleanly

# AI Service (pytest)
cd microservices/ai-service
pytest test_app.py
# Expected: 2 tests pass — no Redis or Groq API key required
```

---

## Step 3 — Create GitHub Repository Secrets

Navigate to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add all five secrets below:

### `RENDER_DEPLOY_HOOK_URL`

| Field | Value |
|---|---|
| **What it is** | A secret HTTPS URL that triggers a new deploy of the **Node.js backend** on Render |
| **How to get it** | Render Dashboard → your backend service → **Settings** → **Deploy Hook** → copy URL |
| **Format** | `https://api.render.com/deploy/srv-XXXXXXXX?key=YYYYYYYY` |

> [!IMPORTANT]
> The Render service must already exist before this URL is available. Create your backend web service on Render first (connect to your GitHub repo, set build command `npm install`, start command `node index.js`).

### `RENDER_DEPLOY_HOOK_URL_AI`

| Field | Value |
|---|---|
| **What it is** | A secret HTTPS URL that triggers a new deploy of the **Python AI microservice** on Render |
| **How to get it** | Render Dashboard → your AI service → **Settings** → **Deploy Hook** → copy URL |
| **Format** | `https://api.render.com/deploy/srv-YYYYYYYY?key=ZZZZZZZZ` |

> [!NOTE]
> This is a separate Render service from the Node.js backend. Create a **Web Service** on Render pointing to `microservices/ai-service/`, with build command `pip install -r requirements.txt` and start command `uvicorn app:app --host 0.0.0.0 --port 8000`.

### `VERCEL_TOKEN`

| Field | Value |
|---|---|
| **What it is** | A Vercel Personal Access Token |
| **How to get it** | [vercel.com/account/tokens](https://vercel.com/account/tokens) → **Create Token** |
| **Scope** | Full Account |

### `VERCEL_ORG_ID`

| Field | Value |
|---|---|
| **What it is** | Your Vercel team or personal account ID |
| **How to get it (CLI)** | `npx vercel teams ls` (team) or `npx vercel whoami --json` (personal) |
| **How to get it (UI)** | Vercel Dashboard → **Settings** → **General** → **Team ID** |
| **Format** | `team_XXXXXXXX` or `user_XXXXXXXX` |

### `VERCEL_PROJECT_ID`

| Field | Value |
|---|---|
| **What it is** | The ID of your Vercel frontend project |
| **How to get it (CLI)** | `cd frontend && npx vercel link` then read `.vercel/project.json` |
| **How to get it (UI)** | Vercel Dashboard → your project → **Settings** → **General** → **Project ID** |
| **Format** | `prj_XXXXXXXX` |

---

## Step 4 — Link Vercel Project (one-time local setup)

```bash
cd frontend
npx vercel login        # authenticate with your Vercel account
npx vercel link         # link this directory to your Vercel project
# Answer the prompts — choose your team/account and existing project
cat .vercel/project.json   # shows orgId and projectId
```

> [!NOTE]
> `.vercel/` is gitignored by default. The pipeline uses the `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` secrets instead of `.vercel/project.json` — they are equivalent.

---

## Step 5 — Push to GitHub

```bash
git add .
git commit -m "feat: add AI microservice with FastAPI + isolated test suite"
git push origin main
```

Then go to your GitHub repository → **Actions** tab. You should see 6 jobs:

| Job | Icon | Trigger |
|---|---|---|
| `test-frontend` | 🧪 | Every push/PR |
| `test-backend` | 🧪 | Every push/PR |
| `test-ai-service` | 🧪 | Every push/PR |
| `deploy-backend` | 🚀 | main push only (all tests pass) |
| `deploy-ai-service` | 🚀 | main push only (all tests pass) |
| `deploy-frontend` | 🚀 | main push only (both deploys pass) |

---

## Secrets Reference Table

| Secret Name | Used In Job | Required? |
|---|---|---|
| `RENDER_DEPLOY_HOOK_URL` | `deploy-backend` | ✅ Yes |
| `RENDER_DEPLOY_HOOK_URL_AI` | `deploy-ai-service` | ✅ Yes |
| `VERCEL_TOKEN` | `deploy-frontend` | ✅ Yes |
| `VERCEL_ORG_ID` | `deploy-frontend` | ✅ Yes |
| `VERCEL_PROJECT_ID` | `deploy-frontend` | ✅ Yes |

---

## Troubleshooting

### Jest hangs after tests complete
Already handled by `--forceExit --detectOpenHandles` in the test script. If it still hangs, check for unmocked `setTimeout` or open event emitters in test files.

### Vitest cannot find module
Check that the mock path in `vi.mock('../path')` is relative to the test file, not to `src/`.

### `pytest` fails with `ModuleNotFoundError`
Run `pip install -r requirements.txt` inside `microservices/ai-service/`. The `requirements.txt` includes `pytest`, `httpx`, and `pytest-asyncio`.

### `pytest` fails with `GroqError: api_key must be set`
The CI pipeline injects `GROQ_API_KEY: "dummy_key_for_tests"` as an env var on the pytest step. If running locally without `.env`, export the variable manually:
```bash
export GROQ_API_KEY=dummy_key_for_tests
pytest test_app.py
```
The `conftest.py` auto-mock fixture intercepts all Groq calls before they reach the network anyway.

### `pytest` asyncio mode error
The tests use explicit `@pytest.mark.asyncio` markers to be compatible across all `pytest-asyncio` versions. If you see a `PytestUnraisableExceptionWarning`, it is cosmetic — tests still pass.

### Render deploy hook returns 4xx
The service may be suspended (free tier) or the hook URL has been regenerated. Get a fresh URL from the Render dashboard.

### Vercel deploy fails with "not linked"
Run `npx vercel link` locally to generate `.vercel/project.json`, then confirm `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` match the values in that file.

### `deploy-backend` runs but `deploy-frontend` is skipped
Check the `if:` condition on `deploy-frontend` — it depends on `needs: [deploy-backend, deploy-ai-service]`. If either upstream deploy is skipped (not failed), downstream jobs are also skipped by GitHub Actions. This is expected behaviour on non-main branches.

---

## npm / pip Scripts Reference

| Directory | Command | What it does |
|---|---|---|
| `frontend/` | `npm test` | Runs Vitest once (CI mode, no watch) |
| `frontend/` | `npm run test:watch` | Runs Vitest in interactive watch mode |
| `frontend/` | `npm run test:coverage` | Runs Vitest with V8 coverage report |
| `backend/` | `npm test` | Runs Jest with `--forceExit --detectOpenHandles` |
| `backend/` | `npm run test:coverage` | Runs Jest with coverage collection |
| `microservices/ai-service/` | `pytest test_app.py` | Runs isolated AI service tests (no Redis/Groq needed) |

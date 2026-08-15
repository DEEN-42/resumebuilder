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
└── docs/
    └── CICD_SETUP.md             ← This file
```

---

## Pipeline Flow

```
Every push / PR
    │
    ├── test-frontend  (Vitest)  ──┐
    │                              ├── Both must pass
    └── test-backend   (Jest)   ──┘
                                   │
                           push to main only
                                   │
                          deploy-backend (Render)
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
```

---

## Step 3 — Create GitHub Repository Secrets

Navigate to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add all four secrets below:

### `RENDER_DEPLOY_HOOK_URL`

| Field | Value |
|---|---|
| **What it is** | A secret HTTPS URL that triggers a new deploy on Render |
| **How to get it** | Render Dashboard → your service → **Settings** → **Deploy Hook** → copy URL |
| **Format** | `https://api.render.com/deploy/srv-XXXXXXXX?key=YYYYYYYY` |

> [!IMPORTANT]
> The Render service must already exist before this URL is available. Create your backend web service on Render first (connect to your GitHub repo, set build command `npm install`, start command `node index.js`).

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
git commit -m "feat: add CI/CD pipeline with Jest/Vitest tests"
git push origin main
```

Then go to your GitHub repository → **Actions** tab. You should see 4 jobs:

| Job | Icon | Trigger |
|---|---|---|
| `test-frontend` | 🧪 | Every push/PR |
| `test-backend` | 🧪 | Every push/PR |
| `deploy-backend` | 🚀 | main push only |
| `deploy-frontend` | 🚀 | main push only |

---

## Secrets Reference Table

| Secret Name | Used In Job | Required? |
|---|---|---|
| `RENDER_DEPLOY_HOOK_URL` | `deploy-backend` | ✅ Yes |
| `VERCEL_TOKEN` | `deploy-frontend` | ✅ Yes |
| `VERCEL_ORG_ID` | `deploy-frontend` | ✅ Yes |
| `VERCEL_PROJECT_ID` | `deploy-frontend` | ✅ Yes |

---

## Troubleshooting

### Jest hangs after tests complete
Already handled by `--forceExit --detectOpenHandles` in the test script. If it still hangs, check for unmocked `setTimeout` or open event emitters in test files.

### Vitest cannot find module
Check that the mock path in `vi.mock('../path')` is relative to the test file, not to `src/`.

### Render deploy hook returns 4xx
The service may be suspended (free tier) or the hook URL has been regenerated. Get a fresh URL from the Render dashboard.

### Vercel deploy fails with "not linked"
Run `npx vercel link` locally to generate `.vercel/project.json`, then confirm `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` match the values in that file.

### `deploy-backend` runs but `deploy-frontend` is skipped
Check the `if:` condition on `deploy-frontend` — it inherits the `needs: [deploy-backend]` condition. If `deploy-backend` is skipped (not failed), downstream jobs are also skipped by GitHub Actions. This is expected behaviour on non-main branches.

---

## npm Scripts Reference

| Directory | Script | What it does |
|---|---|---|
| `frontend/` | `npm test` | Runs Vitest once (CI mode, no watch) |
| `frontend/` | `npm run test:watch` | Runs Vitest in interactive watch mode |
| `frontend/` | `npm run test:coverage` | Runs Vitest with V8 coverage report |
| `backend/` | `npm test` | Runs Jest with `--forceExit --detectOpenHandles` |
| `backend/` | `npm run test:coverage` | Runs Jest with coverage collection |

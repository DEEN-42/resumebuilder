# Portfolio Deployment

This document covers the end-to-end pipeline that takes a user's resume data and publishes a live portfolio website on Vercel — including the first-time deploy flow, the update flow, and how the frontend polls for job status.

---

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [First-Time Deploy Flow](#first-time-deploy-flow)
4. [Update Flow](#update-flow)
5. [BullMQ Job Lifecycle](#bullmq-job-lifecycle)
6. [Portfolio Template](#portfolio-template)
7. [Frontend: DeployPortfolio Component](#frontend-deployportfolio-component)
8. [API Reference](#api-reference)
9. [Required Environment Variables](#required-environment-variables)
10. [Key Files](#key-files)

---

## Overview

When a user clicks **Deploy** in the editor, their current resume data is turned into a standalone, publicly accessible portfolio website. The website is:

- Hosted on **Vercel** (free tier, custom subdomain)
- Sourced from a **private GitHub repository** created on the user's behalf under a server-managed GitHub account
- Auto-updated on every subsequent deploy by pushing a new commit to the same repo, which triggers Vercel's CI/CD

The deploy process is **asynchronous** — the HTTP request returns a job ID immediately and the frontend polls for completion.

---

## Pipeline Architecture

```
User clicks "Deploy"
        │
        ▼
POST /deploy/:resumeId
  (validates ownership, enqueues BullMQ job)
        │
        ▼ returns { jobId }
        │
  Frontend polls GET /deploy/status/:jobId
        │
        ▼
  BullMQ Worker picks up job
        │
        ├─── First deploy? ─── YES ──►  Create GitHub repo
        │                               Commit index.html, styles.css, script.js
        │                               Create Vercel project (linked to repo)
        │                               Trigger Vercel deployment
        │                               Save githubRepo + vercelUrl to MongoDB
        │                               Send confirmation email
        │
        └─── First deploy? ─── NO  ──►  Fetch existing script.js SHA
                                        Push updated script.js to existing repo
                                        Vercel auto-deploys from the push
                                        Return existing vercelUrl
```

---

## First-Time Deploy Flow

### 1. Request validation (`deployController.js`)

- Auth middleware verifies JWT.
- The endpoint confirms the resume exists and the requester is the **owner** (collaborators cannot deploy).
- `resumeData` must be present in the request body.
- A BullMQ job is added to the `deploy` queue with `{ resumeId, userEmail, resumeData }`.
- HTTP 202 is returned immediately with `{ jobId }`.

### 2. Unique repo name generation

A deterministic-but-unique repo name is generated so names don't collide across users:

```js
function generateRepoName(resumeId) {
  const hash   = sha256(resumeId).slice(0, 12);   // stable across deploys
  const ts     = Date.now().toString(36).slice(-7); // time component
  const random = randomBytes(2).hex().slice(0, 3);  // extra entropy
  return `portfolio-${hash}-${ts}-${random}`;
}
```

### 3. GitHub repo creation (Octokit)

Using the server's `GITHUB_TOKEN`:
- `octokit.repos.createForAuthenticatedUser({ name: repoName, private: true })`
- Three files are committed in sequence:
  - `index.html` — static HTML shell
  - `styles.css` — portfolio stylesheet
  - `script.js` — the template script with resume data injected (see [Portfolio Template](#portfolio-template))

### 4. Vercel project creation

```
POST https://api.vercel.com/v9/projects
{
  "name": repoName,
  "gitRepository": {
    "type": "github",
    "repo": "<GITHUB_USERNAME>/<repoName>"
  }
}
```

Vercel detects the new GitHub repo and creates a project linked to it.

### 5. Vercel deployment trigger

```
POST https://api.vercel.com/v13/deployments
{
  "name": repoName,
  "gitSource": { "type": "github", "ref": "main", "repoId": <id> },
  "projectSettings": { "framework": null }
}
```

The deployment URL is extracted from the response.

### 6. Persisting deployment info

`Resume.findOneAndUpdate` saves:
```js
deployment: {
  githubRepo: repoName,
  vercelUrl:  "https://<repoName>.vercel.app"
}
```

### 7. Confirmation email

`sendInstantEmail` is called to notify the user that their portfolio is live, including the URL.

---

## Update Flow

If `resume.deployment.githubRepo` already exists in MongoDB, the worker skips repo/project creation entirely:

1. Fetch the current `script.js` file metadata (to get the blob SHA required by GitHub's API for updates).
2. Commit the new `script.js` content using `createOrUpdateFileContents` with the SHA.
3. GitHub pushes the commit → Vercel detects the push → triggers an automatic redeploy.
4. Returns the existing `vercelUrl` — no new URL is generated.

This means **redeploying is fast** — only one GitHub API call is made.

---

## BullMQ Job Lifecycle

```
State: waiting → active → completed | failed
```

Job configuration:
```js
{
  removeOnComplete: 100,   // keep last 100 completed jobs
  removeOnFail:     50,    // keep last 50 failed jobs
  attempts:         2,     // retry once on failure
  backoff: { type: 'exponential', delay: 5000 }
}
```

The frontend polls `GET /deploy/status/:jobId` every 3 seconds. Possible responses:

| `status` | Meaning |
|---|---|
| `waiting` | Job queued, not yet picked up |
| `active` | Worker is currently processing |
| `completed` | Deploy succeeded, `result.url` contains the live URL |
| `failed` | Deploy failed, `error` contains the reason |

---

## Portfolio Template

The portfolio website is a **vanilla HTML/CSS/JS** single-page site. It lives in `backend/portfolio-template/` and has three files:

| File | Role |
|---|---|
| `index.html` | Static HTML structure — hero, nav, sections container, contact |
| `styles.css` | Full responsive stylesheet with animated background and dark theme |
| `script-template.js` | JS that reads `resumeData` and populates the DOM at runtime |

### Data injection

Before committing, the worker does a single string replacement:

```js
const finalScript = scriptTemplate.replace(
  '__RESUME_DATA__',
  JSON.stringify(resumeData, null, 2)
);
```

The `__RESUME_DATA__` placeholder in `script-template.js` becomes a literal JS object. The script then reads from it to render the name, education table, internship cards, project cards, skills, contact links, and profile picture.

This means **no API calls are made from the deployed portfolio** — the data is baked in at deploy time.

---

## Frontend: DeployPortfolio Component

Located at `frontend/src/Components/DeployPortfolio/DeployPortfolio.jsx`.

### User flow

1. User navigates to the **Deploy** tab in the left panel.
2. Component shows the current deployed URL (if any) loaded from `/resumes/load/:id`.
3. User clicks **Deploy / Redeploy**.
4. Component `POST /deploy/:id` with the current `resumeData`.
5. On receiving `{ jobId }`, starts a polling interval calling `GET /deploy/status/:jobId` every 3 seconds.
6. While `status === 'active'` or `'waiting'`, a progress indicator is shown.
7. On `status === 'completed'`, the live URL is displayed and the interval clears.
8. On `status === 'failed'`, an error toast is shown.

The deployed URL is stored in `project.jsx`'s `deployedUrl` state so the Header can also display it.

---

## API Reference

### `POST /deploy/:id`

Enqueue a deploy job.

**Auth:** Bearer JWT (must be resume owner)

**Body:**
```json
{ "resumeData": { ... } }
```

**Response 202:**
```json
{ "message": "Deployment job queued.", "jobId": "42" }
```

---

### `GET /deploy/status/:jobId`

Poll job progress.

**Auth:** Bearer JWT

**Response:**
```json
{ "status": "completed", "result": { "url": "https://portfolio-abc123.vercel.app" } }
```
```json
{ "status": "failed", "error": "Vercel project creation failed: ..." }
```
```json
{ "status": "active" }
```

---

## Required Environment Variables

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | Personal access token with `repo` scope |
| `GITHUB_USERNAME` | GitHub account that will own the portfolio repos |
| `VERCEL_TOKEN` | Vercel API token with deploy permissions |
| `REDIS_URL` | Redis connection string (BullMQ uses this for the deploy queue) |

---

## Key Files

| File | Role |
|---|---|
| `backend/Controllers/deployController.js` | HTTP handlers: validate request, enqueue job, poll status |
| `backend/jobs/deployWorker.js` | BullMQ worker: GitHub + Vercel API calls, email notification |
| `backend/jobs/deployQueue.js` | BullMQ queue factory |
| `backend/Routes/deployRoute.js` | Express route wiring |
| `backend/portfolio-template/index.html` | Static portfolio HTML shell |
| `backend/portfolio-template/styles.css` | Portfolio stylesheet |
| `backend/portfolio-template/script-template.js` | Runtime data renderer with `__RESUME_DATA__` placeholder |
| `frontend/src/Components/DeployPortfolio/DeployPortfolio.jsx` | Deploy UI with job polling |

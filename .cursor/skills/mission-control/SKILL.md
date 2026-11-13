---
name: mission-control
description: >-
  Work on Testing123me Mission Control (artifacts/dashboard and artifacts/api-server).
  Use when changing chat, agents, health, models, sessions, tasks, or the dashboard UI,
  or when running typecheck, tests, or the dev server for this repo.
---

# Mission Control

Agentic OS dashboard plus Express API. Do not deploy. Do not push to `main`. Do not commit secrets. Read keys only from environment variables.

## Run

Dashboard needs both variables or Vite exits before it listens:

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/dashboard run dev
```

API:

```bash
PORT=5000 pnpm --filter @workspace/api-server run dev
```

`DATABASE_URL` must be a Postgres URL. The server throws at import time without it. There is no SQLite and no websocket server.

## Checks

```bash
pnpm run typecheck
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/api-server --filter @workspace/dashboard run build
pnpm --filter @workspace/api-server test
```

API tests are `node:test` files under `artifacts/api-server/src/lib/*.test.ts`. Import local modules with a `.ts` extension so Node can strip types. There is no ESLint config.

The dashboard calls `/api/...`. If the API is down, Vite returns `index.html` with status 200. Treat a non-array list or a stats payload without `totalAgents` as an error. Do not default that data to `[]` or `0`.

## Where behavior lives

- Chat prompt, history bound (20 turns, 24,000 characters), and message length: `artifacts/api-server/src/lib/chatContext.ts`
- Save, model call, rollback: `artifacts/api-server/src/lib/sessionReply.ts`
- Model ids and `HERMES_API_KEY`: `artifacts/api-server/src/lib/models.ts`. Hermes base URL defaults to `https://inference-api.nousresearch.com/v1`.
- Health ping: `artifacts/api-server/src/lib/health.ts`. Status `ok` only after `select 1`.
- Client errors: `artifacts/api-server/src/lib/errorHandler.ts`. Zod and invalid JSON are 400. Other failures are a generic 500. Route ids must be positive integers.
- UI: `artifacts/dashboard/src/pages/` and `artifacts/dashboard/src/components/layout/`.

Provider errors that look like keys, secrets, or bearer tokens must not be sent to the browser. Configuration errors such as a missing `OPENAI_API_KEY` may be returned as written.

## Env names

`DATABASE_URL`, `PORT`, `BASE_PATH`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `HERMES_API_KEY`, optional `HERMES_BASE_URL`.

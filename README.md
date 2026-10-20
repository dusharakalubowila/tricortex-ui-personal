# Agentic Kernel Console (UI)

A React/Vite/TypeScript frontend for the `ai-agentic-kernel` API service
(`ai-agentic-kernel/api/`), covering task submission/monitoring, lifecycle control,
approvals, the event feed, and governance (cost/policy/guardrails/compliance report)
visibility.

## Prerequisites

- Node.js 18+
- The API service running (`uvicorn agentic_kernel_api.main:app`), by default at
  `http://localhost:8000`

## Setup

```bash
cd ai-agentic-kernel/ui
npm install
cp .env.example .env   # adjust VITE_API_BASE_URL if the API runs elsewhere
```

## Development

```bash
npm run dev
```

Requests to `/api/*` are proxied to `http://localhost:8000` in dev
(see `vite.config.ts`); direct requests use `VITE_API_BASE_URL` via
`src/api/client.ts`.

## Build

```bash
npm run build
```

## Test

```bash
npm test -- --run
```

## Routes

- `/` — task list and submission
- `/tasks/:id` — task detail with lifecycle controls
- `/approvals` — approvals queue
- `/events` — event feed
- `/governance` — cost, policy/guardrails, compliance report

This package is independent of `agent-platform/frontend`; it shares no
`node_modules` or build configuration with it, though it follows the same
React/Vite/TypeScript/Tailwind stack convention used elsewhere in this workspace.

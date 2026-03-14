# OpenClaw Inspector Web

This folder contains the current local-first web milestone for OpenClaw Inspector.

## What this milestone adds

- Next.js app shell for dashboard, sessions, maintenance, and settings
- Read-only route handlers under `app/api/`
- A small adapter seam in `lib/session-adapter.ts`
- Normalized API contracts in `lib/normalizers.ts`
- A session detail route at `app/sessions/[key]/page.tsx`
- Honest labeling that the current source is still mock / stubbed data

## Current truth

This build is **not connected to live OpenClaw data yet**.

Today the adapter reads in-memory sample sessions from `lib/mock-data.ts`, then normalizes them into stable response shapes for:

- `GET /api/health`
- `GET /api/sessions`
- `GET /api/sessions/[key]`

That is intentional. The goal of this milestone is to make the UI and backend contract real before swapping the data source.

## Planned source swap

The adapter is designed so the source layer can later change without rewriting the pages.

Planned next sources:

1. **OpenClaw CLI mode**
   - shell out to commands like `openclaw ... --json`
   - normalize the JSON inside `lib/session-adapter.ts`
2. **Gateway mode**
   - fetch session data from a running Gateway
   - keep the same normalized response contracts

## Project structure

```text
web/
├── app/
│   ├── api/
│   │   ├── health/route.ts
│   │   └── sessions/
│   │       ├── route.ts
│   │       └── [key]/route.ts
│   ├── maintenance/page.tsx
│   ├── sessions/
│   │   ├── [key]/page.tsx
│   │   └── page.tsx
│   ├── settings/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── app-shell.tsx
├── lib/
│   ├── mock-data.ts
│   ├── normalizers.ts
│   └── session-adapter.ts
├── next.config.mjs
├── package.json
└── tsconfig.json
```

## Local run instructions

This task did **not** install dependencies or fetch anything from the network.

### If dependencies are already available

```bash
cd openclaw-inspector/web
npm run dev
```

Then open:

- `http://localhost:3000/`
- `http://localhost:3000/sessions`
- `http://localhost:3000/api/health`
- `http://localhost:3000/api/sessions`

### If dependencies are not installed yet

`node_modules/` is not included by this milestone. Install later in a network-allowed step, then run the same commands above.

## Validation notes

Safe validation for this milestone should prefer:

- `git diff --check`
- `npm run build` once dependencies exist
- a quick browser check of `/`, `/sessions`, and the API routes

## Design guardrails

- Read-only by default
- Mock/stubbed data must be labeled clearly
- Route handlers should expose stable adapter contracts, not raw UI-only props
- Local-first now, Gateway-ready later

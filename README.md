# OpenClaw Inspector

**A local-first observability dashboard for OpenClaw.**

OpenClaw Inspector turns raw sessions, transcripts, tool traces, maintenance output, and connection state into a UI you can actually reason about.

Instead of digging through JSONL files, CLI output, and scattered runtime state, you get a clean control surface for understanding what happened, where context went, which tools ran, and which session store looks unhealthy.

---

## Why this exists

OpenClaw already has strong primitives:

- sessions
- transcripts
- tool calls and results
- compaction
- subagents
- maintenance / cleanup
- gateway-based routing

What it lacks is a **product-grade inspection surface**.

OpenClaw Inspector is meant to be that missing layer:

- **see** what is happening
- **debug** a single session deeply
- **spot** operational issues quickly
- **switch** between local and remote data sources safely
- **understand** the system without living in logs

---

## What it does today

Current product surfaces:

- **Dashboard**
  - attention-oriented summary cards
  - session mix / channel mix
  - context-heavy sessions
  - maintenance pulse and health ratios

- **Sessions Explorer**
  - real session listing
  - client-side filtering and search
  - session status pills
  - pagination
  - saved-view scaffolding / pinning UX direction

- **Session Detail**
  - transcript view
  - tool trace view
  - stats view
  - export actions
  - model snapshot insights
  - search-focused deep links into exact matching messages

- **Search**
  - transcript search across recent sessions
  - result pagination
  - jump-to-message flows into Session Detail

- **Maintenance**
  - session store health dashboard
  - cleanup dry-run analytics
  - per-agent store breakdown

- **Settings**
  - data source control panel
  - local Gateway / local CLI / mock modes
  - **remote Gateway support** via URL + token/password
  - runtime health cards showing what is actually reachable

---

## What makes it interesting

A lot of “AI dashboards” stop at vanity metrics.

This one is trying to be useful for people actually operating agents.

### 1. Session-first, not prompt-gallery-first
The core unit is the **session**: what the user asked, what tools ran, how the transcript evolved, and where the run went weird.

### 2. Local-first, remote-ready
You can inspect a local OpenClaw environment, but the Settings page now also supports the very real setup of:

> browser/UI on your laptop, OpenClaw Gateway on a server

### 3. Honest about source mode
The UI makes it clear whether data is coming from:

- local Gateway
- local CLI
- remote Gateway
- mock fallback

### 4. Operationally useful maintenance visibility
Instead of hiding cleanup behind a CLI command, the app can show:

- which stores would mutate
- whether missing references exist
- where cleanup pressure is concentrated

---

## Current status

This repo is no longer just docs-first bootstrap material.

It already contains a working **read-only inspector MVP** under `web/` with:

- live local session reads
- transcript inspection
- export actions
- search
- maintenance preview
- remote data source settings

It is still intentionally **read-only by default**.

That means the product is already useful for inspection and debugging, while avoiding unsafe “oops I mutated production” behavior.

---

## Quickstart

### Requirements

- Node.js 22+
- an OpenClaw environment available locally **or** a reachable remote Gateway

### Run locally

```bash
cd web
npm install
npm run dev
```

Then open:

- `http://localhost:3000`

### Build for production

```bash
cd web
npm run build
npm run start
```

---

## Data source modes

Inspector currently supports these read modes:

- **Auto local**
  - prefer local Gateway
  - fallback to local CLI
  - fallback to mock

- **Local Gateway**
  - strict live local Gateway reads

- **Local CLI**
  - direct local CLI-backed reads

- **Remote Gateway**
  - connect to a remote OpenClaw Gateway with:
    - `ws://` or `wss://` URL
    - token or password

- **Mock**
  - useful for UI development, demos, and screenshots

**Note:** Maintenance is still local-only because cleanup dry-runs execute through the local machine’s OpenClaw CLI.

---

## Repo structure

```text
openclaw-inspector/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── FEATURES.md
│   ├── MVP.md
│   ├── PRD.md
│   ├── ROADMAP.md
│   └── TASKS.md
└── web/
    ├── app/
    ├── components/
    ├── lib/
    ├── package.json
    └── ...
```

### Useful docs

- `docs/PRD.md` — product intent
- `docs/FEATURES.md` — surface-by-surface feature inventory
- `docs/MVP.md` — first useful release boundary
- `docs/ARCHITECTURE.md` — implementation model and integration seams
- `docs/ROADMAP.md` — phased delivery plan

---

## Product principles

- **Read-only by default**
- **Show the truth about the source**
- **Make one session deeply understandable**
- **Prefer useful operational views over flashy vanity widgets**
- **Local-first now, remote-ready when it matters**

---

## Roadmap direction

Near-term priorities:

- sharpen the dashboard further
- improve search UX
- continue polishing session workflows
- keep maintenance and settings genuinely useful
- make the inspector feel like a product, not a debug prototype

Later directions:

- safe action layer
- better live observability
- richer lineage / topology stories where they actually add value
- team / multi-Gateway workflows

---

## What this is **not**

This is **not** trying to replace OpenClaw itself.

It is the layer on top that helps you:

- inspect
- debug
- understand
- operate

OpenClaw runs the agents.
OpenClaw Inspector helps humans make sense of them.

---

## Contributing

This project is still early, so the most useful contributions are usually:

- bug reports with screenshots or reproduction steps
- UX feedback on confusing surfaces
- ideas for better session debugging flows
- improvements to the data-source and maintenance story

If you open issues, the best ones are the ones that answer:

> what did you expect to understand in 5 seconds, and what blocked that?

---

## License

License is not set yet.

If you plan to make the repo public, pick one before broad distribution:

- **MIT** for maximum permissiveness
- **Apache-2.0** if you want an explicit patent grant
- **GPL-3.0** if you want stronger copyleft

---

## Final pitch

If OpenClaw is the runtime,
**OpenClaw Inspector is the glass panel.**

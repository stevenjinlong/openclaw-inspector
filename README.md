# OpenClaw Inspector

Visualize, debug, and control your OpenClaw agent sessions.

## Working thesis

OpenClaw already has strong primitives: sessions, subagents, compaction, context inspection, channel routing, maintenance, and multi-agent topologies. What it lacks is a dedicated visual control plane that makes those primitives understandable at a glance.

OpenClaw Inspector is meant to be that control plane.

## Product promise

- See every session in one place
- Understand what happened inside a run
- Inspect tool calls, context growth, compaction, and subagent activity
- Export useful debug bundles instead of raw chaos
- Control session lifecycle without living in logs and JSONL files

## Initial scope

This repository starts with product/design docs first:

- `docs/PRD.md` — product requirements and user goals
- `docs/FEATURES.md` — complete feature inventory by surface
- `docs/MVP.md` — first release boundary
- `docs/ARCHITECTURE.md` — technical design and integration modes
- `docs/ROADMAP.md` — phased delivery plan
- `docs/TASKS.md` — initial issue-style implementation breakdown

A future implementation will likely include:

- `web/` — frontend app
- `server/` or `backend/` — adapter/service layer for Gateway + CLI integration

## Product shape

Primary surfaces:

1. Dashboard
2. Sessions explorer
3. Session detail inspector
4. Maintenance + cleanup preview
5. Topology / routing graph
6. Settings / connection management

## Design principles

- Local-first for solo builders, remote-ready for team setups
- Gateway is the source of truth
- Raw transcript access should always be one click away
- Expensive/unsafe actions must be explicit and auditable
- The best screen is the one that answers “what just happened?” in 5 seconds

## Current status

Planning and bootstrap stage.

The current milestone is to define the product clearly enough that implementation can begin without rediscovering the shape every day.

# Roadmap — OpenClaw Inspector

## Phase 0 — Product definition

Goal:
- Lock the product shape before code sprawls

Deliverables:
- README
- PRD
- Feature inventory
- MVP definition
- Architecture note
- Initial task breakdown

Status:
- In progress / bootstrap

## Phase 1 — Skeleton app

Goal:
- Produce a minimal but runnable app shell

Deliverables:
- Frontend app scaffold
- Basic layout and navigation
- Placeholder routes/pages
- Adapter/backend skeleton
- Health check endpoint

Exit criteria:
- App runs locally
- Sessions page loads mocked or adapter-backed data

## Phase 2 — Sessions explorer MVP

Goal:
- Make the product useful immediately

Deliverables:
- Session list page
- Search/filter/sort
- Session detail page
- Transcript view
- Tool inspector view
- Stats summary
- Export actions

Exit criteria:
- A real OpenClaw local environment can be inspected end to end

## Phase 3 — Context + maintenance

Goal:
- Expose hidden operational mechanics

Deliverables:
- Context tab with contributor breakdown
- Maintenance page
- Cleanup dry-run preview
- Stale session surfacing

Exit criteria:
- A user can explain context bloat and preview cleanup safely

## Phase 4 — Controls

Goal:
- Turn Inspector into a control surface, not only a viewer

Deliverables:
- Optional safe action layer
- Stop/reset/compact controls
- sessions_send helper
- Action confirmations and audit UX

Exit criteria:
- Operators can perform common session actions from UI without feeling unsafe

## Phase 5 — Topology + advanced debugging

Goal:
- Showcase OpenClaw’s unique multi-agent/session model

Deliverables:
- Topology graph
- Subagent lineage view
- Compaction markers/diff concepts
- Failure forensics view

Exit criteria:
- The app demonstrates features that are visually impressive and operationally useful

## Phase 6 — Live observability

Goal:
- Move from static inspection to live operational awareness

Deliverables:
- Live run updates
- Active session streaming UI
- Optional real-time event tail

Exit criteria:
- Active work can be followed in near real time

## Shipping philosophy

Ship value in layers:

1. See sessions
2. Understand one session deeply
3. Understand why it got weird
4. Control it safely
5. Visualize the whole system

Do not reverse this order.
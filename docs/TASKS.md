# Initial Tasks — OpenClaw Inspector

This file turns the plan into issue-sized chunks.

## Milestone A — Bootstrap

### A1. Repository structure
- Create `docs/`, `web/`, and future adapter location
- Add root README and project overview
- Add `.gitignore` when implementation begins

### A2. Design docs
- Write PRD
- Write feature inventory
- Write MVP boundary
- Write architecture note
- Write roadmap

## Milestone B — App skeleton

### B1. Frontend scaffold
- Choose stack (recommended: Next.js + TypeScript)
- Initialize app shell
- Add shared layout
- Add navigation/sidebar
- Add placeholder routes

### B2. Adapter scaffold
- Add backend folder or route handlers
- Define normalized response schemas with Zod
- Add health endpoint
- Add session list endpoint stub

## Milestone C — Sessions explorer

### C1. Session list data pipeline
- Fetch session summaries from adapter
- Normalize kinds/channels/status badges
- Add error/loading states

### C2. Session list UI
- Table/list rendering
- Search bar
- Filters
- Sorting
- Empty state

## Milestone D — Session detail MVP

### D1. Detail route + state
- Dynamic route for session key
- Fetch summary + history
- Handle missing sessions and loading states

### D2. Transcript tab
- Chronological renderer
- Tool result folding
- Search within transcript
- Large message collapse behavior

### D3. Tools tab
- Extract/derive tool call blocks
- Card UI for inputs/outputs
- Filter by tool name
- Copy raw payload action

### D4. Stats tab
- Token summary
- Model + session metadata
- Aborted marker / basic badges

## Milestone E — Export

### E1. Markdown export
- Convert transcript to readable Markdown
- Download or copy action

### E2. JSON export
- Structured bundle for transcript + summary
- Redaction hooks later if needed

## Milestone F — Context and maintenance

### F1. Context panel
- Define data contract
- Show system/injected/tool/history estimates
- Add simple chart

### F2. Maintenance preview
- Adapter endpoint for cleanup dry-run
- UI for before/after/pruned/capped
- Candidate session list

## Milestone G — Safe controls

### G1. Action framework
- Read-only mode default
- Feature flag for write actions
- Confirmation modal pattern

### G2. Session actions
- Stop
- Compact
- Reset
- Send message

## Milestone H — Advanced visuals

### H1. Subagent tree
- Identify parent/child linkage
- Tree rendering
- Child navigation

### H2. Topology
- Graph data model
- Graph rendering
- Focus/filters

### H3. Failure forensics
- Error summary view
- Last-successful-step heuristic
- Diagnostic export improvements

## Immediate next step recommendation

Start with B1 + B2 + C1 + C2 + D1 + D2.

That gives the first visibly useful product slice fast.
# Architecture — OpenClaw Inspector

## 1. High-level architecture

OpenClaw Inspector should be built as a web application with a thin adapter/backend layer.

Why:
- OpenClaw session truth lives with the Gateway / session store
- Local-only file scraping is convenient but not sufficient
- We want one UI that can support both local and remote deployments

Recommended shape:

- `web/` — React/Next.js frontend
- `server/` or `backend/` — adapter service exposing normalized JSON endpoints
- OpenClaw data source — Gateway API preferred, CLI fallback for local mode

## 2. Integration modes

### Mode A — Gateway API mode (preferred)

Use the running Gateway as the source of truth.

Benefits:
- Works for remote Gateway setups
- Respects OpenClaw’s session ownership model
- Avoids direct parsing assumptions in the UI

Likely data sources:
- sessions list/history endpoints or tool-invoke endpoints
- status/context-related gateway calls where available
- future event streaming hooks if exposed

### Mode B — Local CLI mode (practical fallback)

Use a local backend process that shells out to `openclaw` commands and parses JSON.

Examples:
- `openclaw sessions --json`
- `openclaw sessions cleanup --dry-run --json`
- `openclaw gateway call ...`

Benefits:
- Fastest way to get a useful local developer build working
- Low initial complexity

Tradeoff:
- Harder to support remote setups cleanly
- Some outputs may need normalization

### Mode C — Local file augmentation (optional)

Use local transcript/store file reads only for supplementary details when the adapter cannot derive them otherwise.

Examples:
- reading transcript JSONL files for export
- reading session store metadata for local-only debug views

Important:
- This mode must never become the sole source of truth
- It should be treated as a local optimization / fallback

## 3. Recommended stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui or similar component primitives
- TanStack Query for data fetching/caching
- Zod for runtime validation of API responses

### Visualization
- Recharts or Nivo for charts
- React Flow or Cytoscape.js for topology/graph work later

### Backend adapter
- Node.js + TypeScript
- Fastify or Next.js route handlers
- Zod for boundary validation

## 4. Domain model

The UI should normalize data into a small set of stable app-level entities.

### 4.1 SessionSummary
- key
- sessionId
- kind
- channel
- displayName
- updatedAt
- model
- contextTokens
- totalTokens
- thinkingLevel
- verboseLevel
- abortedLastRun
- transcriptPath
- origin
- deliveryContext

### 4.2 TranscriptMessage
- id or stable index
- role
- timestamp if available
- content
- raw payload
- messageType (user | assistant | toolResult | system | compaction | reset)
- toolName if derivable
- isCollapsedDefault

### 4.3 ToolInvocation
- name
- transcriptIndex
- input
- output
- outputSize
- status
- durationMs if known

### 4.4 ContextReport
- systemPromptChars/tokens estimate
- injectedFiles[]
- toolSchemaChars/tokens estimate
- historyChars/tokens estimate
- topContributors[]

### 4.5 MaintenanceReport
- beforeCount
- afterCount
- pruned
- capped
- candidateSessions[]
- diskEstimate

## 5. Initial API design

Adapter endpoints can look like this:

### Read endpoints
- `GET /api/health`
- `GET /api/agents`
- `GET /api/sessions`
- `GET /api/sessions/:sessionKey`
- `GET /api/sessions/:sessionKey/history?includeTools=true`
- `GET /api/sessions/:sessionKey/tools`
- `GET /api/sessions/:sessionKey/export?format=md|json`
- `GET /api/maintenance/preview`

### Later action endpoints
- `POST /api/sessions/:sessionKey/stop`
- `POST /api/sessions/:sessionKey/compact`
- `POST /api/sessions/:sessionKey/reset`
- `POST /api/sessions/:sessionKey/send`
- `POST /api/maintenance/enforce`

## 6. Frontend information architecture

### Primary route map
- `/` → Dashboard
- `/sessions` → Sessions explorer
- `/sessions/[key]` → Session detail
- `/maintenance` → Maintenance
- `/topology` → Topology (later)
- `/settings` → Settings

### Session detail layout
- Header summary row
- Main content tabs:
  - Transcript
  - Tools
  - Stats
  - Context (later or stretch)
  - Export
- Right-side metadata panel or collapsible drawer

## 7. Data refresh strategy

### MVP
- Manual refresh button
- Optional light auto-refresh every 15–30 seconds for active lists
- No true live event streaming required

### Later
- SSE or WebSocket for live session/run updates
- View-level subscription only when the user is watching an active session

## 8. Safety model

Default operating mode should be read-only.

Rules:
- No write action endpoints enabled by default
- Any stop/reset/compact/cleanup must require explicit opt-in and confirmation
- UI must label data source mode clearly (Gateway vs CLI vs local file fallback)
- Local transcript/file access must be visibly marked as local-only behavior

## 9. Performance considerations

- Session list should paginate or virtualize if counts get large
- Transcript rendering must support folding and incremental rendering
- Large tool outputs should be collapsed by default
- Avoid overfetching transcript history on list views
- Cache normalized session summaries client-side for smooth navigation

## 10. Open questions

- What is the cleanest supported route to fetch run-built context reports?
- Which Gateway APIs are stable enough for remote mode in v1?
- How much timing information can be derived reliably from current transcripts?
- Should topology derive only from sessions, or also from config/bindings?

## 11. Recommendation

Build local CLI-backed mode first for speed, but keep the adapter abstraction clean enough that Gateway mode can replace it without rewriting the UI.

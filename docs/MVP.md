# MVP Definition — OpenClaw Inspector

## MVP goal

Ship a first version that is genuinely useful for debugging and exploring OpenClaw sessions, without waiting for live streaming, topology graphs, or advanced maintenance controls.

The MVP should answer:

- What sessions exist?
- Which one should I inspect?
- What happened inside this session?
- Which tool calls happened?
- Can I export something useful from it?

## MVP scope

### 1. App shell
- Left navigation
- Sessions page as primary entry point
- Basic dashboard cards (small summary only)
- Connection status indicator

### 2. Sessions explorer
- Fetch sessions from adapter/backend
- Search by session key/displayName
- Filter by kind/channel/active window
- Sort by updatedAt/contextTokens
- Show list rows with key summary metadata

### 3. Session detail
- Header summary with key/sessionId/model/tokens/channel
- Transcript viewer
- Toggle toolResult visibility
- Search within transcript
- Tool inspector tab
- Stats tab

### 4. Export
- Export simplified transcript as Markdown
- Export JSON bundle when source is available

### 5. Safety baseline
- Read-only by default
- No destructive actions in MVP
- No cleanup enforcement in MVP
- No reset/stop/compact buttons in MVP

## Deliberately excluded from MVP

- Live event streaming
- Topology graph
- Compaction diff viewer
- Maintenance enforcement actions
- Session write-back controls
- Team auth / multi-user permissions
- Cost analytics

## Suggested MVP data sources

Preferred order:

1. Gateway-backed adapter endpoints
2. CLI-backed adapter endpoints for local mode
3. File-based augmentation only when absolutely needed

## Definition of done

The MVP is done when:

- A user can open the app and see sessions successfully
- A user can inspect one session transcript and tool trace
- A user can find a specific session using search/filters
- A user can export a readable diagnostic bundle
- The app remains useful even if advanced context/topology features are missing

## Stretch goals if implementation goes smoothly

- Context tab with rough breakdown
- Badges for subagent/aborted/compressed sessions
- Dry-run maintenance preview page

## Product discipline reminder

Do not bloat the MVP with cool-looking but low-leverage features.

If the user cannot quickly understand one session, nothing else matters.
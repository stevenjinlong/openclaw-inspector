# Feature Inventory — OpenClaw Inspector

This file lists the complete intended feature set, grouped by product surface and tagged by priority.

Priority tags:
- `[MVP]` must exist for the first useful release
- `[V1]` should exist for the first strong public release
- `[LATER]` valuable, but not required up front

## 1. Global capabilities

- `[MVP]` Connect to a local OpenClaw environment through a backend adapter
- `[V1]` Connect to a remote Gateway via URL + token
- `[MVP]` Select active agent / workspace scope
- `[MVP]` Show connection health and last refresh time
- `[V1]` Support periodic auto-refresh for active screens
- `[V1]` Persist user UI preferences locally (filters, panel width, hidden columns)
- `[LATER]` Multi-Gateway connection profiles

## 2. Dashboard

### 2.1 Overview cards
- `[MVP]` Active sessions count
- `[MVP]` Total sessions count
- `[V1]` Recent aborted/error sessions count
- `[V1]` Recent compaction count
- `[V1]` Recent spawned subagent count

### 2.2 Summary widgets
- `[MVP]` Sessions by kind
- `[MVP]` Sessions by channel
- `[V1]` Largest sessions by context tokens
- `[V1]` Most recently updated sessions
- `[LATER]` Token usage trend over time
- `[LATER]` Error trend over time

## 3. Sessions explorer

### 3.1 List view
- `[MVP]` Session table/list with key metadata
- `[MVP]` Columns: displayName, key, kind, channel, updatedAt, model, contextTokens, totalTokens
- `[MVP]` Visual marker for abortedLastRun
- `[V1]` Visual marker for compaction presence
- `[V1]` Visual marker for subagent relationships

### 3.2 Search and filters
- `[MVP]` Free-text search across key/displayName
- `[MVP]` Filter by kind
- `[MVP]` Filter by channel
- `[MVP]` Filter by active within N minutes
- `[V1]` Filter by model
- `[V1]` Filter by error/aborted state
- `[V1]` Filter by high context usage
- `[LATER]` Saved filter presets

### 3.3 Sorting
- `[MVP]` Sort by updatedAt
- `[MVP]` Sort by contextTokens
- `[V1]` Sort by totalTokens
- `[V1]` Sort by displayName/channel

## 4. Session detail — Summary tab

- `[MVP]` Session header with key, sessionId, displayName, channel, model
- `[MVP]` Updated timestamp
- `[MVP]` contextTokens / totalTokens display
- `[MVP]` delivery context display when available
- `[MVP]` transcript path display when available
- `[V1]` origin metadata panel
- `[V1]` badges for main/group/cron/hook/node/other
- `[V1]` badges for sandboxed, aborted, compacted, subagent-parent, subagent-child

## 5. Session detail — Transcript tab

### 5.1 Transcript rendering
- `[MVP]` Render user and assistant messages in chronological order
- `[MVP]` Optional inclusion of toolResult messages
- `[MVP]` Collapsible long message bodies
- `[MVP]` Syntax-highlight JSON-ish tool data when possible
- `[V1]` Jump-to-message by search result
- `[V1]` Sticky mini-index of message types

### 5.2 Message filtering
- `[MVP]` Toggle include/exclude tool results
- `[V1]` Filter to only user messages
- `[V1]` Filter to only assistant messages
- `[V1]` Filter to only tool messages
- `[LATER]` Filter to only compaction/reset/system events

### 5.3 Search
- `[MVP]` Search within transcript text
- `[V1]` Highlight all matches
- `[V1]` Search by tool name within transcript

## 6. Session detail — Timeline mode

- `[V1]` Timeline rendering separate from transcript list
- `[V1]` Event nodes for user message, assistant reply, tool call, tool result, compaction, reset, abort, subagent spawn
- `[V1]` Relative durations between events
- `[LATER]` Playback/replay mode with step-through navigation

## 7. Session detail — Tools tab

### 7.1 Tool call cards
- `[MVP]` Tool name
- `[MVP]` Start position/order in transcript
- `[MVP]` Input payload summary
- `[MVP]` Result body summary / size
- `[MVP]` Expand/collapse input/result
- `[V1]` Error state and status markers
- `[V1]` Duration estimate when derivable
- `[V1]` Copy input/result JSON
- `[LATER]` Compare repeated tool calls side by side

### 7.2 Tool filtering
- `[MVP]` Filter by tool name
- `[V1]` Filter to failed tool calls only
- `[LATER]` Aggregate counts by tool type

## 8. Session detail — Context tab

### 8.1 Context breakdown
- `[V1]` Display system prompt size estimate
- `[V1]` Display injected workspace file sizes
- `[V1]` Display tool schema size estimate
- `[V1]` Display history contribution estimate
- `[V1]` Bar/pie chart for largest context contributors

### 8.2 Context insights
- `[V1]` Identify largest injected file
- `[V1]` Identify likely context bloat source
- `[V1]` Flag sessions near context limits
- `[LATER]` Suggest likely remediation (compact, split session, trim files)

## 9. Session detail — Stats tab

- `[MVP]` Show totalTokens
- `[MVP]` Show contextTokens
- `[MVP]` Show model
- `[V1]` Show input/output token breakdown when available
- `[V1]` Show recent compaction count
- `[LATER]` Show cost estimates
- `[LATER]` Show latency distribution per run

## 10. Session detail — Subagents

- `[V1]` Show parent/child relationships for spawned sessions
- `[V1]` Render subagent tree
- `[V1]` Click through to child session detail
- `[LATER]` Collapse/expand cross-session lineage graph

## 11. Session actions

### 11.1 Safe actions
- `[V1]` Copy session key
- `[V1]` Open raw export panel
- `[V1]` Send a message into the session via sessions_send

### 11.2 Operational actions
- `[V1]` Stop current run
- `[V1]` Trigger compact
- `[V1]` Trigger reset/new session
- `[LATER]` Adjust send policy override
- `[LATER]` Archive/label/bookmark session in app-local metadata

## 12. Export and diagnostics

- `[MVP]` Export simplified transcript as Markdown
- `[MVP]` Export transcript JSON/JSONL bundle when accessible
- `[V1]` Export tool trace bundle
- `[V1]` Export compact debug bundle (summary + transcript + stats)
- `[LATER]` One-click GitHub issue bundle

## 13. Maintenance page

### 13.1 Visibility
- `[V1]` Show session store counts
- `[V1]` Show stale session counts
- `[V1]` Show sessions.json size
- `[V1]` Show transcript/archive footprint estimates

### 13.2 Cleanup preview
- `[V1]` Preview session cleanup impact via dry-run
- `[V1]` List sessions likely to be pruned/capped
- `[V1]` Highlight active key protection behavior
- `[LATER]` Trigger enforce cleanup with strong confirmation

## 14. Topology page

- `[LATER]` Graph of channel → agent → session → child session relationships
- `[LATER]` Route legend and filters
- `[LATER]` Focus one session and see inbound/outbound relationships
- `[LATER]` Show bindings/routing explanation where derivable

## 15. Live monitoring

- `[LATER]` Live event stream for active sessions
- `[LATER]` Real-time tool call/update stream
- `[LATER]` Real-time run state indicator
- `[LATER]` Live log tail mode

## 16. Error forensics

- `[LATER]` Dedicated failure view for a broken run
- `[LATER]` Highlight last successful point before failure
- `[LATER]` Generate human-readable failure summary
- `[LATER]` Compare failed run against previous successful run

## 17. Settings and safety

- `[MVP]` Read-only mode default
- `[V1]` Explicit opt-in for write actions
- `[V1]` Confirmations for stop/reset/compact/cleanup
- `[V1]` Show current connection mode (CLI vs Gateway)
- `[LATER]` Role-aware auth model for team deployments

## 18. Implementation notes

The most important product truth:

If Session Detail is excellent, the product is already valuable.

Everything else should be built to reinforce that core.
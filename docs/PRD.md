# PRD — OpenClaw Inspector

## 1. Overview

OpenClaw Inspector is a visual observability and control console for OpenClaw. It helps developers and power users inspect session state, replay what happened during a run, understand tool activity, diagnose context bloat, and operate long-lived OpenClaw deployments without spelunking through JSONL transcripts and logs.

## 2. Problem statement

Today, OpenClaw exposes powerful runtime primitives, but many of them remain operationally invisible:

- Sessions exist, but session state is mostly inspected through CLI or raw JSON
- Tool calls happen, but there is no first-class timeline to explain them
- Context pressure, compaction, and pruning are conceptually important but hard to visualize
- Subagents and routing are powerful but difficult to reason about after the fact
- Session cleanup and transcript maintenance are available, but not friendly to inspect before action

This creates three pains:

1. Debugging is slower than it should be
2. Sharing reproducible bug reports is harder than it should be
3. OpenClaw’s most differentiated capabilities are less visible than they should be

## 3. Vision

Build the missing observability layer for OpenClaw.

Users should be able to answer these questions quickly:

- What sessions exist right now?
- Which ones are active, stale, large, failing, or expensive?
- What happened inside this run?
- Which tool calls were made, how long did they take, and what did they return?
- Why did context usage spike?
- Did compaction happen, and what was preserved?
- Which subagent or route handled the work?
- What should be cleaned up, archived, retried, or exported?

## 4. Goals

### 4.1 Product goals

- Make OpenClaw session state visible and explorable
- Reduce time-to-diagnose for session failures and weird behavior
- Turn tool and context behavior into visual, explainable artifacts
- Provide safe session-level controls for common actions
- Support both local single-user setups and remote gateway deployments
- Produce exportable debug bundles that are useful in GitHub issues and team chats

### 4.2 User goals

- Understand what the agent did
- Understand why it failed or behaved strangely
- Compare sessions and find anomalies quickly
- Control and clean up long-running deployments confidently
- Share a session diagnosis with someone else in a structured way

## 5. Non-goals

These are explicitly out of scope for the first versions:

- Becoming a full replacement for OpenClaw chat interfaces
- Replacing CLI access for every administrative function
- Building a general-purpose workflow editor in v1
- Acting as a generic model observability product for non-OpenClaw runtimes
- Providing destructive maintenance actions without strong preview/confirmation flows

## 6. Target users

### 6.1 Solo builder

Runs OpenClaw locally, likely in one workspace, wants to see and debug sessions without reading raw files.

### 6.2 Power user / operator

Runs multiple channels or agents, needs visibility into stale sessions, context growth, and routing.

### 6.3 Team maintainer

Uses OpenClaw for collaborative bots or internal tooling, wants exportable diagnostics and safer operations.

### 6.4 Open source contributor

Needs to reproduce bugs, inspect compaction behavior, and share consistent debug output in issues and PRs.

## 7. Core use cases

### 7.1 Inspect a broken session

A user selects a failing or strange session, reviews transcript and tool timeline, identifies the last failed tool call, and exports a debug bundle.

### 7.2 Understand context bloat

A user opens the context panel and sees that injected workspace files and large tool results dominate the model window, prompting cleanup or refactor.

### 7.3 Audit subagent activity

A user inspects a parent session, sees spawned child sessions, opens each child transcript, and understands which agent did what.

### 7.4 Preview maintenance impact

A user opens Maintenance, runs a cleanup preview, and sees which sessions/transcripts would be pruned before actually doing anything.

### 7.5 Compare recent active work

A user filters to sessions active in the last 60 minutes, sorts by context size or errors, and rapidly jumps between them.

## 8. Product surfaces

### 8.1 Dashboard

Purpose:
- Give a 30-second operational summary

Content:
- Active session count
- Sessions by kind/channel
- Recent failures/aborts
- Largest sessions by context/tokens
- Recent compactions
- Recent subagent activity

### 8.2 Sessions explorer

Purpose:
- Find and filter sessions quickly

Content:
- Search box
- Filter chips/dropdowns
- Sort controls
- Session list with summary stats

### 8.3 Session detail inspector

Purpose:
- Provide the main debugging view for one session

Tabs:
- Summary
- Transcript
- Tools
- Context
- Stats
- Export

### 8.4 Maintenance

Purpose:
- Make session-store health and cleanup impact understandable

Content:
- Session counts
- Stale counts
- Transcript/store size estimates
- Cleanup preview
- Archive/reset artifact visibility

### 8.5 Topology

Purpose:
- Explain relationships across channel, agent, session, thread, and subagent routing

Content:
- Graph or structured tree view
- Route legend
- Parent/child session relationships

### 8.6 Settings

Purpose:
- Manage connection modes and safe defaults

Content:
- Gateway URL/token
- Local CLI mode toggle
- Agent selection
- Feature flags for risky actions

## 9. UX principles

- Default to the answer, not the raw substrate
- Raw data must remain inspectable at any time
- Prioritize “why” over “just logs”
- State transitions must be obvious
- Slow data should degrade gracefully
- Dangerous actions need previews, labels, and confirmations
- Visual hierarchy should make live vs historical vs derived data easy to distinguish

## 10. Success criteria

### 10.1 Early success

- A user can find a session and inspect its transcript in under 30 seconds
- A user can identify the last tool failure in under 1 minute
- A user can export a useful debug bundle without touching the filesystem

### 10.2 Strong success

- A user can explain a compaction event visually
- A user can reason about subagent relationships without reading session keys manually
- A maintainer can preview cleanup impact safely before enforcement

## 11. Risks

- Overbuilding a huge control plane before nailing the core session detail experience
- Depending too directly on local files instead of gateway truth
- Creating unsafe action surfaces too early
- Attempting live streaming and topology too soon, delaying the useful MVP

## 12. Guiding product bet

The product will win if Session Detail is excellent.

If users open one session and immediately understand what happened, the rest of the product earns the right to exist.

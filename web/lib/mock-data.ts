export type SessionKind = "main" | "group" | "cron" | "hook" | "node" | "other";

export interface SessionSummary {
  key: string;
  slug: string;
  displayName: string;
  kind: SessionKind;
  channel: string;
  updatedAt: string;
  model: string;
  contextTokens: number;
  totalTokens: number;
  abortedLastRun: boolean;
  hasCompaction: boolean;
  hasSubagent: boolean;
  transcriptPath: string;
  messages: Array<{
    role: "user" | "assistant" | "toolResult";
    title: string;
    content: string;
  }>;
}

export const mockSessions: SessionSummary[] = [
  {
    key: "agent:software-developer:main",
    slug: "agent-software-developer-main",
    displayName: "Main DM",
    kind: "main",
    channel: "discord",
    updatedAt: "2026-03-15 03:40",
    model: "openai/gpt-5.4",
    contextTokens: 12480,
    totalTokens: 38840,
    abortedLastRun: false,
    hasCompaction: true,
    hasSubagent: true,
    transcriptPath: "~/.openclaw/agents/software-developer/sessions/main.jsonl",
    messages: [
      {
        role: "user",
        title: "Project kickoff",
        content: "Design a visual observability tool for OpenClaw sessions.",
      },
      {
        role: "assistant",
        title: "Product direction",
        content: "Proposed OpenClaw Inspector as a session observability and control plane.",
      },
      {
        role: "toolResult",
        title: "read(concepts/session.md)",
        content: "Loaded session lifecycle, keys, transcript location, and maintenance behavior.",
      },
    ],
  },
  {
    key: "agent:software-developer:discord:channel:product-lab",
    slug: "agent-software-developer-discord-channel-product-lab",
    displayName: "#product-lab",
    kind: "group",
    channel: "discord",
    updatedAt: "2026-03-15 02:58",
    model: "openai/gpt-5.4",
    contextTokens: 6240,
    totalTokens: 19400,
    abortedLastRun: false,
    hasCompaction: false,
    hasSubagent: false,
    transcriptPath: "~/.openclaw/agents/software-developer/sessions/product-lab.jsonl",
    messages: [
      {
        role: "user",
        title: "Feature question",
        content: "What would a context heatmap for sessions look like?",
      },
      {
        role: "assistant",
        title: "Answer",
        content: "Outlined a visual context heatmap and largest-contributor breakdown.",
      },
    ],
  },
  {
    key: "cron:daily-maintenance",
    slug: "cron-daily-maintenance",
    displayName: "daily-maintenance",
    kind: "cron",
    channel: "internal",
    updatedAt: "2026-03-15 00:30",
    model: "openai/gpt-5.4",
    contextTokens: 1820,
    totalTokens: 5100,
    abortedLastRun: true,
    hasCompaction: false,
    hasSubagent: false,
    transcriptPath: "~/.openclaw/agents/software-developer/sessions/cron-daily-maintenance.jsonl",
    messages: [
      {
        role: "user",
        title: "Scheduled run",
        content: "Cleanup preview and report generation.",
      },
      {
        role: "toolResult",
        title: "sessions cleanup --dry-run",
        content: "Dry-run identified stale sessions older than 30 days.",
      },
      {
        role: "assistant",
        title: "Abort note",
        content: "Run aborted before posting final summary.",
      },
    ],
  },
];

export function getSessionBySlug(slug: string) {
  return mockSessions.find((session) => session.slug === slug);
}

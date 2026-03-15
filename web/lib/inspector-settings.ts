import "server-only";

import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { clearRuntimeCache } from "./runtime-cache";

const MAX_BUFFER_BYTES = 20 * 1024 * 1024;
const SETTINGS_DIR = join(homedir(), ".openclaw", "inspector");
const SETTINGS_PATH = join(SETTINGS_DIR, "settings.json");
const DEFAULT_REMOTE_TIMEOUT_MS = 10000;

export type InspectorSourceMode =
  | "auto-local"
  | "local-gateway"
  | "local-cli"
  | "remote-gateway"
  | "mock";

export interface RemoteGatewaySettings {
  url: string;
  token: string;
  password: string;
  timeoutMs: number;
}

export interface InspectorSettings {
  sourceMode: InspectorSourceMode;
  remoteGateway: RemoteGatewaySettings;
}

export interface GatewayTargetConfig {
  kind: "local" | "remote";
  label: string;
  url: string | null;
  token: string | null;
  password: string | null;
  timeoutMs: number;
}

export type InspectorSourceAttempt =
  | {
      mode: "gateway";
      label: string;
      gateway: GatewayTargetConfig;
      allowLocalTranscriptFallback: boolean;
    }
  | {
      mode: "cli";
      label: string;
      allowLocalTranscriptFallback: true;
    }
  | {
      mode: "mock";
      label: string;
      allowLocalTranscriptFallback: false;
    };

export interface InspectorSourcePlan {
  cacheKey: string;
  mode: InspectorSourceMode;
  label: string;
  attempts: InspectorSourceAttempt[];
}

export interface GatewayProbeStatus {
  configured: boolean;
  ok: boolean;
  label: string;
  detail: string;
  url: string | null;
  bindMode: string | null;
  serviceStatus: string | null;
  rpcOk: boolean | null;
  error: string | null;
}

export interface CliProbeStatus {
  ok: boolean;
  label: string;
  detail: string;
  sessionCount: number | null;
  error: string | null;
}

export interface EffectiveSourceStatus {
  ok: boolean;
  mode: InspectorSourceMode;
  adapterMode: "gateway" | "cli" | "mock";
  label: string;
  detail: string;
  remote: boolean;
}

export interface InspectorSettingsSnapshot {
  settings: InspectorSettings;
  storage: {
    path: string;
  };
  runtime: {
    effectiveSource: EffectiveSourceStatus;
    localGateway: GatewayProbeStatus;
    localCli: CliProbeStatus;
    remoteGateway: GatewayProbeStatus;
  };
}

export function getDefaultInspectorSettings(): InspectorSettings {
  return {
    sourceMode: "auto-local",
    remoteGateway: {
      url: "",
      token: "",
      password: "",
      timeoutMs: DEFAULT_REMOTE_TIMEOUT_MS,
    },
  };
}

export async function getInspectorSettings(): Promise<InspectorSettings> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf8");
    return sanitizeInspectorSettings(JSON.parse(raw));
  } catch {
    return getDefaultInspectorSettings();
  }
}

export async function saveInspectorSettings(input: unknown): Promise<InspectorSettingsSnapshot> {
  const settings = sanitizeInspectorSettings(input);
  validateInspectorSettings(settings);
  await mkdir(SETTINGS_DIR, { recursive: true });
  await writeFile(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  clearRuntimeCache();
  return getInspectorSettingsSnapshot(settings);
}

export async function testInspectorSettings(input: unknown): Promise<InspectorSettingsSnapshot> {
  const settings = sanitizeInspectorSettings(input);
  validateInspectorSettings(settings);
  return getInspectorSettingsSnapshot(settings);
}

export async function getInspectorSettingsSnapshot(
  provided?: InspectorSettings,
): Promise<InspectorSettingsSnapshot> {
  const settings = provided ?? (await getInspectorSettings());
  const [localGateway, localCli, remoteGateway] = await Promise.all([
    probeLocalGateway(),
    probeLocalCli(),
    probeRemoteGateway(settings),
  ]);

  return {
    settings,
    storage: {
      path: SETTINGS_PATH,
    },
    runtime: {
      effectiveSource: resolveEffectiveSource(settings, {
        localGateway,
        localCli,
        remoteGateway,
      }),
      localGateway,
      localCli,
      remoteGateway,
    },
  };
}

export function buildInspectorSourcePlan(settings: InspectorSettings): InspectorSourcePlan {
  const normalized = sanitizeInspectorSettings(settings);

  if (normalized.sourceMode === "mock") {
    return {
      cacheKey: buildSettingsCacheKey(normalized),
      mode: normalized.sourceMode,
      label: "Mock only",
      attempts: [{ mode: "mock", label: "Mock adapter", allowLocalTranscriptFallback: false }],
    };
  }

  if (normalized.sourceMode === "local-cli") {
    return {
      cacheKey: buildSettingsCacheKey(normalized),
      mode: normalized.sourceMode,
      label: "Local CLI",
      attempts: [
        { mode: "cli", label: "Local OpenClaw CLI", allowLocalTranscriptFallback: true },
        { mode: "mock", label: "Mock fallback", allowLocalTranscriptFallback: false },
      ],
    };
  }

  if (normalized.sourceMode === "local-gateway") {
    return {
      cacheKey: buildSettingsCacheKey(normalized),
      mode: normalized.sourceMode,
      label: "Local Gateway",
      attempts: [
        {
          mode: "gateway",
          label: "Local Gateway",
          gateway: {
            kind: "local",
            label: "Local Gateway",
            url: null,
            token: null,
            password: null,
            timeoutMs: normalized.remoteGateway.timeoutMs,
          },
          allowLocalTranscriptFallback: true,
        },
        { mode: "mock", label: "Mock fallback", allowLocalTranscriptFallback: false },
      ],
    };
  }

  if (normalized.sourceMode === "remote-gateway") {
    return {
      cacheKey: buildSettingsCacheKey(normalized),
      mode: normalized.sourceMode,
      label: "Remote Gateway",
      attempts: [
        {
          mode: "gateway",
          label: "Remote Gateway",
          gateway: {
            kind: "remote",
            label: "Remote Gateway",
            url: normalizeGatewayUrl(normalized.remoteGateway.url),
            token: normalized.remoteGateway.token || null,
            password: normalized.remoteGateway.password || null,
            timeoutMs: normalized.remoteGateway.timeoutMs,
          },
          allowLocalTranscriptFallback: false,
        },
        { mode: "mock", label: "Mock fallback", allowLocalTranscriptFallback: false },
      ],
    };
  }

  return {
    cacheKey: buildSettingsCacheKey(normalized),
    mode: normalized.sourceMode,
    label: "Auto local",
    attempts: [
      {
        mode: "gateway",
        label: "Local Gateway",
        gateway: {
          kind: "local",
          label: "Local Gateway",
          url: null,
          token: null,
          password: null,
          timeoutMs: normalized.remoteGateway.timeoutMs,
        },
        allowLocalTranscriptFallback: true,
      },
      { mode: "cli", label: "Local OpenClaw CLI", allowLocalTranscriptFallback: true },
      { mode: "mock", label: "Mock fallback", allowLocalTranscriptFallback: false },
    ],
  };
}

export function appendGatewayConnectionArgs(
  args: string[],
  gateway: GatewayTargetConfig,
): string[] {
  const next = [...args];

  if (gateway.kind === "remote") {
    if (!gateway.url) {
      throw new Error("Remote Gateway URL is required.");
    }
    if (!gateway.token && !gateway.password) {
      throw new Error("Remote Gateway needs an explicit token or password.");
    }

    next.push("--url", gateway.url);
    next.push("--timeout", String(gateway.timeoutMs));

    if (gateway.token) {
      next.push("--token", gateway.token);
    }

    if (gateway.password) {
      next.push("--password", gateway.password);
    }
  }

  return next;
}

function sanitizeInspectorSettings(input: unknown): InspectorSettings {
  const fallback = getDefaultInspectorSettings();
  const raw = isObject(input) ? input : {};
  const remoteGateway = isObject(raw.remoteGateway) ? raw.remoteGateway : {};
  const sourceMode = sanitizeSourceMode(raw.sourceMode);

  return {
    sourceMode,
    remoteGateway: {
      url: typeof remoteGateway.url === "string" ? remoteGateway.url.trim() : fallback.remoteGateway.url,
      token:
        typeof remoteGateway.token === "string" ? remoteGateway.token.trim() : fallback.remoteGateway.token,
      password:
        typeof remoteGateway.password === "string"
          ? remoteGateway.password.trim()
          : fallback.remoteGateway.password,
      timeoutMs: clampInteger(
        typeof remoteGateway.timeoutMs === "number"
          ? remoteGateway.timeoutMs
          : Number(remoteGateway.timeoutMs ?? fallback.remoteGateway.timeoutMs),
        1000,
        120000,
      ),
    },
  };
}

function validateInspectorSettings(settings: InspectorSettings) {
  if (settings.sourceMode !== "remote-gateway") {
    return;
  }

  const normalizedUrl = normalizeGatewayUrl(settings.remoteGateway.url);
  if (!normalizedUrl) {
    throw new Error("Remote Gateway URL is required when source mode is Remote Gateway.");
  }

  if (!settings.remoteGateway.token && !settings.remoteGateway.password) {
    throw new Error("Remote Gateway requires a token or password.");
  }
}

function resolveEffectiveSource(
  settings: InspectorSettings,
  probes: {
    localGateway: GatewayProbeStatus;
    localCli: CliProbeStatus;
    remoteGateway: GatewayProbeStatus;
  },
): EffectiveSourceStatus {
  if (settings.sourceMode === "mock") {
    return {
      ok: true,
      mode: settings.sourceMode,
      adapterMode: "mock",
      label: "Mock adapter",
      detail: "Inspector is pinned to mock mode.",
      remote: false,
    };
  }

  if (settings.sourceMode === "remote-gateway") {
    if (probes.remoteGateway.ok) {
      return {
        ok: true,
        mode: settings.sourceMode,
        adapterMode: "gateway",
        label: "Remote Gateway",
        detail: probes.remoteGateway.detail,
        remote: true,
      };
    }

    return {
      ok: false,
      mode: settings.sourceMode,
      adapterMode: "mock",
      label: "Remote Gateway unavailable",
      detail: `${probes.remoteGateway.detail} Falling back to mock data until the remote gateway responds.`,
      remote: true,
    };
  }

  if (settings.sourceMode === "local-gateway") {
    if (probes.localGateway.ok) {
      return {
        ok: true,
        mode: settings.sourceMode,
        adapterMode: "gateway",
        label: "Local Gateway",
        detail: probes.localGateway.detail,
        remote: false,
      };
    }

    return {
      ok: false,
      mode: settings.sourceMode,
      adapterMode: "mock",
      label: "Local Gateway unavailable",
      detail: `${probes.localGateway.detail} Falling back to mock data until the local gateway is reachable.`,
      remote: false,
    };
  }

  if (settings.sourceMode === "local-cli") {
    if (probes.localCli.ok) {
      return {
        ok: true,
        mode: settings.sourceMode,
        adapterMode: "cli",
        label: "Local OpenClaw CLI",
        detail: probes.localCli.detail,
        remote: false,
      };
    }

    return {
      ok: false,
      mode: settings.sourceMode,
      adapterMode: "mock",
      label: "Local CLI unavailable",
      detail: `${probes.localCli.detail} Falling back to mock data until the CLI read succeeds.`,
      remote: false,
    };
  }

  if (probes.localGateway.ok) {
    return {
      ok: true,
      mode: settings.sourceMode,
      adapterMode: "gateway",
      label: "Auto local → Gateway",
      detail: probes.localGateway.detail,
      remote: false,
    };
  }

  if (probes.localCli.ok) {
    return {
      ok: true,
      mode: settings.sourceMode,
      adapterMode: "cli",
      label: "Auto local → CLI fallback",
      detail: `${probes.localGateway.detail} CLI fallback is available.`,
      remote: false,
    };
  }

  return {
    ok: false,
    mode: settings.sourceMode,
    adapterMode: "mock",
    label: "Auto local → mock fallback",
    detail: "Neither local Gateway nor local CLI is available right now, so Inspector would fall back to mock data.",
    remote: false,
  };
}

async function probeLocalGateway(): Promise<GatewayProbeStatus> {
  try {
    const payload = await runOpenClawJson(["gateway", "status", "--json"]);
    const rpcOk = payload?.rpc?.ok === true;
    const serviceStatus = stringOrNull(payload?.service?.runtime?.status);
    const bindMode = stringOrNull(payload?.gateway?.bindMode);
    const url = stringOrNull(payload?.gateway?.probeUrl) ?? stringOrNull(payload?.rpc?.url);

    return {
      configured: true,
      ok: rpcOk,
      label: "Local Gateway",
      detail: rpcOk
        ? `Local gateway is reachable at ${url ?? "the configured probe URL"}.`
        : "Local gateway status loaded, but the RPC probe did not succeed.",
      url,
      bindMode,
      serviceStatus,
      rpcOk,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      label: "Local Gateway",
      detail: "Local gateway probe failed.",
      url: null,
      bindMode: null,
      serviceStatus: null,
      rpcOk: false,
      error: errorMessage(error),
    };
  }
}

async function probeLocalCli(): Promise<CliProbeStatus> {
  try {
    const payload = await runOpenClawJson(["sessions", "--all-agents", "--json"]);
    const sessionCount = Array.isArray(payload?.sessions) ? payload.sessions.length : 0;

    return {
      ok: true,
      label: "Local OpenClaw CLI",
      detail: `Local CLI session read succeeded (${sessionCount} sessions visible).`,
      sessionCount,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      label: "Local OpenClaw CLI",
      detail: "Local CLI session read failed.",
      sessionCount: null,
      error: errorMessage(error),
    };
  }
}

async function probeRemoteGateway(settings: InspectorSettings): Promise<GatewayProbeStatus> {
  const normalizedUrl = normalizeGatewayUrl(settings.remoteGateway.url);
  const hasCredentials = Boolean(settings.remoteGateway.token || settings.remoteGateway.password);

  if (!normalizedUrl) {
    return {
      configured: false,
      ok: false,
      label: "Remote Gateway",
      detail: "No remote Gateway URL configured yet.",
      url: null,
      bindMode: null,
      serviceStatus: null,
      rpcOk: null,
      error: null,
    };
  }

  if (!hasCredentials) {
    return {
      configured: true,
      ok: false,
      label: "Remote Gateway",
      detail: "Remote Gateway URL is set, but an explicit token or password is still required.",
      url: normalizedUrl,
      bindMode: null,
      serviceStatus: null,
      rpcOk: null,
      error: null,
    };
  }

  try {
    const payload = await runOpenClawJson(
      appendGatewayConnectionArgs(
        ["gateway", "status", "--json"],
        {
          kind: "remote",
          label: "Remote Gateway",
          url: normalizedUrl,
          token: settings.remoteGateway.token || null,
          password: settings.remoteGateway.password || null,
          timeoutMs: settings.remoteGateway.timeoutMs,
        },
      ),
    );

    const rpcOk = payload?.rpc?.ok === true;
    const url = stringOrNull(payload?.rpc?.url) ?? stringOrNull(payload?.gateway?.probeUrl) ?? normalizedUrl;

    return {
      configured: true,
      ok: rpcOk,
      label: "Remote Gateway",
      detail: rpcOk
        ? `Remote gateway responded successfully at ${url ?? normalizedUrl}.`
        : "Remote gateway status loaded, but the RPC probe did not succeed.",
      url,
      bindMode: stringOrNull(payload?.gateway?.bindMode),
      serviceStatus: stringOrNull(payload?.service?.runtime?.status),
      rpcOk,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      label: "Remote Gateway",
      detail: "Remote gateway probe failed.",
      url: normalizedUrl,
      bindMode: null,
      serviceStatus: null,
      rpcOk: false,
      error: errorMessage(error),
    };
  }
}

function buildSettingsCacheKey(settings: InspectorSettings): string {
  return createHash("sha1")
    .update(
      JSON.stringify({
        sourceMode: settings.sourceMode,
        remoteGateway: {
          url: normalizeGatewayUrl(settings.remoteGateway.url),
          token: settings.remoteGateway.token,
          password: settings.remoteGateway.password,
          timeoutMs: settings.remoteGateway.timeoutMs,
        },
      }),
    )
    .digest("hex");
}

function sanitizeSourceMode(value: unknown): InspectorSourceMode {
  return value === "local-gateway" ||
    value === "local-cli" ||
    value === "remote-gateway" ||
    value === "mock"
    ? value
    : "auto-local";
}

function normalizeGatewayUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^wss?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `ws://${trimmed}`;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.round(value), min), max);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function runOpenClawJson(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile(
      "openclaw",
      args,
      {
        cwd: process.cwd(),
        encoding: "utf8",
        maxBuffer: MAX_BUFFER_BYTES,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              [error.message, stderr?.trim(), stdout?.trim()]
                .filter(Boolean)
                .join(" | "),
            ),
          );
          return;
        }

        try {
          resolve(parseJsonFromOutput(stdout));
        } catch (parseError) {
          reject(
            new Error(
              `Failed to parse OpenClaw JSON output for args [${args.join(" ")}]: ${errorMessage(parseError)}`,
            ),
          );
        }
      },
    );
  });
}

function parseJsonFromOutput(stdout: string): any {
  const objectIndex = stdout.indexOf("{");
  const arrayIndex = stdout.indexOf("[");
  const startIndex =
    objectIndex === -1 ? arrayIndex : arrayIndex === -1 ? objectIndex : Math.min(objectIndex, arrayIndex);

  if (startIndex === -1) {
    throw new Error("No JSON payload found in command output.");
  }

  return JSON.parse(stdout.slice(startIndex));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

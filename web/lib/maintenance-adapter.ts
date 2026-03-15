import "server-only";

import { execFile } from "node:child_process";

import {
  buildResponseMeta,
  createAdapterDescriptor,
  type ResponseMeta,
} from "./normalizers";

const MAX_BUFFER_BYTES = 20 * 1024 * 1024;

export interface MaintenanceStorePreview {
  agentId: string;
  storePath: string;
  mode: string;
  dryRun: boolean;
  beforeCount: number;
  afterCount: number;
  missing: number;
  pruned: number;
  capped: number;
  diskBudget: number | null;
  wouldMutate: boolean;
}

export interface MaintenancePreviewData {
  allAgents: boolean;
  mode: string;
  dryRun: boolean;
  totals: {
    stores: number;
    beforeCount: number;
    afterCount: number;
    missing: number;
    pruned: number;
    capped: number;
    wouldMutateStores: number;
  };
  stores: MaintenanceStorePreview[];
}

export interface MaintenancePreviewResponse {
  data: MaintenancePreviewData | null;
  meta: ResponseMeta;
}

export async function getMaintenancePreviewResponse(): Promise<MaintenancePreviewResponse> {
  const adapter = createAdapterDescriptor({
    mode: "cli",
    label: "Local maintenance preview adapter",
    source: "Normalized output from `openclaw sessions cleanup --all-agents --dry-run --json`",
    notes: [
      "This preview is read-only and does not mutate any session store.",
      "The data comes from the local OpenClaw CLI cleanup dry-run command.",
    ],
  });

  try {
    const payload = await runOpenClawJson([
      "sessions",
      "cleanup",
      "--all-agents",
      "--dry-run",
      "--json",
    ]);

    const stores = Array.isArray(payload.stores)
      ? payload.stores.map(normalizeMaintenanceStore)
      : [];

    const data: MaintenancePreviewData = {
      allAgents: Boolean(payload.allAgents),
      mode: String(payload.mode ?? "warn"),
      dryRun: Boolean(payload.dryRun),
      totals: {
        stores: stores.length,
        beforeCount: sum(stores, "beforeCount"),
        afterCount: sum(stores, "afterCount"),
        missing: sum(stores, "missing"),
        pruned: sum(stores, "pruned"),
        capped: sum(stores, "capped"),
        wouldMutateStores: stores.filter((store) => store.wouldMutate).length,
      },
      stores: stores.sort((left, right) => right.beforeCount - left.beforeCount),
    };

    return {
      data,
      meta: buildResponseMeta(adapter, {
        count: stores.length,
      }),
    };
  } catch (error) {
    return {
      data: null,
      meta: buildResponseMeta(adapter, {
        warnings: [errorMessage(error)],
      }),
    };
  }
}

function normalizeMaintenanceStore(store: any): MaintenanceStorePreview {
  return {
    agentId: String(store.agentId ?? "unknown"),
    storePath: String(store.storePath ?? "unknown"),
    mode: String(store.mode ?? "warn"),
    dryRun: Boolean(store.dryRun),
    beforeCount: toNumber(store.beforeCount),
    afterCount: toNumber(store.afterCount),
    missing: toNumber(store.missing),
    pruned: toNumber(store.pruned),
    capped: toNumber(store.capped),
    diskBudget: typeof store.diskBudget === "number" ? store.diskBudget : null,
    wouldMutate: Boolean(store.wouldMutate),
  };
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sum<T extends Record<string, number>>(
  rows: T[],
  key: keyof T,
): number {
  return rows.reduce((total, row) => total + (typeof row[key] === "number" ? row[key] : 0), 0);
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
              `Failed to parse maintenance preview JSON: ${errorMessage(parseError)}`,
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
  const startIndex = objectIndex === -1 ? arrayIndex : arrayIndex === -1 ? objectIndex : Math.min(objectIndex, arrayIndex);

  if (startIndex === -1) {
    throw new Error("No JSON payload found in command output.");
  }

  return JSON.parse(stdout.slice(startIndex));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

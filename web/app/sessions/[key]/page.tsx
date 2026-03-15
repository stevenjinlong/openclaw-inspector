import { notFound } from "next/navigation";

import { SessionDetailView } from "../../../components/session-detail-view";
import { getSessionDetailResponse } from "../../../lib/session-adapter";

type DetailTab = "transcript" | "tools" | "stats" | "export";
type ToolTraceStatusFilter = "all" | "completed" | "pending" | "orphan-result";
type DetailSearchParams = {
  tab?: string | string[];
  status?: string | string[];
  tool?: string | string[];
  page?: string | string[];
  focus?: string | string[];
  q?: string | string[];
};

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<DetailSearchParams>;
}) {
  const [{ key }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const { data: session, meta } = await getSessionDetailResponse(key);

  if (!session) {
    notFound();
  }

  return (
    <SessionDetailView
      session={session}
      meta={meta}
      initialTab={normalizeTab(firstString(resolvedSearchParams.tab))}
      initialStatusFilter={normalizeStatusFilter(firstString(resolvedSearchParams.status))}
      initialToolFilter={normalizeToolFilter(firstString(resolvedSearchParams.tool))}
      initialTranscriptPage={normalizePage(firstString(resolvedSearchParams.page))}
      focusMessageIndex={normalizeOptionalPage(firstString(resolvedSearchParams.focus))}
      focusQuery={firstString(resolvedSearchParams.q)?.trim() ?? ""}
    />
  );
}

function firstString(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTab(value?: string): DetailTab {
  if (value === "tools" || value === "stats" || value === "export") {
    return value;
  }

  return "transcript";
}

function normalizeStatusFilter(value?: string): ToolTraceStatusFilter {
  return value === "completed" || value === "pending" || value === "orphan-result"
    ? value
    : "all";
}

function normalizeToolFilter(value?: string): string {
  return value?.trim() ? value : "all";
}

function normalizePage(value?: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

function normalizeOptionalPage(value?: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

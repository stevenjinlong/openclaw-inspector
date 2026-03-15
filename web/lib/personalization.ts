export type SavedViewRecord = {
  id: string;
  name: string;
  q: string;
  kind: string;
  channel: string;
  state: string;
  createdAt: number;
};

const PINNED_SESSIONS_KEY = "openclaw-inspector:pinned-sessions:v1";
const SAVED_VIEWS_KEY = "openclaw-inspector:saved-views:v1";

export function loadPinnedSessions(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PINNED_SESSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function savePinnedSessions(keys: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PINNED_SESSIONS_KEY, JSON.stringify(keys));
}

export function loadSavedViews(): SavedViewRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SAVED_VIEWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is SavedViewRecord => Boolean(value && typeof value.id === "string" && typeof value.name === "string"))
      : [];
  } catch {
    return [];
  }
}

export function saveSavedViews(views: SavedViewRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
}

export function buildSessionsHref(view: Pick<SavedViewRecord, "q" | "kind" | "channel" | "state">): string {
  const params = new URLSearchParams();
  if (view.q.trim()) params.set("q", view.q.trim());
  if (view.kind && view.kind !== "all") params.set("kind", view.kind);
  if (view.channel && view.channel !== "all") params.set("channel", view.channel);
  if (view.state && view.state !== "all") params.set("state", view.state);
  const query = params.toString();
  return `/sessions${query ? `?${query}` : ""}`;
}

import { TranscriptSearchView } from "../../components/transcript-search-view";
import { searchTranscripts } from "../../lib/search-adapter";

export const dynamic = "force-dynamic";

type SearchPageSearchParams = {
  q?: string | string[];
  page?: string | string[];
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchPageSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawQuery = firstString(resolvedSearchParams.q)?.trim() ?? "";
  const currentPage = normalizePage(firstString(resolvedSearchParams.page));
  const response = await searchTranscripts(rawQuery, {
    resultLimit: 200,
    sessionLimit: 50,
  });

  return (
    <TranscriptSearchView
      initialQuery={rawQuery}
      initialPage={currentPage}
      initialResponse={response}
    />
  );
}

function firstString(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePage(value?: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

import { searchTranscripts } from "../../../lib/search-adapter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  const sessionLimit = Number(searchParams.get("sessionLimit") ?? "50");

  const response = await searchTranscripts(query, {
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    sessionLimit: Number.isFinite(sessionLimit) ? sessionLimit : 50,
  });

  return Response.json(response);
}

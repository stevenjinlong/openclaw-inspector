import { searchTranscripts } from "../../../lib/search-adapter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? "80");
  const sessionLimit = Number(searchParams.get("sessionLimit") ?? "50");

  const response = await searchTranscripts(query, {
    resultLimit: Number.isFinite(limit) ? limit : 80,
    sessionLimit: Number.isFinite(sessionLimit) ? sessionLimit : 50,
  });

  return Response.json(response);
}

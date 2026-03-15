import { getSessionTopology } from "../../../../../lib/topology-adapter";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  const response = await getSessionTopology(key);

  if (!response) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  return Response.json(response);
}

import { getSessionDetailResponse } from "../../../../lib/session-adapter";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  const response = await getSessionDetailResponse(key);

  if (!response.data) {
    return Response.json(response, { status: 404 });
  }

  return Response.json(response);
}

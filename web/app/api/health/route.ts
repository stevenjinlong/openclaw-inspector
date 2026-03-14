import { getHealthResponse } from "../../../lib/session-adapter";

export async function GET() {
  return Response.json(await getHealthResponse());
}

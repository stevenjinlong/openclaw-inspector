import { listSessionsResponse } from "../../../lib/session-adapter";

export async function GET() {
  return Response.json(await listSessionsResponse());
}

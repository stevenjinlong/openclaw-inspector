import { getMaintenancePreviewResponse } from "../../../../lib/maintenance-adapter";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = await getMaintenancePreviewResponse();

  if (!response.data) {
    return Response.json(response, { status: 503 });
  }

  return Response.json(response);
}

import {
  buildSessionExportBundle,
  createExportFilename,
  renderSessionMarkdown,
} from "../../../../../lib/session-export";
import { getSessionDetailResponse } from "../../../../../lib/session-adapter";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "md" ? "md" : "json";
  const response = await getSessionDetailResponse(key);

  if (!response.data) {
    return Response.json(response, { status: 404 });
  }

  const bundle = buildSessionExportBundle(response.data, response.meta);

  if (format === "md") {
    const markdown = renderSessionMarkdown(bundle);
    const filename = createExportFilename(response.data, "md");

    return new Response(markdown, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `inline; filename="${filename}"`,
      },
    });
  }

  const filename = createExportFilename(response.data, "json");

  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `inline; filename="${filename}"`,
    },
  });
}

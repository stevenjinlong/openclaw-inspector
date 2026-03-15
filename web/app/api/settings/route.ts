import {
  getInspectorSettingsSnapshot,
  saveInspectorSettings,
  testInspectorSettings,
} from "../../../lib/inspector-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getInspectorSettingsSnapshot());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "save" | "test";
      settings?: unknown;
    };

    if (body.action === "test") {
      return Response.json(await testInspectorSettings(body.settings));
    }

    return Response.json(await saveInspectorSettings(body.settings));
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}

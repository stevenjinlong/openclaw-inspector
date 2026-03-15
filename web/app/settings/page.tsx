import { SettingsControlPanel } from "../../components/settings-control-panel";
import { getInspectorSettingsSnapshot } from "../../lib/inspector-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const snapshot = await getInspectorSettingsSnapshot();

  return <SettingsControlPanel initialSnapshot={snapshot} />;
}

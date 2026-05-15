import { RediemImportPanel } from "@/components/rediem/RediemImportPanel";
import { RediemShell } from "@/components/rediem/RediemShell";
import { getWorkspaceSummary } from "@/server/workspace/tableData";

export const dynamic = "force-dynamic";

export default async function RediemImportPage() {
  const workspace = await getWorkspaceSummary();

  return (
    <RediemShell
      description="Bring in ecommerce account lists, validate domains, dedupe against the workspace, and prepare brands for Rediem analysis."
      title="Brand Import"
    >
      <RediemImportPanel workspaceId={workspace?.id} />
    </RediemShell>
  );
}

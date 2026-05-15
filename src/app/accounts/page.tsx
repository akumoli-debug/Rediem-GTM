import { AccountTable } from "@/components/workspace/AccountTable";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { getAccountTableData } from "@/server/workspace/tableData";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const data = await getAccountTableData();

  return (
    <WorkspaceShell
      description="Prioritize target accounts with enrichment evidence, signal scores, persona recommendations, and formula columns."
      title="Accounts"
    >
      <AccountTable
        formulaColumns={data.formulaColumns}
        playbooks={data.playbooks}
        rows={data.rows}
        signalTypes={data.signalTypes}
        workspaceId={data.workspace?.id}
      />
    </WorkspaceShell>
  );
}

import { PeopleTable } from "@/components/workspace/PeopleTable";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { getPeopleTableData } from "@/server/workspace/tableData";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const data = await getPeopleTableData();

  return (
    <WorkspaceShell
      description="Resolve buying committees, inspect contactability, verify emails, and review formula-derived readiness fields."
      title="People"
    >
      <PeopleTable
        emailStatuses={data.emailStatuses}
        formulaColumns={data.formulaColumns}
        personaTypes={data.personaTypes}
        rows={data.rows}
      />
    </WorkspaceShell>
  );
}


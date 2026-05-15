import { RediemAccountTable } from "@/components/rediem/RediemAccountTable";
import { RediemShell } from "@/components/rediem/RediemShell";
import { getRediemAccountsData } from "@/server/rediem/uiData";

export const dynamic = "force-dynamic";

export default async function RediemAccountsPage() {
  const data = await getRediemAccountsData();

  return (
    <RediemShell
      description="Prioritize DTC and ecommerce brands by loyalty maturity, community readiness, migration pain, and activation potential."
      title="Brand Account Intelligence"
    >
      <RediemAccountTable metrics={data.metrics} rows={data.rows} />
    </RediemShell>
  );
}

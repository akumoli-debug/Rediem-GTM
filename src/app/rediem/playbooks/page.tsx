import { RediemShell } from "@/components/rediem/RediemShell";
import { getRediemPlaybooksData } from "@/server/rediem/uiData";

export const dynamic = "force-dynamic";

const rediemMotions = [
  {
    name: "Loyalty Migration",
    focus: "Brands with points, VIP tiers, referrals, reviews, and visible migration pain.",
    steps: ["Analyze brand", "Detect loyalty stack", "Generate VIP migration idea", "Resolve retention and ecommerce buyers"]
  },
  {
    name: "Community Activation",
    focus: "Brands with UGC, social community, mission angles, drops, or ambassador potential.",
    steps: ["Score community readiness", "Find operator buyers", "Generate UGC/social challenge", "Export cited angle"]
  },
  {
    name: "Retail-to-DTC Bridge",
    focus: "Brands with retail presence, DTC site, reviews, and subscription or repeat-purchase categories.",
    steps: ["Detect retail evidence", "Create receipt upload challenge", "Map lifecycle buyers", "Export CRM-safe row"]
  }
] as const;

export default async function RediemPlaybooksPage() {
  const data = await getRediemPlaybooksData();

  return (
    <RediemShell
      description="Use focused Rediem motions to decide which evidence to collect, which buyers to resolve, and which activation play to lead with."
      title="Rediem Playbooks"
    >
      <section className="template-grid rediem-playbook-grid">
        {rediemMotions.map((motion) => (
          <article className="template-card rediem-playbook-card" key={motion.name}>
            <div>
              <span className="status ready">Recommended</span>
              <h3>{motion.name}</h3>
              <p>{motion.focus}</p>
            </div>
            <ol className="rediem-step-list">
              {motion.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        ))}
      </section>

      <section className="data-panel">
        <div className="panel-header">
          <h2>Workspace Playbooks</h2>
          <p>Saved playbooks available in this workspace.</p>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Motion</th>
                <th>Description</th>
                <th>Workflow Steps</th>
                <th>Budget</th>
              </tr>
            </thead>
            <tbody>
              {data.playbooks.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan={5}>
                    No saved playbooks found.
                  </td>
                </tr>
              ) : (
                data.playbooks.map((playbook) => (
                  <tr key={playbook.id}>
                    <td>{playbook.name}</td>
                    <td>{playbook.targetMotion}</td>
                    <td>{playbook.description}</td>
                    <td>{arrayOfStrings(playbook.workflowSteps).join(", ") || "—"}</td>
                    <td>
                      <code>{JSON.stringify(playbook.budgetDefaults)}</code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </RediemShell>
  );
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

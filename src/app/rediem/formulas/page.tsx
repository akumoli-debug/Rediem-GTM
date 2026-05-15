import { FormulaTemplateGallery } from "@/components/workspace/FormulaTemplateGallery";
import { RediemShell } from "@/components/rediem/RediemShell";
import { getRediemFormulaData } from "@/server/rediem/uiData";

export const dynamic = "force-dynamic";

export default async function RediemFormulasPage() {
  const { formulas, templates, workspace } = await getRediemFormulaData();

  return (
    <RediemShell
      description="Install and inspect Rediem-specific formula columns for fit scores, loyalty pain, migration pain, tiers, and recommended plays."
      title="Rediem Formula Columns"
    >
      <FormulaTemplateGallery templates={templates} workspaceId={workspace?.id} />
      <section className="data-panel">
        <div className="panel-header">
          <h2>Installed Rediem Formulas</h2>
          <p>Formula outputs are rendered in the Rediem account cockpit and detail pages.</p>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Scope</th>
                <th>Output</th>
                <th>Enabled</th>
                <th>Expression</th>
                <th>Results</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {formulas.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan={7}>
                    No Rediem formula columns are installed yet.
                  </td>
                </tr>
              ) : (
                formulas.map((formula) => {
                  const errors = formula.results.filter((result) => result.error).length;
                  return (
                    <tr key={formula.id}>
                      <td>{formula.name}</td>
                      <td>{formatEnum(formula.scope)}</td>
                      <td>{formatEnum(formula.outputType)}</td>
                      <td>{formula.enabled ? "Yes" : "No"}</td>
                      <td>
                        <code>{formula.expression}</code>
                      </td>
                      <td>{formula.results.length}</td>
                      <td>{errors}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </RediemShell>
  );
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

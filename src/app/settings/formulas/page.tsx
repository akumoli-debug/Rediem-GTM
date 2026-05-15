import { FormulaTemplateGallery } from "@/components/workspace/FormulaTemplateGallery";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { getFormulaSettingsData } from "@/server/workspace/tableData";

export const dynamic = "force-dynamic";

export default async function FormulasSettingsPage() {
  const { formulas, templates, workspace } = await getFormulaSettingsData();

  return (
    <WorkspaceShell
      description="Create and review safe formula columns for account and person tables."
      title="Formula Settings"
    >
      <FormulaTemplateGallery
        templates={templates}
        workspaceId={workspace?.id}
      />
      <section className="toolbar-panel">
        <div className="filters">
          <label>
            <span>Scope</span>
            <select defaultValue="">
              <option value="">Any scope</option>
              <option value="ACCOUNT">Account</option>
              <option value="PERSON">Person</option>
            </select>
          </label>
          <label>
            <span>Output type</span>
            <select defaultValue="">
              <option value="">Any type</option>
              <option value="STRING">String</option>
              <option value="NUMBER">Number</option>
              <option value="BOOLEAN">Boolean</option>
              <option value="DATE">Date</option>
              <option value="JSON">JSON</option>
            </select>
          </label>
        </div>
        <div className="bulk-bar">
          <strong>{formulas.length} formulas</strong>
          <button type="button">
            Evaluate all
          </button>
        </div>
      </section>
      <section className="data-panel">
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
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {formulas.map((formula) => {
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
                    <td>{formatDate(formula.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceShell>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

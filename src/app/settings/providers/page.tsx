import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { getProviderSettingsData } from "@/server/workspace/tableData";

export const dynamic = "force-dynamic";

const configuredKeys = [
  "MCP_RESEARCH_SERVER_COMMAND",
  "APIFY_TOKEN",
  "FIRECRAWL_API_KEY",
  "BROWSERBASE_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "HUBSPOT_ACCESS_TOKEN",
  "SALESFORCE_CLIENT_ID"
];

export default async function ProvidersSettingsPage() {
  const { providers, budgetControls } = await getProviderSettingsData();

  return (
    <WorkspaceShell
      description="Configure provider adapters, monitor health, and inspect recent enrichment provider activity."
      title="Provider Settings"
    >
      <section className="settings-grid">
        <div className="data-panel">
          <div className="panel-header">
            <h2>Runtime Configuration</h2>
            <p>Secrets are shown only as configured or missing.</p>
          </div>
          <div className="settings-list">
            {configuredKeys.map((key) => (
              <div className="settings-row" key={key}>
                <span>{key}</span>
                <strong>{process.env[key] ? "Configured" : "Missing"}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="data-panel">
          <div className="panel-header">
            <h2>Budget Controls</h2>
            <p>Default controls used by workflow cost guards.</p>
          </div>
          <div className="settings-list">
            <SummaryRow
              label="maxCostPerAccount"
              value={`$${budgetControls.maxCostPerAccount}`}
            />
            <SummaryRow
              label="maxCostPerContact"
              value={`$${budgetControls.maxCostPerContact}`}
            />
            <SummaryRow
              label="maxTotalRunCost"
              value={`$${budgetControls.maxTotalRunCost}`}
            />
            <SummaryRow
              label="stopRunOnBudgetExceeded"
              value={budgetControls.stopRunOnBudgetExceeded ? "true" : "false"}
            />
          </div>
        </div>
      </section>
      <section className="data-panel run-section">
        <div className="panel-header">
          <h2>Provider Health</h2>
          <p>Configuration, latency, success rate, failures, and estimated cost.</p>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Configured</th>
                <th>Missing Keys</th>
                <th>Last Success</th>
                <th>Last Failure</th>
                <th>Avg Latency</th>
                <th>Success Rate</th>
                <th>Estimated Cost</th>
                <th>Calls</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.provider}>
                  <td>{provider.provider}</td>
                  <td>
                    <span className={`status ${provider.configured ? "verified" : "risky"}`}>
                      {provider.configured ? "Configured" : "Missing"}
                    </span>
                  </td>
                  <td>{provider.missingKeys.join(", ") || "—"}</td>
                  <td>
                    {provider.lastSuccessfulCall
                      ? formatDate(provider.lastSuccessfulCall)
                      : "—"}
                  </td>
                  <td>{provider.lastFailure ? formatDate(provider.lastFailure) : "—"}</td>
                  <td>
                    {provider.averageLatencyMs === null
                      ? "—"
                      : `${provider.averageLatencyMs}ms`}
                  </td>
                  <td>{provider.successRate}%</td>
                  <td>${provider.estimatedCostUsd.toFixed(4)}</td>
                  <td>{provider.calls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="settings-grid">
        <div className="data-panel">
          <div className="panel-header">
            <h2>Provider Activity</h2>
            <p>Recent provider calls grouped by adapter name.</p>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Calls</th>
                  <th>Success Rate</th>
                  <th>Latest Status</th>
                  <th>Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => (
                  <tr key={provider.provider}>
                    <td>{provider.provider}</td>
                    <td>{provider.calls}</td>
                    <td>{provider.successRate}%</td>
                    <td>
                      {provider.lastFailure
                        ? "FAILED"
                        : provider.lastSuccessfulCall
                          ? "SUCCESS"
                          : "UNKNOWN"}
                    </td>
                    <td>
                      {provider.averageLatencyMs === null
                        ? "—"
                        : `${provider.averageLatencyMs}ms`}
                    </td>
                  </tr>
                ))}
                {providers.length === 0 ? (
                  <tr>
                    <td className="empty-state" colSpan={5}>
                      No provider calls have been recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

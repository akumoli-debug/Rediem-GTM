import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { getRunDetailData } from "@/server/workspace/tableData";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getRunDetailData(id);

  if (!data) {
    notFound();
  }

  const { run, metrics, generated, providerCalls, errorsByProviderTool, cacheHits } = data;

  return (
    <WorkspaceShell
      description="Inspect provider calls, costs, cache usage, generated records, errors, and workflow events."
      title={run.workflowName}
    >
      <section className="metrics compact-metrics" aria-label="Run cost metrics">
        <Metric label="Input Count" value={run.inputCount.toString()} />
        <Metric label="Success" value={run.successCount.toString()} />
        <Metric label="Failures" value={run.failureCount.toString()} />
        <Metric label="Total Cost" value={`$${metrics.totalCostUsd.toFixed(4)}`} />
        <Metric
          label="Cost / Account"
          value={metrics.costPerAccount === null ? "—" : `$${metrics.costPerAccount.toFixed(4)}`}
        />
        <Metric
          label="Cost / Verified Contact"
          value={
            metrics.costPerVerifiedContact === null
              ? "—"
              : `$${metrics.costPerVerifiedContact.toFixed(4)}`
          }
        />
        <Metric label="Cache Hits" value={cacheHits.length.toString()} />
        <Metric label="Cache Hit Rate" value={`${metrics.cacheHitRate}%`} />
      </section>

      <section className="settings-grid">
        <div className="data-panel">
          <div className="panel-header">
            <h2>Generated Records</h2>
            <p>Records created or updated after the run start time.</p>
          </div>
          <div className="settings-list">
            <SummaryRow label="Accounts" value={generated.accounts.length.toString()} />
            <SummaryRow label="Signals" value={generated.signals.length.toString()} />
            <SummaryRow label="People" value={generated.people.length.toString()} />
            <SummaryRow
              label="Verified Contacts"
              value={generated.people
                .filter((person) => person.emailStatus === "VERIFIED")
                .length.toString()}
            />
          </div>
        </div>
        <div className="data-panel">
          <div className="panel-header">
            <h2>Field Fill Rates</h2>
            <p>Completeness after enrichment for generated records.</p>
          </div>
          <div className="settings-list">
            {[...data.fieldFillRates.accounts, ...data.fieldFillRates.people].map((rate) => (
              <SummaryRow
                key={`${rate.field}-${rate.total}`}
                label={rate.field}
                value={`${rate.rate}% (${rate.filled}/${rate.total})`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="data-panel run-section">
        <div className="panel-header">
          <h2>Provider Calls</h2>
          <p>Every ProviderResult linked to this workflow run.</p>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Tool</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Cost</th>
                <th>Created</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {providerCalls.map((call, index) => (
                <tr key={`${call.provider}-${call.toolName}-${index}`}>
                  <td>{call.provider}</td>
                  <td>{call.toolName}</td>
                  <td>
                    <span className={`status ${call.status.toLowerCase()}`}>
                      {formatEnum(call.status)}
                    </span>
                  </td>
                  <td>{call.latencyMs === null ? "—" : `${call.latencyMs}ms`}</td>
                  <td>${call.costUsd.toFixed(4)}</td>
                  <td>{formatDate(call.createdAt)}</td>
                  <td>{call.errorMessage ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="settings-grid run-section">
        <div className="data-panel">
          <div className="panel-header">
            <h2>Errors By Provider</h2>
            <p>Grouped by provider and tool.</p>
          </div>
          <div className="settings-list">
            {errorsByProviderTool.length === 0 ? (
              <p className="empty-state">No provider errors recorded.</p>
            ) : (
              errorsByProviderTool.map((error) => (
                <SummaryRow
                  key={`${error.provider}-${error.toolName}`}
                  label={`${error.provider}.${error.toolName}`}
                  value={`${error.count}: ${error.latestError}`}
                />
              ))
            )}
          </div>
        </div>
        <div className="data-panel">
          <div className="panel-header">
            <h2>Events Timeline</h2>
            <p>Run lifecycle and provider events.</p>
          </div>
          <div className="timeline-list">
            {data.timeline.map((event, index) => (
              <div className="timeline-item" key={`${event.label}-${index}`}>
                <span>{formatDate(event.timestamp)}</span>
                <strong>{event.label}</strong>
                <p>{event.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
    </div>
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

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}


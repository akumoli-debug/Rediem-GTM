import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { getRunsPageData } from "@/server/workspace/tableData";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const { runs, metrics, budgetControls } = await getRunsPageData();

  return (
    <WorkspaceShell
      description="Track enrichment workflow runs, provider calls, cost, latency, status, and failure counts."
      title="Runs"
    >
      <section className="metrics compact-metrics" aria-label="Run metrics">
        <div className="metric-card">
          <span className="metric-label">Provider Calls</span>
          <strong className="metric-value">{metrics.providerCallCount}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Cost</span>
          <strong className="metric-value">${metrics.totalCostUsd.toFixed(4)}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Cache Hit Rate</span>
          <strong className="metric-value">{metrics.cacheHitRate}%</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Avg Latency</span>
          <strong className="metric-value">
            {metrics.averageLatencyMs === null ? "—" : `${metrics.averageLatencyMs}ms`}
          </strong>
        </div>
      </section>
      <section className="toolbar-panel">
        <div className="filters">
          <label>
            <span>Status</span>
            <select defaultValue="">
              <option value="">Any status</option>
              <option value="QUEUED">Queued</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </label>
          <label>
            <span>Started after</span>
            <input type="date" />
          </label>
        </div>
        <div className="bulk-bar">
          <strong>Budget controls</strong>
          <span className="table-notice">
            Account ${budgetControls.maxCostPerAccount} · Contact $
            {budgetControls.maxCostPerContact} · Run ${budgetControls.maxTotalRunCost} · Stop{" "}
            {budgetControls.stopRunOnBudgetExceeded ? "on" : "off"}
          </span>
        </div>
      </section>
      <section className="data-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="select-column">
                  <input aria-label="Select runs" type="checkbox" />
                </th>
                <th>Workflow</th>
                <th>Status</th>
                <th>Inputs</th>
                <th>Success</th>
                <th>Failures</th>
                <th>Cost</th>
                <th>Provider Calls</th>
                <th>Started</th>
                <th>Completed</th>
                <th>Error</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="select-column">
                    <input aria-label={`Select ${run.workflowName}`} type="checkbox" />
                  </td>
                  <td>
                    <Link href={`/runs/${run.id}`}>{run.workflowName}</Link>
                  </td>
                  <td>
                    <span className={`status ${run.status.toLowerCase()}`}>
                      {formatEnum(run.status)}
                    </span>
                  </td>
                  <td>{run.inputCount}</td>
                  <td>{run.successCount}</td>
                  <td>{run.failureCount}</td>
                  <td>${run.totalCostUsd?.toString() ?? "0.0000"}</td>
                  <td>{run.providerResults.length}</td>
                  <td>{run.startedAt ? formatDate(run.startedAt) : "—"}</td>
                  <td>{run.completedAt ? formatDate(run.completedAt) : "—"}</td>
                  <td>{run.errorMessage ?? "—"}</td>
                  <td>
                    <Link className="button secondary" href={`/runs/${run.id}`}>
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceShell>
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

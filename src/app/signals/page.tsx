import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { getSignalsPageData } from "@/server/workspace/tableData";

export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  const { signals } = await getSignalsPageData();
  const signalTypes = Array.from(new Set(signals.map((signal) => signal.type))).sort();

  return (
    <WorkspaceShell
      description="Review fresh market, hiring, product, pricing, compliance, and expansion signals used by account scoring."
      title="Signals"
    >
      <section className="toolbar-panel">
        <div className="filters">
          <label>
            <span>Signal type</span>
            <select defaultValue="">
              <option value="">Any signal</option>
              {signalTypes.map((type) => (
                <option key={type} value={type}>
                  {formatEnum(type)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Total score &gt;</span>
            <input placeholder="70" type="number" />
          </label>
          <label>
            <span>Signal date after</span>
            <input type="date" />
          </label>
        </div>
        <div className="bulk-bar">
          <strong>0 selected</strong>
          <button disabled type="button">
            Re-score
          </button>
          <button disabled type="button">
            Export
          </button>
        </div>
      </section>
      <section className="data-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="select-column">
                  <input aria-label="Select signals" type="checkbox" />
                </th>
                <th>Account</th>
                <th>Type</th>
                <th>Title</th>
                <th>Signal Date</th>
                <th>Freshness</th>
                <th>Relevance</th>
                <th>Source Quality</th>
                <th>Total Score</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal) => (
                <tr key={signal.id}>
                  <td className="select-column">
                    <input aria-label={`Select ${signal.title}`} type="checkbox" />
                  </td>
                  <td>{signal.account.name}</td>
                  <td>{formatEnum(signal.type)}</td>
                  <td>{signal.title}</td>
                  <td>{formatDate(signal.signalDate ?? signal.createdAt)}</td>
                  <td>{formatScore(signal.freshnessScore)}</td>
                  <td>{formatScore(signal.relevanceScore)}</td>
                  <td>{formatScore(signal.sourceQualityScore)}</td>
                  <td>{formatScore(signal.totalScore)}</td>
                  <td>{signal.sourceUrl ? <a href={signal.sourceUrl}>Open</a> : "—"}</td>
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
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatScore(score: number | null) {
  return score === null ? "—" : Math.round(score).toString();
}


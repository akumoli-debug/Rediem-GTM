import Link from "next/link";
import { MetricCard } from "@/components/MetricCard";

const workflowSteps = [
  {
    title: "Import account lists",
    body: "Normalize company names, domains, firmographics, and raw CSV context for traceable enrichment."
  },
  {
    title: "Run enrichment waterfalls",
    body: "Route account and contact research through provider adapters with confidence thresholds and spend limits."
  },
  {
    title: "Score signals",
    body: "Apply formula columns and scoring models against enriched fields, evidence, and buying committee data."
  },
  {
    title: "Export CRM-ready data",
    body: "Prepare accounts, contacts, scores, and citations for downstream revenue systems."
  }
];

const sampleRows = [
  {
    account: "Northstar Robotics",
    accountFormula: "Tier 1",
    personFormula: "Sequence",
    signal: "Expansion hiring",
    score: "86",
    status: "Ready"
  },
  {
    account: "LumenGrid Energy",
    accountFormula: "Tier 2",
    personFormula: "Review",
    signal: "New market launch",
    score: "74",
    status: "Draft"
  },
  {
    account: "AtlasWorks Cloud",
    accountFormula: "Tier 1",
    personFormula: "Sequence",
    signal: "Security initiative",
    score: "91",
    status: "Ready"
  }
];

export default function Home() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>GTM Engine</strong>
            <span>Account Intelligence Workspace</span>
          </div>
          <nav className="nav" aria-label="Primary">
            <Link className="nav-link" href="/accounts">
              Accounts
            </Link>
            <Link className="nav-link" href="/people">
              People
            </Link>
            <Link className="nav-link" href="/runs">
              Runs
            </Link>
          </nav>
        </div>
      </header>

      <main className="main">
        <section className="section-header">
          <div>
            <p className="eyebrow">Research Operations</p>
            <h1>Build account intelligence workflows with evidence and cost control.</h1>
            <p className="lede">
              A technical GTM workspace for enrichment runs, formula columns,
              signal scoring, buying committee research, and CRM-ready exports.
            </p>
          </div>
          <div className="button-row" aria-label="Workspace actions">
            <Link className="button" href="/accounts">
              Open Accounts
            </Link>
            <Link className="button secondary" href="/settings/formulas">
              View Formulas
            </Link>
          </div>
        </section>

        <section className="metrics" aria-label="Workspace metrics">
          <MetricCard label="Accounts" value="1,248" />
          <MetricCard label="Evidence Items" value="8,392" />
          <MetricCard label="Formula Columns" value="14" />
          <MetricCard label="Export Readiness" value="92%" />
        </section>

        <section className="workspace-grid" id="workflow">
          <div className="workflow-panel">
            <div className="panel-header">
              <h2>Enrichment Workflow</h2>
              <p>
                The scaffold is organized around provider adapters, queue-backed
                jobs, normalized evidence, and formula-based scoring.
              </p>
            </div>
            <ol className="workflow-list">
              {workflowSteps.map((step, index) => (
                <li className="workflow-step" key={step.title}>
                  <span className="step-number">{index + 1}</span>
                  <span>
                    <strong>{step.title}</strong>
                    <span>{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="table-panel" id="signals">
            <div className="panel-header">
              <h2>Signal Preview</h2>
              <p>
                Sample account intelligence rows showing the shape of the first
                product slice.
              </p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Account Formula</th>
                  <th>Person Formula</th>
                  <th>Signal</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((row) => (
                  <tr key={row.account}>
                    <td>{row.account}</td>
                    <td>{row.accountFormula}</td>
                    <td>{row.personFormula}</td>
                    <td>{row.signal}</td>
                    <td>{row.score}</td>
                    <td>
                      <span
                        className={`status ${
                          row.status === "Ready" ? "ready" : "draft"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

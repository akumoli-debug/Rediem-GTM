import type { RediemGtmDiagnosticView, RediemRecommendedPlaybookView } from "./types";

export function GtmDiagnosticsPanel({
  diagnostics,
  diagnosticDetails,
  recommendedPlaybook
}: {
  diagnostics: RediemGtmDiagnosticView[];
  diagnosticDetails: RediemGtmDiagnosticView[];
  recommendedPlaybook: RediemRecommendedPlaybookView | null;
}) {
  const primary = diagnostics[0] ?? null;
  const secondary = diagnostics[1] ?? null;

  return (
    <section className="data-panel rediem-card">
      <div className="panel-header rediem-priority-header">
        <div>
          <p className="eyebrow">2. What participation is leaking?</p>
          <h2>GTM Diagnosis</h2>
          <p>Lead with the diagnosis, playbook, confidence, and evidence count. Keep the full metric set in details.</p>
        </div>
      </div>
      <div className="rediem-diagnosis-summary">
        {primary ? (
          <DiagnosisCard diagnostic={primary} label="Primary GTM diagnosis" />
        ) : (
          <p className="empty-state">No GTM diagnosis is available. Run Rediem analysis before outbound.</p>
        )}
        {secondary ? <DiagnosisCard diagnostic={secondary} label="Secondary diagnosis" /> : null}
        <div className="rediem-diagnosis-card">
          <span>Recommended Rediem playbook</span>
          <strong>{recommendedPlaybook?.title ?? "Manual research first"}</strong>
          <p>
            {recommendedPlaybook
              ? `${recommendedPlaybook.confidenceLabel} at ${formatConfidence(recommendedPlaybook.confidence)} with ${recommendedPlaybook.evidenceCount} evidence links.`
              : "No playbook cleared the selection threshold."}
          </p>
        </div>
      </div>
      {diagnosticDetails.length > 0 ? (
        <details className="rediem-diagnostic-details">
          <summary>Diagnostic details</summary>
          <div className="rediem-diagnostic-list">
            {diagnosticDetails.map((diagnostic) => (
              <article className="rediem-diagnostic-card" key={diagnostic.metricId}>
                <div className="rediem-diagnostic-score">
                  <span>{diagnostic.metricId}</span>
                  <strong>{Math.round(diagnostic.score)}</strong>
                </div>
                <div>
                  <div className="rediem-diagnostic-title">
                    <strong>{diagnostic.label}</strong>
                    <span className={`status ${diagnostic.confidence < 0.55 ? "risky" : "ready"}`}>
                      {diagnostic.confidenceLabel} · {formatConfidence(diagnostic.confidence)}
                    </span>
                  </div>
                  <p>{diagnostic.explanation}</p>
                  <small>{diagnostic.evidenceCount} evidence links</small>
                  {diagnostic.sourceUrls.length > 0 ? (
                    <div className="rediem-evidence-links">
                      {diagnostic.sourceUrls.slice(0, 3).map((url) => (
                        <a href={url} key={url} rel="noreferrer" target="_blank">
                          Evidence
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function DiagnosisCard({
  diagnostic,
  label
}: {
  diagnostic: RediemGtmDiagnosticView;
  label: string;
}) {
  return (
    <article className="rediem-diagnosis-card">
      <span>{label}</span>
      <strong>{diagnostic.label}</strong>
      <p>{diagnostic.explanation}</p>
      <small>
        {diagnostic.confidenceLabel} · {formatConfidence(diagnostic.confidence)} ·{" "}
        {diagnostic.evidenceCount} evidence links
      </small>
    </article>
  );
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

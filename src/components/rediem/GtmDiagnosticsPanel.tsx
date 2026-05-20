import type { RediemGtmDiagnosticView } from "./types";

export function GtmDiagnosticsPanel({
  diagnostics
}: {
  diagnostics: RediemGtmDiagnosticView[];
}) {
  return (
    <section className="data-panel rediem-card">
      <div className="panel-header rediem-priority-header">
        <div>
          <p className="eyebrow">2. What participation is leaking?</p>
          <h2>Top GTM Diagnostics</h2>
          <p>The highest-signal diagnostics explain where the brand has participation energy that Rediem can capture.</p>
        </div>
      </div>
      <div className="rediem-diagnostic-list">
        {diagnostics.length === 0 ? (
          <p className="empty-state">No GTM diagnostics available. Run Rediem analysis to calculate PCG, RCBI, SFI, and related metrics.</p>
        ) : (
          diagnostics.slice(0, 3).map((diagnostic) => (
            <article className="rediem-diagnostic-card" key={diagnostic.metricId}>
              <div className="rediem-diagnostic-score">
                <span>{diagnostic.metricId}</span>
                <strong>{Math.round(diagnostic.score)}</strong>
              </div>
              <div>
                <div className="rediem-diagnostic-title">
                  <strong>{diagnostic.label}</strong>
                  <span className={`status ${diagnostic.confidence < 0.45 ? "risky" : "ready"}`}>
                    {diagnostic.tier} · {formatConfidence(diagnostic.confidence)}
                  </span>
                </div>
                <p>{diagnostic.explanation}</p>
                {diagnostic.confidence < 0.45 ? (
                  <small className="rediem-low-confidence">Low-confidence diagnostic. Validate evidence before outbound.</small>
                ) : null}
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
          ))
        )}
      </div>
    </section>
  );
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

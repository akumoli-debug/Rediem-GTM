import type { RediemRecommendedPlaybookView } from "./types";

export function RecommendedPlaybookPanel({
  playbook,
  fallbackAngle
}: {
  playbook: RediemRecommendedPlaybookView | null;
  fallbackAngle: string;
}) {
  return (
    <section className="data-panel rediem-card rediem-action-panel">
      <div className="panel-header">
        <p className="eyebrow">3. What should Rediem do?</p>
        <h2>Recommended Playbook</h2>
        <p>The cockpit should lead to a specific Rediem action, not just a score.</p>
      </div>
      {playbook ? (
        <div className="rediem-playbook-focus">
          <div className="rediem-playbook-title">
            <span className={`status ${playbook.confidence < 0.45 ? "risky" : "ready"}`}>
              {formatReadiness(playbook.readiness)} · {formatConfidence(playbook.confidence)}
            </span>
            <h3>{playbook.title}</h3>
            <p>{playbook.thesis}</p>
          </div>
          <div className="rediem-next-action-grid">
            <div>
              <span>Buyer persona</span>
              <strong>{playbook.buyerPersona}</strong>
            </div>
            <div>
              <span>Activation idea</span>
              <strong>{playbook.activationIdea}</strong>
            </div>
          </div>
          <blockquote>{playbook.outboundAngle}</blockquote>
          {playbook.whySelected.length > 0 ? (
            <ul className="rediem-plain-list">
              {playbook.whySelected.slice(0, 3).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          {playbook.sourceUrls.length > 0 ? (
            <div className="rediem-evidence-links">
              {playbook.sourceUrls.slice(0, 4).map((url) => (
                <a href={url} key={url} rel="noreferrer" target="_blank">
                  Evidence
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rediem-playbook-focus">
          <p className="empty-state">No playbook met the selection threshold. Use the fallback angle only after reviewing evidence.</p>
          <blockquote>{fallbackAngle}</blockquote>
        </div>
      )}
    </section>
  );
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatReadiness(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

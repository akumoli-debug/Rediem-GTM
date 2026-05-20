import type { RediemParticipationLeakView } from "./types";

export function ParticipationLeakPanel({
  leak
}: {
  leak: RediemParticipationLeakView | null;
}) {
  return (
    <section className="data-panel rediem-card">
      <div className="panel-header">
        <p className="eyebrow">2. What participation is leaking?</p>
        <h2>Primary Participation Leak</h2>
        <p>The lead leak translates CFR into the first operational problem Rediem should solve.</p>
      </div>
      {leak ? (
        <div className="rediem-leak-body">
          <div className="rediem-leak-score">
            <span>Severity</span>
            <strong>{Math.round(leak.severity)}</strong>
          </div>
          <div className="rediem-leak-copy">
            <span className="status risky">{formatEnum(leak.leakType)}</span>
            <p>{leak.description}</p>
            <strong>{leak.recommendedFix}</strong>
            {leak.sourceUrls.length > 0 ? (
              <div className="rediem-evidence-links">
                {leak.sourceUrls.slice(0, 3).map((url) => (
                  <a href={url} key={url} rel="noreferrer" target="_blank">
                    Source
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="empty-state rediem-panel-empty">No participation leak is available yet.</p>
      )}
    </section>
  );
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

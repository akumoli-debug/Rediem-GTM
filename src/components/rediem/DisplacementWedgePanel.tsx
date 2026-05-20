import type { RediemDisplacementWedgeView } from "./types";

export function DisplacementWedgePanel({
  wedge,
  evidenceUrls
}: {
  wedge: RediemDisplacementWedgeView | null;
  evidenceUrls: string[];
}) {
  return (
    <section className="data-panel rediem-card">
      <div className="panel-header">
        <p className="eyebrow">4. Who should Rediem talk to?</p>
        <h2>Displacement Wedge</h2>
        <p>Use the detected stack to shape the conversation without rip-and-replace positioning.</p>
      </div>
      {wedge ? (
        <div className="rediem-wedge-body">
          <div className="rediem-wedge-heading">
            <span className="status cached">{wedge.vendor} · {wedge.category}</span>
            <strong>{wedge.buyerPersona}</strong>
            <small>
              {wedge.confidenceLabel} · {formatConfidence(wedge.confidence)} ·{" "}
              {wedge.evidenceCount} evidence links
            </small>
          </div>
          <div className="rediem-wedge-warning">
            <span>What not to say</span>
            <strong>{wedge.whatNotToSay}</strong>
          </div>
          <p>{wedge.rediemWedge}</p>
          <p className="rediem-muted-copy">{wedge.recommendedAngle}</p>
          {wedge.confidence < 0.45 ? (
            <small className="rediem-low-confidence">Low-confidence wedge. Validate tool evidence before using this angle.</small>
          ) : null}
          {wedge.supportingDiagnostics.length > 0 ? (
            <ul className="rediem-plain-list">
              {wedge.supportingDiagnostics.slice(0, 3).map((diagnostic) => (
                <li key={diagnostic}>{diagnostic}</li>
              ))}
            </ul>
          ) : null}
          <EvidenceLinks urls={wedge.sourceUrls.length > 0 ? wedge.sourceUrls : evidenceUrls} />
        </div>
      ) : (
        <div className="rediem-wedge-body">
          <p className="empty-state">No displacement wedge is available yet. Use stack detections and evidence URLs for manual review.</p>
          <EvidenceLinks urls={evidenceUrls} />
        </div>
      )}
    </section>
  );
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function EvidenceLinks({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return <p className="empty-state">No evidence URLs stored.</p>;
  }

  return (
    <div className="rediem-evidence-block">
      <span>Evidence URLs</span>
      <div className="rediem-evidence-links">
        {urls.slice(0, 5).map((url) => (
          <a href={url} key={url} rel="noreferrer" target="_blank">
            Source
          </a>
        ))}
      </div>
    </div>
  );
}

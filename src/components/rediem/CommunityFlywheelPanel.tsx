import type { RediemAccountDetail } from "./types";

export function CommunityFlywheelPanel({
  detail
}: {
  detail: RediemAccountDetail;
}) {
  const { row, communityFlywheel } = detail;

  return (
    <section className="data-panel rediem-card rediem-priority-panel rediem-cfr-panel">
      <div className="panel-header rediem-priority-header">
        <div>
          <p className="eyebrow">1. Is this brand a Rediem fit?</p>
          <h2>Community Flywheel Ratio</h2>
          <p>CFR frames whether the brand is earning participation or relying on subsidized transactional motion.</p>
        </div>
        {communityFlywheel.lowConfidence ? (
          <span className="rediem-warning-pill">Low confidence</span>
        ) : null}
      </div>

      <div className="rediem-cfr-layout">
        <div className="rediem-cfr-score" aria-label="Community Flywheel Ratio score">
          <span>CFR</span>
          <strong>{formatCfr(communityFlywheel.estimatedCfr)}</strong>
          <em>{communityFlywheel.cfrTier}</em>
        </div>
        <div className="rediem-cfr-context">
          <div className="rediem-fit-strip">
            <div>
              <span>Rediem fit</span>
              <strong>{formatScore(row.rediemFitScore)}</strong>
            </div>
            <div>
              <span>Tier</span>
              <strong>{row.tier}</strong>
            </div>
            <div>
              <span>CFR confidence</span>
              <strong>{formatConfidence(communityFlywheel.cfrConfidence)}</strong>
            </div>
          </div>
          <div className="rediem-cfr-comparison">
            <Metric label="Earned community growth" value={communityFlywheel.earnedCommunityGrowth} />
            <Metric label="Subsidized transactional growth" value={communityFlywheel.subsidizedTransactionalGrowth} />
          </div>
          {communityFlywheel.explanation.length > 0 ? (
            <ul className="rediem-plain-list">
              {communityFlywheel.explanation.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Run Rediem analysis to populate CFR context.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rediem-mini-metric">
      <span>{label}</span>
      <strong>{formatScore(value)}</strong>
    </div>
  );
}

function formatCfr(value: number | null) {
  return value === null ? "—" : value.toFixed(2).replace(/\.?0+$/, "");
}

function formatScore(value: number | null) {
  return value === null ? "—" : Math.round(value).toString();
}

function formatConfidence(value: number | null) {
  return value === null ? "n/a" : `${Math.round(value * 100)}%`;
}

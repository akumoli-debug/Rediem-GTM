export function ScoreBar({
  label,
  score
}: {
  label: string;
  score: number | null;
}) {
  const normalizedScore = score === null ? 0 : Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div className="rediem-score-row">
      <div>
        <span>{label}</span>
        <strong>{score === null ? "—" : normalizedScore}</strong>
      </div>
      <div className="rediem-score-track" aria-hidden="true">
        <span style={{ width: `${normalizedScore}%` }} />
      </div>
    </div>
  );
}

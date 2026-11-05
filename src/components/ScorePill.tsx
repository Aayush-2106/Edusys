/** Colour-coded score badge. Red below 5, amber 5–7, green above 7. */
export function ScorePill({ score, large = false }: { score: number; large?: boolean }) {
  const tone =
    score >= 7 ? "var(--success)" : score >= 5 ? "var(--warning)" : "var(--danger)";

  return (
    <span
      className={`shrink-0 rounded-full border font-bold tabular-nums ${
        large ? "px-4 py-1.5 text-lg" : "px-3 py-1 text-sm"
      }`}
      style={{ color: tone, borderColor: tone }}
    >
      {score.toFixed(1)}/10
    </span>
  );
}

/** Horizontal bar used for per-parameter breakdowns. */
export function ScoreBar({ label, score }: { label: string; score: number }) {
  const tone =
    score >= 7 ? "var(--success)" : score >= 5 ? "var(--warning)" : "var(--danger)";

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold tabular-nums" style={{ color: tone }}>
          {score.toFixed(1)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(0, Math.min(100, score * 10))}%`, background: tone }}
        />
      </div>
    </div>
  );
}

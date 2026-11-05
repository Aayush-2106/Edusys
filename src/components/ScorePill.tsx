/**
 * Score display primitives.
 *
 * The numeric value is always rendered next to the colour, so the
 * red/amber/green band is a secondary cue and never the only one —
 * which is what keeps it readable for colour-blind viewers.
 */

export type Band = "good" | "mid" | "bad";

export function band(score: number): Band {
  return score >= 7 ? "good" : score >= 5 ? "mid" : "bad";
}

/** Fill colour — used for bars, rings and dots. */
export function bandFill(score: number): string {
  return `var(--${band(score)})`;
}

/** Text colour — darker in light mode so it stays legible. */
export function bandText(score: number): string {
  return `var(--${band(score)}-text)`;
}

export function bandLabel(score: number): string {
  const b = band(score);
  return b === "good" ? "Strong" : b === "mid" ? "Developing" : "Needs work";
}

export function ScorePill({
  score,
  large = false,
}: {
  score: number;
  large?: boolean;
}) {
  return (
    <span
      className={`t-num inline-flex shrink-0 items-center gap-1.5 rounded-full border font-bold ${
        large ? "px-3.5 py-1.5 text-base" : "px-2.5 py-1 text-sm"
      }`}
      style={{
        color: bandText(score),
        borderColor: bandFill(score),
        background: "var(--surface)",
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: bandFill(score) }}
      />
      {score.toFixed(1)}
      <span className="font-medium opacity-60">/10</span>
    </span>
  );
}

/** Horizontal bar for parameter and subject breakdowns. */
export function ScoreBar({
  label,
  score,
  caption,
}: {
  label?: string;
  score: number;
  caption?: string;
}) {
  return (
    <div>
      {(label || caption) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium">{label}</span>
          <span className="flex items-baseline gap-2">
            {caption && <span className="text-xs text-[var(--ink-3)]">{caption}</span>}
            <span
              className="t-num text-sm font-bold"
              style={{ color: bandText(score) }}
            >
              {score.toFixed(1)}
            </span>
          </span>
        </div>
      )}
      <div
        className="h-1.5 overflow-hidden rounded-full"
        style={{ background: "var(--grid)" }}
        role="img"
        aria-label={`${label ?? "Score"}: ${score.toFixed(1)} out of 10`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.max(1.5, Math.min(100, score * 10))}%`,
            background: bandFill(score),
          }}
        />
      </div>
    </div>
  );
}

/** Big circular score for the top of a report. */
export function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * Math.min(1, Math.max(0, score / 10));

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Overall score ${score.toFixed(1)} out of 10 — ${bandLabel(score)}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--grid)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={bandFill(score)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="t-num text-3xl font-bold leading-none"
          style={{ color: bandText(score) }}
        >
          {score.toFixed(1)}
        </span>
        <span className="mt-1 text-xs font-medium text-[var(--ink-3)]">out of 10</span>
      </div>
    </div>
  );
}

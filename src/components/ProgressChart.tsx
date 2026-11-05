"use client";

import { useId, useState } from "react";
import { bandFill, bandText } from "./ScorePill";

/**
 * Score over time — one series, so no legend; the heading names it.
 *
 * Hand-rolled SVG rather than a charting library: it keeps the bundle
 * small and the whole thing is about eighty lines.
 */

export type ProgressPoint = {
  id: string;
  score: number;
  label: string; // subject
  date: string; // ISO
};

export function ProgressChart({
  points,
  height = 200,
}: {
  points: ProgressPoint[];
  height?: number;
}) {
  const clipId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) return null;

  const W = 720;
  const H = height;
  const pad = { top: 16, right: 16, bottom: 28, left: 30 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const x = (i: number) =>
    pad.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (score: number) => pad.top + plotH - (score / 10) * plotH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.score)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${pad.top + plotH} L${x(0)},${pad.top + plotH} Z`;

  const average = points.reduce((a, p) => a + p.score, 0) / points.length;
  const active = hover === null ? null : points[hover];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`Interview scores over time. ${points
          .map((p) => `${p.label} ${p.score.toFixed(1)}`)
          .join(", ")}.`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={clipId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines — recessive */}
        {[0, 2.5, 5, 7.5, 10].map((v) => (
          <g key={v}>
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--grid)"
              strokeWidth={1}
            />
            <text
              x={pad.left - 8}
              y={y(v) + 3.5}
              textAnchor="end"
              className="t-num"
              fontSize="10"
              fill="var(--ink-3)"
            >
              {v}
            </text>
          </g>
        ))}

        {/* cohort-free reference: this student's own average */}
        <line
          x1={pad.left}
          x2={W - pad.right}
          y1={y(average)}
          y2={y(average)}
          stroke="var(--axis)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text
          x={W - pad.right}
          y={y(average) - 5}
          textAnchor="end"
          fontSize="10"
          fill="var(--ink-3)"
        >
          avg {average.toFixed(1)}
        </text>

        <path d={area} fill={`url(#${clipId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g key={p.id}>
            {hover === i && (
              <line
                x1={x(i)}
                x2={x(i)}
                y1={pad.top}
                y2={pad.top + plotH}
                stroke="var(--axis)"
                strokeWidth={1}
              />
            )}
            {/* 2px surface ring keeps the marker readable over the line */}
            <circle
              cx={x(i)}
              cy={y(p.score)}
              r={hover === i ? 6 : 4.5}
              fill={bandFill(p.score)}
              stroke="var(--surface)"
              strokeWidth={2}
            />
            {/* generous invisible hit target */}
            <rect
              x={x(i) - plotW / (points.length * 2) - 6}
              y={pad.top}
              width={plotW / points.length + 12}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}

        {/* first and last dates only — avoids label collisions */}
        <text x={pad.left} y={H - 8} fontSize="10" fill="var(--ink-3)">
          {fmt(points[0].date)}
        </text>
        <text
          x={W - pad.right}
          y={H - 8}
          textAnchor="end"
          fontSize="10"
          fill="var(--ink-3)"
        >
          {fmt(points[points.length - 1].date)}
        </text>
      </svg>

      {active && (
        <div
          className="card-raised pointer-events-none absolute top-2 z-10 px-3 py-2"
          style={{
            left: `${(x(hover!) / W) * 100}%`,
            transform: "translateX(-50%)",
            minWidth: 140,
          }}
        >
          <p className="text-xs font-semibold">{active.label}</p>
          <p className="t-num mt-0.5 text-lg font-bold" style={{ color: bandText(active.score) }}>
            {active.score.toFixed(1)}
            <span className="text-xs font-medium text-[var(--ink-3)]">/10</span>
          </p>
          <p className="text-xs text-[var(--ink-3)]">{fmt(active.date)}</p>
        </div>
      )}
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

import { useState } from "react";

import { cn } from "../lib/cn";

export type MetricPoint = { t: string; v: number };

export type MetricChartProperties = {
  title: string;
  points: MetricPoint[];
  /** Format a raw value for display (axis labels, tooltip, current value). */
  formatValue?: (value: number) => string;
  /** Chart accent color (any CSS color). Defaults to the brand color. */
  color?: string;
  className?: string;
};

const VIEW_W = 100;
const VIEW_H = 100;
const PAD = 6; // vertical headroom inside the viewBox so peaks/troughs aren't flush

function buildGeometry(points: MetricPoint[]): { line: string; area: string } | undefined {
  if (points.length === 0) return undefined;

  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const toX = (index: number) =>
    points.length === 1 ? VIEW_W / 2 : (index / (points.length - 1)) * VIEW_W;
  const toY = (value: number) => {
    const norm = (value - min) / span; // 0 (min) … 1 (max)
    return PAD + (1 - norm) * (VIEW_H - PAD * 2);
  };

  const line = points.map((p, index) => `${toX(index)},${toY(p.v)}`).join(" ");
  const first = `0,${VIEW_H}`;
  const last = `${VIEW_W},${VIEW_H}`;
  const area = `${first} ${line} ${last}`;
  return { line, area };
}

function defaultFormat(value: number): string {
  return value.toLocaleString();
}

export function MetricChart({
  title,
  points,
  formatValue = defaultFormat,
  color = "hsl(var(--brand-from))",
  className,
}: MetricChartProperties) {
  const [hover, setHover] = useState<number | undefined>(undefined);

  const geometry = buildGeometry(points);
  const gradientId = `metric-gradient-${title.replaceAll(/\W+/gu, "-")}`;
  const current = points.at(-1)?.v ?? 0;
  const hovered = hover === undefined ? undefined : points[hover];

  function handleMove(event: React.PointerEvent<SVGSVGElement>) {
    if (points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    const index = Math.round(fraction * (points.length - 1));
    setHover(Math.min(Math.max(index, 0), points.length - 1));
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5",
        className,
      )}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium text-[hsl(var(--text-muted))]">{title}</p>
        <p className="font-mono text-sm font-semibold text-[hsl(var(--text))]">
          {formatValue(hovered?.v ?? current)}
        </p>
      </div>

      {geometry ? (
        <div className="relative">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            className="h-24 w-full overflow-visible"
            onPointerMove={handleMove}
            onPointerLeave={() => setHover(undefined)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={geometry.area} fill={`url(#${gradientId})`} />
            <polyline
              points={geometry.line}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {hover !== undefined && points.length > 1 && (
              <line
                x1={(hover / (points.length - 1)) * VIEW_W}
                y1="0"
                x2={(hover / (points.length - 1)) * VIEW_W}
                y2={VIEW_H}
                stroke="hsl(var(--border))"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {hovered && points.length > 1 && (
            <div
              className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-2 py-1 text-[10px] text-[hsl(var(--text-muted))]"
              style={{ left: `${(hover! / (points.length - 1)) * 100}%` }}
            >
              <span className="font-mono font-semibold text-[hsl(var(--text))]">
                {formatValue(hovered.v)}
              </span>
              <span className="ml-1.5">
                {new Date(hovered.t).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center text-xs text-[hsl(var(--text-faint))]">
          No data yet
        </div>
      )}
    </div>
  );
}

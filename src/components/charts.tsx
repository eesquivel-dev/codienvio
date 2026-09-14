import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

const PAD = { top: 16, right: 12, bottom: 28, left: 36 };

type ChartPoint = { label: string; value: number };
type DualPoint = { label: string; primary: number; secondary: number };
type Slice = { key: string; label: string; value: number };

function maxValue(values: number[], fallback = 1): number {
  return Math.max(...values, fallback);
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  if (value <= 5) return Math.ceil(value);
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function axisTicks(max: number): number[] {
  if (max <= 5 && Number.isInteger(max)) {
    return Array.from({ length: max + 1 }, (_, index) => index);
  }
  return [0, 0.5, 1].map((ratio) => max * ratio);
}

function formatAxis(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function shortDay(label: string): string {
  const match = /(\d{4})-(\d{2})-(\d{2})/.exec(label);
  if (!match) return label;
  return `${match[3]}/${match[2]}`;
}

export function AreaChart({
  points,
  empty,
  valueLabel,
  className,
}: {
  points: ChartPoint[];
  empty: string;
  valueLabel?: (value: number) => string;
  className?: string;
}) {
  if (points.length === 0 || points.every((point) => point.value === 0)) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  const width = 560;
  const height = 180;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const max = niceMax(maxValue(points.map((point) => point.value)));
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;
  const coords = points.map((point, index) => {
    const x = PAD.left + (points.length === 1 ? innerW / 2 : index * step);
    const y = PAD.top + innerH - (point.value / max) * innerH;
    return { x, y, point };
  });
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)} ${PAD.top + innerH} L${coords[0].x.toFixed(1)} ${PAD.top + innerH} Z`;
  const ticks = axisTicks(max).map((value) => ({
    y: PAD.top + innerH - (value / max) * innerH,
    value,
  }));
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("h-44 w-full", className)} role="img">
      {ticks.map((tick) => (
        <g key={tick.y}>
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={tick.y}
            y2={tick.y}
            stroke={brand.grisAzulado}
            strokeOpacity={0.25}
          />
          <text x={PAD.left - 8} y={tick.y + 3} textAnchor="end" className="fill-azul-gris" fontSize="9">
            {formatAxis(tick.value)}
          </text>
        </g>
      ))}
      <path d={area} fill={brand.lima} fillOpacity={0.28} />
      <path d={line} fill="none" stroke={brand.navy} strokeWidth="2" />
      {coords.map((c, index) => (
        <g key={c.point.label}>
          <circle cx={c.x} cy={c.y} r="3" fill={brand.navy} />
          {index % labelEvery === 0 || index === coords.length - 1 ? (
            <text x={c.x} y={height - 8} textAnchor="middle" className="fill-azul-gris" fontSize="9">
              {shortDay(c.point.label)}
            </text>
          ) : null}
          <title>
            {c.point.label}: {valueLabel ? valueLabel(c.point.value) : c.point.value}
          </title>
        </g>
      ))}
    </svg>
  );
}

export function DualMetricChart({
  points,
  empty,
  primaryLabel,
  secondaryLabel,
  formatPrimary,
  formatSecondary,
  className,
}: {
  points: DualPoint[];
  empty: string;
  primaryLabel: string;
  secondaryLabel: string;
  formatPrimary?: (value: number) => string;
  formatSecondary?: (value: number) => string;
  className?: string;
}) {
  if (points.length === 0 || points.every((point) => point.primary === 0 && point.secondary === 0)) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  const width = 560;
  const height = 180;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const max = niceMax(maxValue(points.flatMap((point) => [point.primary, point.secondary])));
  const groupW = innerW / points.length;
  const barW = Math.max(4, Math.min(14, groupW * 0.32));
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));
  const ticks = axisTicks(max).map((value) => ({
    y: PAD.top + innerH - (value / max) * innerH,
    value,
  }));

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" role="img">
        {ticks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={tick.y}
              y2={tick.y}
              stroke={brand.grisAzulado}
              strokeOpacity={0.25}
            />
            <text x={PAD.left - 8} y={tick.y + 3} textAnchor="end" className="fill-azul-gris" fontSize="9">
              {formatAxis(tick.value)}
            </text>
          </g>
        ))}
        {points.map((point, index) => {
          const cx = PAD.left + groupW * index + groupW / 2;
          const primaryH = (point.primary / max) * innerH;
          const secondaryH = (point.secondary / max) * innerH;
          return (
            <g key={point.label}>
              <rect
                x={cx - barW - 1}
                y={PAD.top + innerH - primaryH}
                width={barW}
                height={Math.max(primaryH, point.primary ? 1 : 0)}
                fill={brand.navy}
                rx="1.5"
              >
                <title>
                  {point.label} · {primaryLabel}: {formatPrimary ? formatPrimary(point.primary) : point.primary}
                </title>
              </rect>
              <rect
                x={cx + 1}
                y={PAD.top + innerH - secondaryH}
                width={barW}
                height={Math.max(secondaryH, point.secondary ? 1 : 0)}
                fill={brand.lima}
                rx="1.5"
              >
                <title>
                  {point.label} · {secondaryLabel}:{" "}
                  {formatSecondary ? formatSecondary(point.secondary) : point.secondary}
                </title>
              </rect>
              {index % labelEvery === 0 || index === points.length - 1 ? (
                <text x={cx} y={height - 8} textAnchor="middle" className="fill-azul-gris" fontSize="9">
                  {shortDay(point.label)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-navy" />
          {primaryLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-lima" />
          {secondaryLabel}
        </span>
      </div>
    </div>
  );
}

const SLICE_COLORS = [brand.navy, brand.navyClaro, brand.lima, brand.grisAzulado, "#4c6cb3", "#8fa63a"];

export function DonutChart({
  slices,
  empty,
  valueLabel,
  className,
}: {
  slices: Slice[];
  empty: string;
  valueLabel?: (value: number) => string;
  className?: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 58;
  const stroke = 18;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn("flex flex-col items-center gap-4 sm:flex-row sm:items-center", className)}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-36 w-36 shrink-0" role="img">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e8edf4" strokeWidth={stroke} />
        {slices.map((slice, index) => {
          const dash = (slice.value / total) * circ;
          const circle = (
            <circle
              key={slice.key}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={SLICE_COLORS[index % SLICE_COLORS.length]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
            >
              <title>
                {slice.label}: {valueLabel ? valueLabel(slice.value) : slice.value}
              </title>
            </circle>
          );
          offset += dash;
          return circle;
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" className="fill-navy" fontSize="16" fontWeight="700">
          {slices.reduce((sum, slice) => sum + (Number.isInteger(slice.value) ? slice.value : 0), 0) || ""}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-azul-gris" fontSize="9">
          total
        </text>
      </svg>
      <ul className="w-full space-y-2 text-sm">
        {slices.map((slice, index) => (
          <li key={slice.key} className="flex items-center justify-between gap-3">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: SLICE_COLORS[index % SLICE_COLORS.length] }}
              />
              <span className="truncate font-medium text-navy">{slice.label}</span>
            </span>
            <span className="tabular-nums text-muted-foreground">
              {valueLabel ? valueLabel(slice.value) : slice.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

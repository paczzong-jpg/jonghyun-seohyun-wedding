/**
 * chart-surfaces — recharts가 지원하지 않는 커스텀 시각화 서피스.
 * 히트맵(rect)·박스플롯(boxplot)과 공용 CenteredNote를 담는다. bi-chart에서 사용.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Scalar } from "@/lib/bi-types";
import { formatNumber } from "@/lib/bi-format";

export function CenteredNote({ icon, title, hint }: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex h-full min-h-24 flex-col items-center justify-center gap-1.5 p-6 text-center">
      {icon}
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      {hint && <div className="text-xs text-muted-foreground/70">{hint}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 히트맵 (rect) — recharts 미지원이라 CSS grid로 직접 렌더
// ---------------------------------------------------------------------------

export function HeatmapSurface({
  rows,
  xKey,
  yKey,
  measureKey,
  xFormatter,
  compact,
  onCellClick,
}: {
  rows: Record<string, Scalar>[];
  xKey: string;
  yKey: string;
  measureKey: string;
  xFormatter: (v: Scalar) => string;
  compact?: boolean;
  onCellClick?: (x: Scalar, y: Scalar) => void;
}) {
  const { xs, ys, lookup, max } = useMemo(() => {
    const xSet: Scalar[] = [];
    const ySet: Scalar[] = [];
    const lookup = new Map<string, number>();
    let max = 0;
    for (const r of rows) {
      const x = r[xKey];
      const y = r[yKey];
      if (!xSet.includes(x)) xSet.push(x);
      if (!ySet.includes(y)) ySet.push(y);
      const v = typeof r[measureKey] === "number" ? (r[measureKey] as number) : 0;
      lookup.set(`${String(x)}\u001f${String(y)}`, v);
      if (v > max) max = v;
    }
    return { xs: xSet.slice(0, 40), ys: ySet.slice(0, 30), lookup, max };
  }, [rows, xKey, yKey, measureKey]);

  if (xs.length === 0) return <CenteredNote title="표시할 데이터가 없습니다" />;

  return (
    <div className="h-full overflow-auto p-2">
      <div
        className="grid min-w-fit gap-px"
        style={{ gridTemplateColumns: `minmax(60px,auto) repeat(${xs.length}, minmax(34px,1fr))` }}
      >
        <div />
        {xs.map((x, i) => (
          <div key={i} className="truncate px-1 pb-1 text-center text-[10px] text-muted-foreground" title={xFormatter(x)}>
            {xFormatter(x)}
          </div>
        ))}
        {ys.map((y, yi) => (
          <div key={`row-${yi}`} className="contents">
            <div className="truncate pr-2 text-right text-[10px] leading-6 text-muted-foreground" title={String(y)}>
              {String(y)}
            </div>
            {xs.map((x, xi) => {
              const v = lookup.get(`${String(x)}\u001f${String(y)}`) ?? 0;
              const ratio = max > 0 ? v / max : 0;
              return (
                <div
                  key={xi}
                  role={onCellClick ? "button" : undefined}
                  onClick={onCellClick ? () => onCellClick(x, y) : undefined}
                  className={cn(
                    "h-6 rounded-[3px] transition-opacity",
                    onCellClick && "cursor-pointer hover:ring-1 hover:ring-ring",
                  )}
                  style={{
                    background: `color-mix(in oklch, var(--color-chart-1) ${Math.round(ratio * 92 + (v > 0 ? 8 : 0))}%, transparent)`,
                  }}
                  title={`${xFormatter(x)} × ${String(y)} — ${compact ? v : formatNumber(v)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 박스플롯 (recharts 미지원 — SVG 직접 렌더)
// ---------------------------------------------------------------------------

interface BoxStat {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
  n: number;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

export function BoxplotSurface({
  rows,
  xKey,
  measureKey,
  xFormatter,
  valueFormatter,
  compact,
}: {
  rows: Record<string, Scalar>[];
  xKey: string;
  measureKey: string;
  xFormatter: (v: Scalar) => string;
  valueFormatter: (v: number) => string;
  compact?: boolean;
}) {
  const { stats, lo, hi } = useMemo(() => {
    const groups = new Map<Scalar, number[]>();
    for (const r of rows) {
      const v = r[measureKey];
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      const g = r[xKey];
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(v);
    }
    const stats: BoxStat[] = [];
    let lo = Infinity;
    let hi = -Infinity;
    for (const [g, arr] of [...groups.entries()].slice(0, 24)) {
      arr.sort((a, b) => a - b);
      const q1 = quantile(arr, 0.25);
      const median = quantile(arr, 0.5);
      const q3 = quantile(arr, 0.75);
      const iqr = q3 - q1;
      const whiskerLo = q1 - 1.5 * iqr;
      const whiskerHi = q3 + 1.5 * iqr;
      const inliers = arr.filter((v) => v >= whiskerLo && v <= whiskerHi);
      const outliers = arr.filter((v) => v < whiskerLo || v > whiskerHi);
      const min = inliers[0] ?? q1;
      const max = inliers[inliers.length - 1] ?? q3;
      stats.push({ label: xFormatter(g), min, q1, median, q3, max, outliers, n: arr.length });
      lo = Math.min(lo, min, ...outliers);
      hi = Math.max(hi, max, ...outliers);
    }
    if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
    if (lo === hi) hi = lo + 1;
    return { stats, lo, hi };
  }, [rows, xKey, measureKey, xFormatter]);

  if (stats.length === 0) return <CenteredNote title="박스플롯을 그릴 수치 데이터가 없습니다" />;

  const H = 100;
  const padTop = 6;
  const padBottom = compact ? 6 : 18;
  const plotH = H - padTop - padBottom;
  const y = (v: number) => padTop + plotH - ((v - lo) / (hi - lo)) * plotH;
  const slot = 100 / stats.length;
  const boxW = Math.min(slot * 0.5, 8);

  return (
    <div className="flex h-full flex-col">
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="박스플롯">
        {stats.map((s, i) => {
          const cx = slot * (i + 0.5);
          return (
            <g key={i}>
              <title>{`${s.label} — 중앙값 ${valueFormatter(s.median)}, Q1 ${valueFormatter(s.q1)}, Q3 ${valueFormatter(s.q3)}, n=${s.n}`}</title>
              {/* whisker */}
              <line x1={cx} x2={cx} y1={y(s.max)} y2={y(s.q3)} className="stroke-muted-foreground" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
              <line x1={cx} x2={cx} y1={y(s.q1)} y2={y(s.min)} className="stroke-muted-foreground" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
              <line x1={cx - boxW / 2} x2={cx + boxW / 2} y1={y(s.max)} y2={y(s.max)} className="stroke-muted-foreground" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
              <line x1={cx - boxW / 2} x2={cx + boxW / 2} y1={y(s.min)} y2={y(s.min)} className="stroke-muted-foreground" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
              {/* box */}
              <rect
                x={cx - boxW / 2}
                y={y(s.q3)}
                width={boxW}
                height={Math.max(0.5, y(s.q1) - y(s.q3))}
                className="fill-chart-1/25 stroke-chart-1"
                strokeWidth={0.5}
                vectorEffect="non-scaling-stroke"
              />
              {/* median */}
              <line x1={cx - boxW / 2} x2={cx + boxW / 2} y1={y(s.median)} y2={y(s.median)} className="stroke-chart-1" strokeWidth={0.9} vectorEffect="non-scaling-stroke" />
              {/* outliers */}
              {s.outliers.slice(0, 30).map((o, j) => (
                <circle key={j} cx={cx} cy={y(o)} r={0.7} className="fill-chart-4/70" vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          );
        })}
      </svg>
      {!compact && (
        <div className="flex shrink-0 border-t border-border pt-1">
          {stats.map((s, i) => (
            <div key={i} className="flex-1 truncate px-0.5 text-center text-[10px] text-muted-foreground" style={{ width: `${slot}%` }}>
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const MAX_SERIES = 12;

const SCATTER_SYMBOLS = ["circle", "triangle", "square", "diamond", "cross", "star", "wye"] as const;

export interface ScatterSeriesDef {
  data: Record<string, Scalar>[];
  fill: string;
  symbol: (typeof SCATTER_SYMBOLS)[number];
  name?: string;
}

/**
 * 산점도 SVG 시리즈 구성(색상 × 모양 이중 인코딩, Tableau식) + 투명도 스케일.
 * palette는 CHART_COLORS 문자열 배열(순환 참조 회피용으로 인자로 받음).
 */
export function buildScatterSeries(
  pts: Record<string, Scalar>[],
  palette: string[],
  opts: { colorKey?: string; shapeKey?: string; opacityKey?: string },
): { opacityScale: ((v: Scalar) => number) | null; seriesDefs: ScatterSeriesDef[] } {
  const { colorKey, shapeKey, opacityKey } = opts;
  const opacityScale = (() => {
    if (!opacityKey) return null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const r of pts) {
      const v = r[opacityKey];
      if (typeof v === "number") { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    }
    if (!Number.isFinite(lo) || lo === hi) return () => 0.72;
    return (v: Scalar) => (typeof v === "number" ? 0.18 + ((v - lo) / (hi - lo)) * 0.77 : 0.5);
  })();

  const shapeVals = shapeKey ? [...new Set(pts.map((r) => String(r[shapeKey])))].slice(0, SCATTER_SYMBOLS.length) : [""];
  const colorVals = colorKey ? [...new Set(pts.map((r) => String(r[colorKey])))].slice(0, MAX_SERIES) : ["all"];
  const seriesDefs: ScatterSeriesDef[] = [];
  for (let ci = 0; ci < colorVals.length; ci++) {
    for (let si = 0; si < shapeVals.length; si++) {
      const data = pts.filter(
        (r) =>
          (!colorKey || String(r[colorKey]) === colorVals[ci]) &&
          (!shapeKey || String(r[shapeKey]) === shapeVals[si]),
      );
      if (data.length === 0) continue;
      const nameParts = [colorKey ? colorVals[ci] : "", shapeKey ? shapeVals[si] : ""].filter(Boolean);
      seriesDefs.push({
        data,
        fill: palette[ci % palette.length],
        symbol: SCATTER_SYMBOLS[si % SCATTER_SYMBOLS.length],
        name: nameParts.length ? nameParts.join(" · ") : undefined,
      });
    }
  }
  return { opacityScale, seriesDefs };
}

export interface SeriesData {
  data: Record<string, Scalar>[];
  series: string[];
  droppedSeries: number;
}

/** color 채널을 recharts 와이드 포맷으로 피벗 */
export function pivotSeries(
  rows: Record<string, Scalar>[],
  xKey: string,
  colorKey: string | undefined,
  measureKey: string,
  normalize: boolean,
): SeriesData {
  if (!colorKey) {
    if (!normalize) return { data: rows, series: [measureKey], droppedSeries: 0 };
    const data = rows.map((r) => ({ ...r }));
    return { data, series: [measureKey], droppedSeries: 0 };
  }
  const totals = new Map<string, number>();
  for (const r of rows) {
    const s = String(r[colorKey]);
    const v = r[measureKey];
    totals.set(s, (totals.get(s) ?? 0) + (typeof v === "number" ? Math.abs(v) : 0));
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const kept = ranked.slice(0, MAX_SERIES);
  const keptSet = new Set(kept);

  const byX = new Map<Scalar, Record<string, Scalar>>();
  const xOrder: Scalar[] = [];
  for (const r of rows) {
    const x = r[xKey];
    if (!byX.has(x)) {
      byX.set(x, { [xKey]: x });
      xOrder.push(x);
    }
    const s = String(r[colorKey]);
    if (!keptSet.has(s)) continue;
    const bucket = byX.get(x)!;
    const v = r[measureKey];
    bucket[s] = typeof v === "number" ? ((bucket[s] as number) ?? 0) + v : v;
  }
  let data = xOrder.map((x) => byX.get(x)!);
  if (normalize) {
    data = data.map((row) => {
      const total = kept.reduce((a, s) => a + (typeof row[s] === "number" ? (row[s] as number) : 0), 0);
      if (total <= 0) return row;
      const out: Record<string, Scalar> = { [xKey]: row[xKey] };
      for (const s of kept) {
        out[s] = typeof row[s] === "number" ? (row[s] as number) / total : row[s];
      }
      return out;
    });
  }
  return { data, series: kept, droppedSeries: ranked.length - kept.length };
}

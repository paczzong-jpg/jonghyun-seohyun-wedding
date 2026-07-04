/**
 * ScatterRasterSurface — 대량 산점도 밀도 래스터 렌더 + 줌/팬.
 *
 * 개별 포인트를 SVG로 다 그리지 않고 canvas 밀도 그리드로 집계해(bi-raster)
 * 겹침을 밀도로 표현한다. 휠 줌·드래그 팬은 뷰(정투영 범위)만 바꾸고 재비닝하므로
 * 줌인하면 개별 포인트가 다시 벌어져 보인다(LOD). 전 포인트를 반영 — 다운샘플링 없음.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  binPoints,
  rasterToRGBA,
  niceTicks,
  boundsToView,
  type RasterView,
  type RasterColors,
} from "@/lib/bi-raster";
import type { Scalar } from "@/lib/bi-types";
import { formatNumber } from "@/lib/bi-format";

const M = { left: 52, right: 12, top: 12, bottom: 30 };

/**
 * CSS 색상(var()/oklch/hex 무엇이든)을 canvas용 [r,g,b] 숫자로 해석.
 * getComputedStyle로 CSS 변수를 풀고 canvas로 최종 rgb를 정규화한다.
 */
export function cssColorToRgb(color: string): [number, number, number] {
  if (typeof document === "undefined") return [0, 82, 204];
  const probe = document.createElement("span");
  probe.style.color = color;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d");
  if (!ctx) return [0, 82, 204];
  ctx.fillStyle = resolved || color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/**
 * 원시 결과 rows에서 x/y 수치 배열과 (색상 인코딩 시) per-point 색을 뽑아
 * ScatterRasterSurface로 넘긴다. bi-chart의 point 케이스에서 대량일 때 사용.
 */
export function RasterScatter({
  rows,
  xKey,
  yKey,
  colorKey,
  xLabel,
  yLabel,
  paletteVars,
}: {
  rows: Record<string, Scalar>[];
  xKey: string;
  yKey: string;
  colorKey?: string;
  xLabel: string;
  yLabel: string;
  paletteVars: string[];
}) {
  const { xs, ys, colors, base } = useMemo(() => {
    const N = rows.length;
    const xsArr = new Float64Array(N);
    const ysArr = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      xsArr[i] = Number(rows[i][xKey]);
      ysArr[i] = Number(rows[i][yKey]);
    }
    const palette = paletteVars.map(cssColorToRgb);
    const baseRgb: [number, number, number] = palette[0] ?? [0, 82, 204];
    let cols: RasterColors | undefined;
    if (colorKey) {
      const distinct = [...new Set(rows.map((r) => String(r[colorKey])))];
      const cmap = new Map(distinct.map((v, i) => [v, palette[i % palette.length]]));
      const cr = new Uint8Array(N);
      const cg = new Uint8Array(N);
      const cb = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        const c = cmap.get(String(rows[i][colorKey])) ?? baseRgb;
        cr[i] = c[0];
        cg[i] = c[1];
        cb[i] = c[2];
      }
      cols = { r: cr, g: cg, b: cb };
    }
    return { xs: xsArr, ys: ysArr, colors: cols, base: baseRgb };
  }, [rows, xKey, yKey, colorKey, paletteVars]);

  return (
    <ScatterRasterSurface
      xs={xs}
      ys={ys}
      colors={colors}
      total={rows.length}
      xLabel={xLabel}
      yLabel={yLabel}
      formatX={(v) => formatNumber(v)}
      formatY={(v) => formatNumber(v)}
      baseColor={base}
    />
  );
}

export interface ScatterRasterSurfaceProps {
  xs: ArrayLike<number>;
  ys: ArrayLike<number>;
  colors?: RasterColors;
  total: number;
  xLabel: string;
  yLabel: string;
  formatX: (v: number) => string;
  formatY: (v: number) => string;
  /** 단색 모드 base [r,g,b] (0–255). colors가 있으면 무시 */
  baseColor: [number, number, number];
}

export function ScatterRasterSurface(props: ScatterRasterSurfaceProps) {
  const { xs, ys, colors, total, xLabel, yLabel, formatX, formatY, baseColor } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const initialView = useMemo(() => boundsToView(xs, ys), [xs, ys]);
  const [view, setView] = useState<RasterView | null>(initialView);
  useEffect(() => setView(initialView), [initialView]);

  // 팬 상태 (ref로 관리 — 렌더 유발 없이 pointermove 추적)
  const panRef = useRef<{ x: number; y: number; view: RasterView } | null>(null);
  const [tip, setTip] = useState<{ px: number; py: number; text: string } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => {
      const r = e[0]?.contentRect;
      if (r) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plotW = Math.max(0, size.w - M.left - M.right);
  const plotH = Math.max(0, size.h - M.top - M.bottom);

  // 밀도 렌더 (뷰/크기/데이터 변경 시, rAF 스로틀)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !view || plotW < 2 || plotH < 2) return;
    const cols = Math.round(plotW);
    const rows = Math.round(plotH);
    let raf = 0;
    raf = requestAnimationFrame(() => {
      canvas.width = cols;
      canvas.height = rows;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const grid = binPoints(xs, ys, view, cols, rows, colors);
      const rgba = rasterToRGBA(grid, baseColor);
      ctx.putImageData(new ImageData(rgba, cols, rows), 0, 0);
    });
    return () => cancelAnimationFrame(raf);
  }, [xs, ys, colors, view, plotW, plotH, baseColor]);

  const toData = useCallback(
    (clientX: number, clientY: number, v: RasterView) => {
      const el = containerRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const sx = clientX - r.left - M.left;
      const sy = clientY - r.top - M.top;
      if (sx < 0 || sy < 0 || sx > plotW || sy > plotH) return null;
      return {
        x: v.xMin + (sx / plotW) * (v.xMax - v.xMin),
        y: v.yMax - (sy / plotH) * (v.yMax - v.yMin),
        sx,
        sy,
      };
    },
    [plotW, plotH],
  );

  // 휠 줌 (커서 중심) — native 리스너로 preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!view) return;
      e.preventDefault();
      const d = toData(e.clientX, e.clientY, view);
      if (!d) return;
      const f = e.deltaY < 0 ? 0.85 : 1 / 0.85; // 위로 스크롤 = 확대
      setView({
        xMin: d.x - (d.x - view.xMin) * f,
        xMax: d.x + (view.xMax - d.x) * f,
        yMin: d.y - (d.y - view.yMin) * f,
        yMax: d.y + (view.yMax - d.y) * f,
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [view, toData]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!view) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    panRef.current = { x: e.clientX, y: e.clientY, view };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const pan = panRef.current;
    if (pan && view) {
      const dxData = ((e.clientX - pan.x) / plotW) * (pan.view.xMax - pan.view.xMin);
      const dyData = ((e.clientY - pan.y) / plotH) * (pan.view.yMax - pan.view.yMin);
      setView({
        xMin: pan.view.xMin - dxData,
        xMax: pan.view.xMax - dxData,
        yMin: pan.view.yMin + dyData,
        yMax: pan.view.yMax + dyData,
      });
      return;
    }
    if (!view) return;
    const d = toData(e.clientX, e.clientY, view);
    if (!d) {
      setTip(null);
      return;
    }
    setTip({ px: d.sx + M.left, py: d.sy + M.top, text: `${xLabel} ${formatX(d.x)} · ${yLabel} ${formatY(d.y)}` });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    panRef.current = null;
  };

  const xTicks = view ? niceTicks(view.xMin, view.xMax, 6) : [];
  const yTicks = view ? niceTicks(view.yMin, view.yMax, 5) : [];
  const zoomed =
    view && initialView
      ? Math.abs(view.xMin - initialView.xMin) > 1e-9 || Math.abs(view.xMax - initialView.xMax) > 1e-9
      : false;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute cursor-crosshair"
        style={{ left: M.left, top: M.top, width: plotW, height: plotH, touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          setTip(null);
          panRef.current = null;
        }}
      />
      {/* 축·그리드 */}
      {view && size.w > 0 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {xTicks.map((t, i) => {
            const x = M.left + ((t - view.xMin) / (view.xMax - view.xMin)) * plotW;
            if (x < M.left - 1 || x > M.left + plotW + 1) return null;
            return (
              <g key={`x${i}`}>
                <line x1={x} y1={M.top} x2={x} y2={M.top + plotH} className="stroke-border/40" strokeWidth={1} />
                <text x={x} y={M.top + plotH + 16} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  {formatX(t)}
                </text>
              </g>
            );
          })}
          {yTicks.map((t, i) => {
            const y = M.top + ((view.yMax - t) / (view.yMax - view.yMin)) * plotH;
            if (y < M.top - 1 || y > M.top + plotH + 1) return null;
            return (
              <g key={`y${i}`}>
                <line x1={M.left} y1={y} x2={M.left + plotW} y2={y} className="stroke-border/40" strokeWidth={1} />
                <text x={M.left - 6} y={y + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">
                  {formatY(t)}
                </text>
              </g>
            );
          })}
          <rect x={M.left} y={M.top} width={plotW} height={plotH} className="fill-none stroke-border" strokeWidth={1} />
        </svg>
      )}
      {/* 툴팁 */}
      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground shadow-md"
          style={{ left: Math.min(tip.px + 10, size.w - 140), top: Math.max(tip.py - 28, 4) }}
        >
          {tip.text}
        </div>
      )}
      {/* 안내 + 리셋 */}
      <div className="pointer-events-none absolute right-2 top-1.5 flex items-center gap-2">
        <span className="rounded bg-muted/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {total.toLocaleString()}개 · 밀도 · 휠 줌/드래그 이동
        </span>
        {zoomed && (
          <button
            type="button"
            onClick={() => setView(initialView)}
            className="pointer-events-auto flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" /> 초기화
          </button>
        )}
      </div>
    </div>
  );
}

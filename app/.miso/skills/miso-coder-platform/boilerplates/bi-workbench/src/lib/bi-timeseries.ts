/**
 * bi-timeseries — 시계열 심화 변환(이동평균·전년대비·예측).
 *
 * 정렬된 시계열(라인/영역 차트의 x축 오름차순 시리즈)에 적용하는 순수 함수.
 * 엔진/유도와 독립적이라 차트 표현 계층에서만 쓰이고 단위 테스트가 쉽다.
 */

import type { Scalar } from "./bi-types";

/** 후행 이동평균(미래 누출 없음). window 미만 구간은 null. */
export function movingAverage(values: (number | null)[], window: number): (number | null)[] {
  if (window < 2) return values.slice();
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) continue;
    let sum = 0;
    let ok = true;
    for (let k = 0; k < window; k++) {
      const v = values[i - k];
      if (typeof v !== "number") { ok = false; break; }
      sum += v;
    }
    if (ok) out[i] = sum / window;
  }
  return out;
}

/** 전기간 대비 변화율(%). period 이전 값이 없거나 0이면 null. */
export function periodOverPeriodPct(values: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period; i < values.length; i++) {
    const cur = values[i];
    const prev = values[i - period];
    if (typeof cur === "number" && typeof prev === "number" && prev !== 0) {
      out[i] = ((cur - prev) / Math.abs(prev)) * 100;
    }
  }
  return out;
}

/** OLS 선형 추세로 미래 horizon개 값을 외삽. 관측 인덱스는 0..n-1. */
export function linearForecast(values: (number | null)[], horizon: number): number[] {
  const pts: { x: number; y: number }[] = [];
  values.forEach((v, i) => {
    if (typeof v === "number") pts.push({ x: i, y: v });
  });
  if (pts.length < 2 || horizon < 1) return [];
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p.x, 0);
  const sy = pts.reduce((a, p) => a + p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const out: number[] = [];
  for (let h = 1; h <= horizon; h++) out.push(intercept + slope * (values.length - 1 + h));
  return out;
}

/** 연속 x(epoch ms 등)의 대표 간격(중앙값). 예측 x 생성용. */
export function medianStep(xs: number[]): number {
  const deltas: number[] = [];
  for (let i = 1; i < xs.length; i++) deltas.push(xs[i] - xs[i - 1]);
  if (deltas.length === 0) return 1;
  deltas.sort((a, b) => a - b);
  const mid = Math.floor(deltas.length / 2);
  return deltas.length % 2 ? deltas[mid] : (deltas[mid - 1] + deltas[mid]) / 2;
}

export interface TimeSeriesOptions {
  /** 이동평균 창(0/1이면 미적용) */
  movingAvg?: number;
  /** 예측 기간 수(0이면 미적용) */
  forecast?: number;
}

export interface AugmentedSeries {
  data: Record<string, Scalar>[];
  series: string[];
  /** 점선으로 그릴 파생 시리즈(이동평균·예측) */
  dashed: Set<string>;
}

/**
 * 시계열 차트 데이터에 이동평균·예측 시리즈를 덧붙인다.
 * - 이동평균: `${s} · 이동평균` 시리즈 추가(점선)
 * - 예측: horizon개 미래 행을 append하고 `${s} · 예측` 시리즈(마지막 실측점에서 연결, 점선)
 */
export function augmentTimeSeries(
  data: Record<string, Scalar>[],
  series: string[],
  xKey: string,
  opts: TimeSeriesOptions,
): AugmentedSeries {
  const win = opts.movingAvg ?? 0;
  const horizon = opts.forecast ?? 0;
  if ((win < 2 && horizon < 1) || data.length === 0) {
    return { data, series, dashed: new Set() };
  }
  const rows = data.map((r) => ({ ...r }));
  const outSeries = [...series];
  const dashed = new Set<string>();

  // 이동평균 오버레이
  if (win >= 2) {
    for (const s of series) {
      const vals = rows.map((r) => (typeof r[s] === "number" ? (r[s] as number) : null));
      const ma = movingAverage(vals, win);
      const key = `${s} · 이동평균`;
      rows.forEach((r, i) => (r[key] = ma[i]));
      outSeries.push(key);
      dashed.add(key);
    }
  }

  // 예측: 미래 x 생성 후 각 시리즈 외삽
  if (horizon >= 1) {
    const xsNum = rows.map((r) => (typeof r[xKey] === "number" ? (r[xKey] as number) : NaN));
    const numericX = xsNum.every((v) => Number.isFinite(v));
    const step = numericX ? medianStep(xsNum) : 1;
    const lastX = xsNum[xsNum.length - 1];
    const futureRows: Record<string, Scalar>[] = [];
    for (let h = 1; h <= horizon; h++) {
      futureRows.push({ [xKey]: numericX ? lastX + step * h : `+${h}` });
    }
    for (const s of series) {
      const vals = rows.map((r) => (typeof r[s] === "number" ? (r[s] as number) : null));
      const fc = linearForecast(vals, horizon);
      if (fc.length === 0) continue;
      const key = `${s} · 예측`;
      // 마지막 실측점에서 예측선이 이어지도록 seed
      const lastActual = vals[vals.length - 1];
      rows.forEach((r) => (r[key] = null));
      if (typeof lastActual === "number") rows[rows.length - 1][key] = lastActual;
      futureRows.forEach((fr, i) => (fr[key] = fc[i]));
      outSeries.push(key);
      dashed.add(key);
    }
    rows.push(...futureRows);
  }

  return { data: rows, series: outSeries, dashed };
}

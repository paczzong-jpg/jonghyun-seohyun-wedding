/**
 * bi-insights — 통계 규칙 기반 인사이트 후보 생성기 (GOAL §8.3)
 * LLM 없이 동작한다(G4). dimension×measure 조합을 점수화해 상위 후보를
 * ChartSpec으로 반환한다 — 추천 스트립·대시보드 시드의 재료.
 */

import type {
  ChartSpec,
  DataTable,
  InsightCandidate,
  Scalar,
} from "./bi-types";
import { MAX_INSIGHT_DIMENSION_CARDINALITY } from "./bi-types";
import { runQuery } from "./bi-engine";
import { formatNumber } from "./bi-format";

const MAX_COMBOS = 60;

function linearRegressionR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}

function pearson(xs: Scalar[], ys: Scalar[], sample = 10_000): number {
  const px: number[] = [];
  const py: number[] = [];
  const step = Math.max(1, Math.floor(xs.length / sample));
  for (let i = 0; i < xs.length; i += step) {
    const a = xs[i];
    const b = ys[i];
    if (typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b)) {
      px.push(a);
      py.push(b);
    }
  }
  return linearRegressionR(px, py);
}

function specFor(
  table: DataTable,
  overrides: Partial<ChartSpec> & Pick<ChartSpec, "encodings" | "markType">,
): ChartSpec {
  return {
    datasetId: table.datasetId,
    stack: "none",
    filters: [],
    style: {},
    meta: { origin: "recommend" },
    ...overrides,
  };
}

export function generateInsights(
  table: DataTable,
  opts: { max?: number; perKind?: number } = {},
): InsightCandidate[] {
  const maxResults = opts.max ?? 6;
  const perKind = opts.perKind ?? 2;
  const out: InsightCandidate[] = [];
  const fields = table.fields.filter((f) => !f.hidden);
  const dims = fields.filter(
    (f) =>
      f.analyticType === "dimension" &&
      f.semanticType !== "temporal" &&
      f.profile.distinctCount >= 2 &&
      f.profile.distinctCount <= MAX_INSIGHT_DIMENSION_CARDINALITY,
  );
  const measures = fields.filter(
    (f) => f.analyticType === "measure" && (f.profile.stdev ?? 0) > 0,
  );
  const temporals = fields.filter((f) => f.semanticType === "temporal");

  let combos = 0;
  const budget = () => combos++ < MAX_COMBOS;

  // 1) Trend — temporal × measure 월별 합 선형회귀
  for (const t of temporals.slice(0, 2)) {
    for (const m of measures.slice(0, 4)) {
      if (!budget()) break;
      const unit = t.profile.temporalRange?.suggestedUnit ?? "month";
      const res = runQuery(table, {
        datasetId: table.datasetId,
        filters: [],
        transforms: [{ as: "bucket", op: "dateTrunc", fid: t.fid, unit }],
        view: {
          type: "aggregate",
          groupBy: ["bucket"],
          measures: [{ fid: m.fid, agg: "sum", as: "v" }],
        },
        sort: [{ field: "bucket", order: "asc" }],
      });
      const xs: number[] = [];
      const ys: number[] = [];
      for (const row of res.rows) {
        if (typeof row.bucket === "number" && typeof row.v === "number") {
          xs.push(row.bucket);
          ys.push(row.v);
        }
      }
      const r = linearRegressionR(xs, ys);
      const score = Math.abs(r) * Math.min(1, Math.log10(Math.max(xs.length, 1)) / 2);

      // Seasonality — lag 자기상관 (month=12, week/day 계열=7) (GOAL §8.3)
      const lag = unit === "month" ? 12 : 7;
      if (ys.length >= lag * 2 + 4) {
        const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
        let num = 0;
        let den = 0;
        for (let t = 0; t < ys.length; t++) {
          den += (ys[t] - mean) ** 2;
          if (t + lag < ys.length) num += (ys[t] - mean) * (ys[t + lag] - mean);
        }
        const acf = den > 0 ? num / den : 0;
        if (Math.abs(acf) > 0.45) {
          out.push({
            kind: "seasonality",
            score: Math.abs(acf),
            title: `${m.displayName}에 주기 ${lag} 계절성`,
            evidence: `lag-${lag} 자기상관 ${acf.toFixed(2)}`,
            spec: specFor(table, {
              markType: "line",
              encodings: { x: { fid: t.fid, bucket: { unit } }, y: [{ fid: m.fid, agg: "sum" }] },
              meta: { origin: "recommend", title: `${t.displayName}별 ${m.displayName} (계절성)` },
            }),
          });
        }
      }

      // Changepoint — 슬라이딩 윈도(k=3) 평균차 / 전체 σ (GOAL §8.3)
      if (ys.length >= 8) {
        const win = 3;
        const meanAll = ys.reduce((a, b) => a + b, 0) / ys.length;
        const sdAll = Math.sqrt(ys.reduce((a, b) => a + (b - meanAll) ** 2, 0) / (ys.length - 1)) || 1;
        let bestDelta = 0;
        let bestAt = -1;
        for (let c = win; c <= ys.length - win; c++) {
          const before = ys.slice(c - win, c).reduce((a, b) => a + b, 0) / win;
          const after = ys.slice(c, c + win).reduce((a, b) => a + b, 0) / win;
          const d = Math.abs(after - before);
          if (d > bestDelta) {
            bestDelta = d;
            bestAt = c;
          }
        }
        const cpScore = Math.min(1, bestDelta / (3 * sdAll));
        if (cpScore > 0.5 && bestAt >= 0) {
          out.push({
            kind: "changepoint",
            score: cpScore,
            title: `${m.displayName} 수준 변화점 감지`,
            evidence: `${new Date(xs[bestAt]).toISOString().slice(0, 10)} 전후 Δ ${formatNumber(bestDelta)}`,
            spec: specFor(table, {
              markType: "line",
              encodings: { x: { fid: t.fid, bucket: { unit } }, y: [{ fid: m.fid, agg: "sum" }] },
              meta: { origin: "recommend", title: `${m.displayName} 변화점 (${unit})` },
            }),
          });
        }
      }

      if (score > 0.25) {
        out.push({
          kind: "trend",
          score,
          title: `${m.displayName} ${r > 0 ? "상승" : "하락"} 추세`,
          evidence: `상관계수 r=${r.toFixed(2)} (${xs.length}개 구간)`,
          spec: specFor(table, {
            markType: "line",
            encodings: {
              x: { fid: t.fid, bucket: { unit } },
              y: [{ fid: m.fid, agg: "sum" }],
            },
            meta: { origin: "recommend", title: `${t.displayName}별 ${m.displayName} 추이` },
          }),
        });
      }
    }
  }

  // 2) Outlier group / 3) Dominance — dim × measure
  for (const d of dims.slice(0, 6)) {
    for (const m of measures.slice(0, 4)) {
      if (!budget()) break;
      const res = runQuery(table, {
        datasetId: table.datasetId,
        filters: [],
        transforms: [],
        view: {
          type: "aggregate",
          groupBy: [d.fid],
          measures: [
            { fid: m.fid, agg: "mean", as: "avg" },
            { fid: m.fid, agg: "sum", as: "total" },
          ],
        },
      });
      const avgs = res.rows
        .map((r) => r.avg)
        .filter((v): v is number => typeof v === "number");
      if (avgs.length < 3) continue;
      const mean = avgs.reduce((a, b) => a + b, 0) / avgs.length;
      const sd = Math.sqrt(avgs.reduce((a, b) => a + (b - mean) ** 2, 0) / (avgs.length - 1));
      if (sd > 0) {
        let worst = 0;
        let worstRow: Record<string, Scalar> | undefined;
        for (const row of res.rows) {
          if (typeof row.avg !== "number") continue;
          const z = Math.abs((row.avg - mean) / sd);
          if (z > worst) {
            worst = z;
            worstRow = row;
          }
        }
        const score = Math.min(1, worst / 4);
        if (score > 0.45 && worstRow) {
          out.push({
            kind: "outlier-group",
            score,
            title: `${d.displayName} "${String(worstRow[d.fid])}"의 ${m.displayName} 평균이 특이`,
            evidence: `z=${worst.toFixed(1)}, 평균 ${formatNumber(worstRow.avg as number)} vs 전체 ${formatNumber(mean)}`,
            spec: specFor(table, {
              markType: "bar",
              encodings: {
                x: { fid: d.fid, sort: "byMeasure" },
                y: [{ fid: m.fid, agg: "mean" }],
              },
              meta: { origin: "recommend", title: `${d.displayName}별 ${m.displayName} 평균` },
            }),
          });
        }
      }
      // Dominance
      const totals = res.rows
        .map((r) => r.total)
        .filter((v): v is number => typeof v === "number" && v >= 0);
      const grand = totals.reduce((a, b) => a + b, 0);
      if (grand > 0 && totals.length >= 3) {
        const top = Math.max(...totals);
        const share = top / grand;
        if (share > 0.5) {
          const topRow = res.rows.find((r) => r.total === top);
          out.push({
            kind: "dominance",
            score: share,
            title: `${d.displayName} "${String(topRow?.[d.fid])}"가 ${m.displayName}의 ${Math.round(share * 100)}% 차지`,
            evidence: `상위 1개 그룹 점유율 ${Math.round(share * 100)}%`,
            spec: specFor(table, {
              markType: "arc",
              encodings: {
                color: { fid: d.fid },
                theta: { fid: m.fid, agg: "sum" },
              },
              meta: { origin: "recommend", title: `${d.displayName}별 ${m.displayName} 구성비` },
            }),
          });
        }
      }
    }
  }

  // Group diff — 저카디널리티 dim(≤8)별 분포 차이 η² (GOAL §8.3)
  for (const d of dims.filter((x) => x.profile.distinctCount <= 8).slice(0, 4)) {
    for (const m of measures.slice(0, 3)) {
      if (!budget()) break;
      const col = table.columns[m.fid] ?? [];
      const dimCol = table.columns[d.fid] ?? [];
      const groups = new Map<Scalar, { sum: number; n: number }>();
      let grandSum = 0;
      let grandN = 0;
      for (let i = 0; i < table.rowCount; i++) {
        const v = col[i];
        if (typeof v !== "number" || !Number.isFinite(v)) continue;
        const g = dimCol[i];
        const bucket = groups.get(g) ?? { sum: 0, n: 0 };
        bucket.sum += v;
        bucket.n += 1;
        groups.set(g, bucket);
        grandSum += v;
        grandN += 1;
      }
      if (grandN < 20 || groups.size < 2) continue;
      const grandMean = grandSum / grandN;
      let ssBetween = 0;
      for (const g of groups.values()) {
        ssBetween += g.n * (g.sum / g.n - grandMean) ** 2;
      }
      const ssTotal = (m.profile.stdev ?? 0) ** 2 * (grandN - 1);
      const eta2 = ssTotal > 0 ? Math.min(1, ssBetween / ssTotal) : 0;
      if (eta2 > 0.25) {
        out.push({
          kind: "group-diff",
          score: eta2,
          title: `${d.displayName}에 따라 ${m.displayName} 분포가 다름`,
          evidence: `η² = ${eta2.toFixed(2)} (${groups.size}개 그룹)`,
          spec: specFor(table, {
            markType: "bar",
            encodings: { x: { fid: d.fid, sort: "byMeasure" }, y: [{ fid: m.fid, agg: "mean" }] },
            meta: { origin: "recommend", title: `${d.displayName}별 ${m.displayName} 평균 비교` },
          }),
        });
      }
    }
  }

  // 4) Correlation — measure 쌍
  for (let i = 0; i < measures.length && i < 4; i++) {
    for (let j = i + 1; j < measures.length && j < 5; j++) {
      if (!budget()) break;
      const a = measures[i];
      const b = measures[j];
      const rho = pearson(table.columns[a.fid] ?? [], table.columns[b.fid] ?? []);
      if (Math.abs(rho) > 0.6 && Math.abs(rho) < 0.999) {
        out.push({
          kind: "correlation",
          score: Math.abs(rho),
          title: `${a.displayName} ↔ ${b.displayName} ${rho > 0 ? "양" : "음"}의 상관`,
          evidence: `pearson ρ=${rho.toFixed(2)}`,
          spec: specFor(table, {
            markType: "point",
            encodings: {
              x: { fid: a.fid },
              y: [{ fid: b.fid }],
            },
            meta: { origin: "recommend", title: `${a.displayName} × ${b.displayName}` },
          }),
        });
      }
    }
  }

  // 5) Skewed dist — 프로파일 재사용
  for (const m of measures.slice(0, 6)) {
    const g1 = m.profile.skewness ?? 0;
    const score = Math.min(1, Math.abs(g1) / 3);
    if (score > 0.5) {
      out.push({
        kind: "skewed-dist",
        score,
        title: `${m.displayName} 분포가 ${g1 > 0 ? "오른쪽" : "왼쪽"}으로 치우침`,
        evidence: `skewness=${g1.toFixed(1)}`,
        spec: specFor(table, {
          markType: "bar",
          encodings: { x: { fid: m.fid, bucket: { binCount: 20 } } },
          meta: { origin: "recommend", title: `${m.displayName} 분포` },
        }),
      });
    }
  }

  // 점수순, 유형별 상한 적용
  out.sort((a, b) => b.score - a.score);
  const byKind = new Map<string, number>();
  const picked: InsightCandidate[] = [];
  for (const c of out) {
    const used = byKind.get(c.kind) ?? 0;
    if (used >= perKind) continue;
    byKind.set(c.kind, used + 1);
    picked.push(c);
    if (picked.length >= maxResults) break;
  }
  return picked;
}

/** temporal 필드가 있으면 기본 추천 1개는 항상 나오도록 하는 폴백 */
export function fallbackRecommendations(table: DataTable): InsightCandidate[] {
  const fields = table.fields.filter((f) => !f.hidden);
  const t = fields.find((f) => f.semanticType === "temporal");
  const m = fields.find((f) => f.analyticType === "measure");
  const d = fields.find(
    (f) => f.analyticType === "dimension" && f.semanticType !== "temporal" && f.profile.distinctCount <= 30,
  );
  const out: InsightCandidate[] = [];
  if (t && m) {
    const unit = t.profile.temporalRange?.suggestedUnit ?? "month";
    out.push({
      kind: "trend",
      score: 0.2,
      title: `${t.displayName}별 ${m.displayName}`,
      evidence: "기본 추천",
      spec: specFor(table, {
        markType: "line",
        encodings: { x: { fid: t.fid, bucket: { unit } }, y: [{ fid: m.fid, agg: "sum" }] },
        meta: { origin: "recommend", title: `${t.displayName}별 ${m.displayName} 추이` },
      }),
    });
  }
  if (d && m) {
    out.push({
      kind: "outlier-group",
      score: 0.15,
      title: `${d.displayName}별 ${m.displayName}`,
      evidence: "기본 추천",
      spec: specFor(table, {
        markType: "bar",
        encodings: { x: { fid: d.fid, sort: "byMeasure" }, y: [{ fid: m.fid, agg: "sum" }] },
        meta: { origin: "recommend", title: `${d.displayName}별 ${m.displayName}` },
      }),
    });
  }
  return out;
}

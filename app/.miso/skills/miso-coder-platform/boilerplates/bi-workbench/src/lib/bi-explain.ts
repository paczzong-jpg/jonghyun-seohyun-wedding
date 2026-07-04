/**
 * bi-explain — Explainer "왜?" 기여도 분해 (GOAL §8.5)
 *
 * 통계 분해는 전부 로컬에서 수행한다. LLM(bi-ai.explainNarrative)은 이 결과를
 * 서술로 바꾸는 역할만 하며, LLM이 없어도 분해 수치는 그대로 보인다(G4).
 */

import type {
  AggFn,
  ChartSpec,
  DataTable,
  DateUnit,
  FilterRule,
  Scalar,
} from "./bi-types";
import { DATE_UNIT_LABELS } from "./bi-types";
import { advanceEpoch, runQuery } from "./bi-engine";
import { defaultAgg, fieldOf } from "./bi-derive";
import { formatCell, formatEpoch } from "./bi-format";

/** 차트 datum 클릭 한 조각 — bucket이 있으면 구간 값(시작 epoch/bin lo) */
export interface SelectionPart {
  fid: string;
  value: Scalar;
  label: string;
  valueLabel: string;
  bucket?: { unit: DateUnit } | { binCount: number; width: number };
}

/** 선택 조각 → 엔진 필터 규칙 (탐색 "이 값으로 필터"·대시보드 크로스필터 공용) */
export function partsToFilterRules(parts: SelectionPart[]): FilterRule[] {
  const rules: FilterRule[] = [];
  for (const p of parts) {
    if (p.bucket && "unit" in p.bucket && typeof p.value === "number") {
      rules.push({
        fid: p.fid,
        op: "timeRange",
        from: new Date(p.value).toISOString(),
        to: new Date(advanceEpoch(p.value, p.bucket.unit)).toISOString(),
      });
    } else if (p.bucket && "binCount" in p.bucket && typeof p.value === "number") {
      rules.push({ fid: p.fid, op: "range", min: p.value, max: p.value + p.bucket.width });
    } else {
      rules.push({ fid: p.fid, op: "oneOf", values: [p.value] });
    }
  }
  return rules;
}

export interface ExplainGroup {
  value: Scalar;
  label: string;
  target: number;
  baseline: number;
  /** delta 모드: 절대 변화량 / share 모드: 구성비 차이(比率, -1~1) */
  delta: number;
  /** 전체 변화(Δtotal) 대비 이 그룹의 기여 비율 (delta 모드) */
  shareOfChange?: number;
}

export interface ExplainFactor {
  fid: string;
  displayName: string;
  /** 상위 3그룹의 |Δ| 합 / 이 dimension 전체 |Δ| 합 — 집중도 (GOAL §8.5) */
  power: number;
  groups: ExplainGroup[];
}

export interface ExplainResult {
  /** delta: 직전 구간 대비 / share: 전체 대비 구성 차이 */
  mode: "delta" | "share";
  measureFid: string;
  agg: AggFn;
  measureLabel: string;
  targetLabel: string;
  baselineLabel: string;
  targetTotal: number;
  baselineTotal: number;
  targetFilters: FilterRule[];
  factors: ExplainFactor[];
}

function toNumber(v: Scalar | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * 선택 datum을 분해한다.
 * - temporal bucket 선택: 선택 구간 vs 직전 구간의 Δ를 미사용 dimension별로 분해
 * - 범주 선택: 선택 부분집합 vs 전체의 구성비 차이를 분해
 */
export function explainSelection(
  table: DataTable,
  spec: ChartSpec,
  parts: SelectionPart[],
): ExplainResult | null {
  if (parts.length === 0) return null;
  const fields = table.fields;

  // 분해 대상 measure — 가산 분해가 가능해야 하므로 sum/count로 한정
  const yEnc = spec.encodings.y?.[0];
  const yField = yEnc ? fieldOf(fields, yEnc.fid) : undefined;
  let measureFid: string;
  let agg: AggFn;
  if (yEnc && yField?.analyticType === "measure") {
    measureFid = yEnc.fid;
    const requested = yEnc.agg ?? defaultAgg(yField);
    agg = requested === "count" ? "count" : "sum";
  } else {
    measureFid = fields[0]?.fid ?? "";
    agg = "count";
  }
  const measureLabel =
    agg === "count" ? "행 수" : `${yField?.displayName ?? measureFid} 합계`;

  const temporalPart = parts.find(
    (p) => p.bucket && "unit" in p.bucket && typeof p.value === "number",
  );
  const otherParts = parts.filter((p) => p !== temporalPart);
  const mode: ExplainResult["mode"] = temporalPart ? "delta" : "share";

  const targetFilters = [...spec.filters, ...partsToFilterRules(parts)];
  let baselineFilters: FilterRule[];
  let targetLabel: string;
  let baselineLabel: string;

  if (temporalPart && temporalPart.bucket && "unit" in temporalPart.bucket) {
    const unit = temporalPart.bucket.unit;
    const start = temporalPart.value as number;
    const prev = advanceEpoch(start, unit, -1);
    baselineFilters = [
      ...spec.filters,
      ...partsToFilterRules(otherParts),
      {
        fid: temporalPart.fid,
        op: "timeRange",
        from: new Date(prev).toISOString(),
        to: new Date(start).toISOString(),
      },
    ];
    targetLabel = formatEpoch(start, unit);
    baselineLabel = `직전 ${DATE_UNIT_LABELS[unit]} (${formatEpoch(prev, unit)})`;
  } else {
    baselineFilters = [...spec.filters];
    targetLabel = parts.map((p) => `${p.label} = ${p.valueLabel}`).join(" · ");
    baselineLabel = "전체";
  }

  const aggregate = (filters: FilterRule[], dimFid?: string) =>
    runQuery(table, {
      datasetId: table.datasetId,
      filters,
      transforms: [],
      view: {
        type: "aggregate",
        groupBy: dimFid ? [dimFid] : [],
        measures: [{ fid: measureFid, agg, as: "v" }],
      },
    });

  const targetTotal = toNumber(aggregate(targetFilters).rows[0]?.v);
  const baselineTotal = toNumber(aggregate(baselineFilters).rows[0]?.v);
  if (targetTotal === 0 && baselineTotal === 0) return null;

  // 후보 dimension: 차트·선택에 안 쓰인 저카디널리티 dimension
  const usedFids = new Set<string>(
    [
      ...parts.map((p) => p.fid),
      spec.encodings.x?.fid,
      spec.encodings.color?.fid,
      ...(spec.encodings.y ?? []).map((e) => e.fid),
    ].filter((f): f is string => Boolean(f)),
  );
  const candidates = fields.filter(
    (f) =>
      f.analyticType === "dimension" &&
      f.semanticType !== "temporal" &&
      !f.hidden &&
      !usedFids.has(f.fid) &&
      f.profile.distinctCount >= 2 &&
      f.profile.distinctCount <= 50,
  );

  const deltaTotal = targetTotal - baselineTotal;
  const factors: (ExplainFactor & { coverage: number })[] = [];

  for (const dim of candidates) {
    const targetRows = aggregate(targetFilters, dim.fid).rows;
    const baselineRows = aggregate(baselineFilters, dim.fid).rows;
    const t = new Map<Scalar, number>();
    const b = new Map<Scalar, number>();
    for (const r of targetRows) t.set(r[dim.fid], toNumber(r.v));
    for (const r of baselineRows) b.set(r[dim.fid], toNumber(r.v));
    const keys = new Set<Scalar>([...t.keys(), ...b.keys()]);

    const groups: ExplainGroup[] = [];
    for (const k of keys) {
      const tv = t.get(k) ?? 0;
      const bv = b.get(k) ?? 0;
      const delta =
        mode === "delta"
          ? tv - bv
          : (targetTotal > 0 ? tv / targetTotal : 0) - (baselineTotal > 0 ? bv / baselineTotal : 0);
      groups.push({
        value: k,
        label: formatCell(k, dim),
        target: tv,
        baseline: bv,
        delta,
        ...(mode === "delta" && deltaTotal !== 0
          ? { shareOfChange: (tv - bv) / deltaTotal }
          : {}),
      });
    }
    const totalAbs = groups.reduce((a, g) => a + Math.abs(g.delta), 0);
    if (totalAbs === 0) continue;
    groups.sort((a, gB) => Math.abs(gB.delta) - Math.abs(a.delta));
    const top = groups.slice(0, 4);
    const top3Abs = groups.slice(0, 3).reduce((a, g) => a + Math.abs(g.delta), 0);
    factors.push({
      fid: dim.fid,
      displayName: dim.displayName,
      power: top3Abs / totalAbs,
      groups: top,
      coverage: top3Abs,
    });
  }

  // 절대 기여량(coverage)이 큰 dimension이 더 설명력 있다
  factors.sort((a, b2) => b2.coverage - a.coverage);

  return {
    mode,
    measureFid,
    agg,
    measureLabel,
    targetLabel,
    baselineLabel,
    targetTotal,
    baselineTotal,
    targetFilters,
    factors: factors.slice(0, 3).map(({ coverage: _c, ...f }) => f),
  };
}

/**
 * bi-derive — ChartSpec → QuerySpec 유도 (GOAL §4.3 규칙 1~8)와
 * mark 자동 선택 결정표 (GOAL §7.1). 전부 순수 함수 — 같은 spec은 항상
 * 같은 질의·같은 mark를 낳는다.
 */

import type {
  AggFn,
  ChartSpec,
  DataTable,
  Encoding,
  FieldMeta,
  MarkType,
  QuerySpec,
  SortRule,
  TransformRule,
} from "./bi-types";
import { MAX_CHART_ROWS, MAX_SCATTER_ROWS } from "./bi-types";

export function fieldOf(fields: FieldMeta[], fid: string): FieldMeta | undefined {
  return fields.find((f) => f.fid === fid);
}

export function defaultAgg(field: FieldMeta | undefined): AggFn {
  return field?.semanticType === "quantitative" ? "sum" : "count";
}

function isDimension(fields: FieldMeta[], enc: Encoding | undefined): boolean {
  if (!enc) return false;
  const f = fieldOf(fields, enc.fid);
  if (!f) return false;
  // bucket이 붙으면 quant/temporal도 dimension으로 쓰인다
  if (enc.bucket) return true;
  return f.analyticType === "dimension";
}

function isMeasure(fields: FieldMeta[], enc: Encoding | undefined): boolean {
  if (!enc) return false;
  if (enc.bucket) return false;
  const f = fieldOf(fields, enc.fid);
  return f?.analyticType === "measure";
}

/** 인코딩 채널의 출력 컬럼명 — bucket이 있으면 변환 별칭, 없으면 fid */
export function channelKey(enc: Encoding): string {
  if (!enc.bucket) return enc.fid;
  if ("unit" in enc.bucket) return `${enc.fid}__${enc.bucket.unit}`;
  return `${enc.fid}__bin${enc.bucket.binCount}`;
}

function bucketTransform(enc: Encoding, fields: FieldMeta[]): TransformRule | null {
  if (!enc.bucket) return null;
  const as = channelKey(enc);
  if ("unit" in enc.bucket) return { as, op: "dateTrunc", fid: enc.fid, unit: enc.bucket.unit };
  const f = fieldOf(fields, enc.fid);
  if (f?.semanticType === "temporal") return null;
  return { as, op: "bin", fid: enc.fid, binCount: enc.bucket.binCount };
}

export interface DerivedChartQuery {
  query: QuerySpec;
  /** 결정된 실제 mark ("auto" 해석 결과) */
  mark: Exclude<MarkType, "auto">;
  /** x/색상/측정값의 출력 컬럼명 매핑 */
  keys: {
    x?: string;
    color?: string;
    measures: string[];
    theta?: string;
    size?: string;
    shape?: string;
    opacity?: string;
  };
  /** y 다중 measure fold 여부 (color 채널은 fold key가 차지) */
  folded: boolean;
}

/** mark 자동 선택 결정표 (GOAL §7.1) — 위에서 첫 매치 */
export function resolveAutoMark(spec: ChartSpec, fields: FieldMeta[]): Exclude<MarkType, "auto"> {
  if (spec.markType !== "auto") return spec.markType;
  const { x, color } = spec.encodings;
  const ys = spec.encodings.y ?? [];
  const y = ys[0];
  const xField = x ? fieldOf(fields, x.fid) : undefined;
  const xDim = isDimension(fields, x);
  const yMeasures = ys.filter((e) => isMeasure(fields, e));
  const xTemporal = xField?.semanticType === "temporal";
  const xQuant = xField?.semanticType === "quantitative" && !x?.bucket;
  const xCardinality = xField?.profile.distinctCount ?? 0;

  if (xTemporal && yMeasures.length > 0) return "line";
  if (xDim && yMeasures.length > 0) return "bar";
  if (xQuant && y && isMeasure(fields, y)) return "point";
  if (xDim && y && isDimension(fields, y) && yMeasures.length === 0) return "rect";
  if (xQuant && ys.length === 0) return "bar"; // 히스토그램
  if (xDim && ys.length === 0) return "bar"; // 카운트
  if (!x && yMeasures.length === 1 && !color) return "kpi";
  void xCardinality;
  return "table";
}

/** ChartSpec → QuerySpec 유도 (GOAL §4.3 규칙 1~8) */
export function deriveChartQuery(spec: ChartSpec, table: DataTable): DerivedChartQuery {
  const fields = table.fields;
  const mark = resolveAutoMark(spec, fields);
  const { x, color, theta, size } = spec.encodings;
  const ys = spec.encodings.y ?? [];

  const transforms: TransformRule[] = [];
  const groupBy: string[] = [];
  const measures: { fid: string; agg: AggFn; as: string }[] = [];
  const metricViews: { as: string; expr: string }[] = [];
  const keys: DerivedChartQuery["keys"] = { measures: [] };

  const addDim = (enc: Encoding): string => {
    const t = bucketTransform(enc, fields);
    if (t) transforms.push(t);
    const key = channelKey(enc);
    if (!groupBy.includes(key)) groupBy.push(key);
    return key;
  };

  const addMeasure = (enc: Encoding): string => {
    const f = fieldOf(fields, enc.fid);
    // 집계 지표: agg를 고르지 않고 표현식으로 집계 후 산술 (as=지표 fid)
    if (f?.metric) {
      const as = enc.fid;
      if (!metricViews.some((m) => m.as === as)) metricViews.push({ as, expr: f.metric.expr });
      if (!keys.measures.includes(as)) keys.measures.push(as);
      return as;
    }
    const agg = enc.agg ?? defaultAgg(f);
    const as = `${agg}_${enc.fid}`;
    if (!measures.some((m) => m.as === as)) measures.push({ fid: enc.fid, agg, as });
    keys.measures.push(as);
    return as;
  };

  // 규칙 6: table 또는 인코딩 없음 → raw
  const encodedAny = x || ys.length > 0 || color || theta;
  if (mark === "table" || !encodedAny) {
    // 지표(metric)는 컬럼이 없으므로 raw/table 뷰에서 제외
    const visible = fields.filter((f) => !f.hidden && !f.metric).map((f) => f.fid);
    return {
      mark: "table",
      folded: false,
      keys,
      query: {
        datasetId: spec.datasetId,
        filters: spec.filters,
        transforms: [],
        view: { type: "raw", fields: visible },
        limit: MAX_CHART_ROWS,
      },
    };
  }

  // 규칙 1·2: 채널 분류
  if (x) {
    if (isMeasure(fields, x)) keys.x = addMeasure(x);
    else keys.x = addDim(x);
  }
  const yMeasures = ys.filter((e) => isMeasure(fields, e));
  const yDims = ys.filter((e) => !isMeasure(fields, e));
  for (const e of yDims) addDim(e);
  if (color && isDimension(fields, color)) keys.color = addDim(color);
  if (theta && isMeasure(fields, theta)) keys.theta = addMeasure(theta);
  if (size && isMeasure(fields, size)) keys.size = addMeasure(size);
  // arc를 수동 선택했는데 theta가 비어 있으면 y[0] measure가 theta 역할
  if (mark === "arc" && !keys.theta && yMeasures[0]) {
    const f = fieldOf(fields, yMeasures[0].fid);
    keys.theta = `${yMeasures[0].agg ?? defaultAgg(f)}_${yMeasures[0].fid}`;
  }

  // 규칙 4: 히스토그램 — measure 없이 x가 quant
  const xField = x ? fieldOf(fields, x.fid) : undefined;
  if (yMeasures.length === 0 && !keys.theta && xField?.semanticType === "quantitative" && !x?.bucket) {
    // x를 bin dimension으로 바꾸고 count 측정값 삽입
    const binEnc: Encoding = { fid: xField.fid, bucket: { binCount: 20 } };
    groupBy.length = 0;
    transforms.length = 0;
    keys.x = addDim(binEnc);
    if (keys.color) groupBy.push(keys.color);
    measures.push({ fid: xField.fid, agg: "count", as: "count" });
    keys.measures = ["count"];
  } else if (yMeasures.length === 0 && !keys.theta && mark !== "rect" && mark !== "point") {
    // 규칙: dim만 있음 → count
    measures.push({ fid: fields[0]?.fid ?? "", agg: "count", as: "count" });
    keys.measures = ["count"];
  } else if (mark === "rect" && yMeasures.length === 0 && !keys.theta) {
    // dim×dim heatmap → count
    measures.push({ fid: fields[0]?.fid ?? "", agg: "count", as: "count" });
    keys.measures = ["count"];
  } else {
    for (const e of yMeasures) addMeasure(e);
  }

  // boxplot: dim(x)별 measure(y) 분포 — 집계 없이 raw 후 surface에서 사분위수 계산
  if (mark === "boxplot" && x && ys[0]) {
    const rawFields = [x.fid, ys[0].fid];
    if (color) rawFields.push(color.fid);
    keys.x = x.fid;
    keys.color = color?.fid;
    keys.measures = [ys[0].fid];
    return {
      mark,
      folded: false,
      keys,
      query: {
        datasetId: spec.datasetId,
        filters: spec.filters,
        transforms: [],
        view: { type: "raw", fields: [...new Set(rawFields)] },
        limit: MAX_CHART_ROWS,
      },
    };
  }

  // point(산점도): 집계 없이 raw 두 축
  if (mark === "point" && x && isMeasure(fields, ys[0] ? ys[0] : x)) {
    const { shape, opacity } = spec.encodings;
    const rawFields = [x.fid, ...ys.map((e) => e.fid)];
    if (color) rawFields.push(color.fid);
    if (size) rawFields.push(size.fid);
    if (shape) rawFields.push(shape.fid);
    if (opacity) rawFields.push(opacity.fid);
    keys.x = x.fid;
    keys.color = color?.fid;
    keys.size = size?.fid;
    keys.shape = shape?.fid;
    keys.opacity = opacity?.fid;
    keys.measures = ys.map((e) => e.fid);
    return {
      mark,
      folded: false,
      keys,
      query: {
        datasetId: spec.datasetId,
        filters: spec.filters,
        transforms: [],
        view: { type: "raw", fields: [...new Set(rawFields)] },
        limit: MAX_SCATTER_ROWS,
      },
    };
  }

  // 규칙 3: y 다중 measure → fold (color 채널은 fold key)
  // 지표가 있으면 fold하지 않는다(지표는 개별 집계 컬럼으로 유지)
  const folded = yMeasures.length > 1 && metricViews.length === 0;

  // 규칙 8: 정렬 — encoding.sort → 기본 [temporal asc] → [첫 measure desc]
  const sort: SortRule[] = [];
  if (x && keys.x) {
    const xf = fieldOf(fields, x.fid);
    if (x.sort === "asc" || x.sort === "desc") {
      sort.push({ field: keys.x, order: x.sort });
    } else if (x.sort === "byMeasure" && keys.measures[0]) {
      sort.push({ field: folded ? "value" : keys.measures[0], order: "desc" });
    } else if (xf?.semanticType === "temporal" || x.bucket) {
      sort.push({ field: keys.x, order: "asc" });
    } else if (keys.measures[0] && mark === "bar") {
      sort.push({ field: folded ? "value" : keys.measures[0], order: "desc" });
    }
  } else if (keys.measures[0] && mark === "arc") {
    sort.push({ field: folded ? "value" : keys.measures[0], order: "desc" });
  }

  const view: QuerySpec["view"] = folded
    ? {
        type: "fold",
        groupBy,
        foldMeasures: yMeasures.map((e) => ({
          fid: e.fid,
          agg: e.agg ?? defaultAgg(fieldOf(fields, e.fid)),
        })),
      }
    : {
        type: "aggregate",
        groupBy,
        measures,
        ...(metricViews.length ? { metrics: metricViews } : {}),
      };

  return {
    mark,
    folded,
    keys: folded ? { ...keys, color: "key", measures: ["value"] } : keys,
    query: {
      datasetId: spec.datasetId,
      filters: spec.filters,
      transforms,
      view,
      sort,
      limit: MAX_CHART_ROWS,
    },
  };
}

/** 빈 ChartSpec */
export function emptyChartSpec(datasetId: string): ChartSpec {
  return {
    datasetId,
    markType: "auto",
    encodings: {},
    stack: "none",
    filters: [],
    style: {},
    meta: { origin: "manual" },
  };
}

/** temporal 필드를 x에 놓을 때 기본 bucket 제안 */
export function defaultBucketFor(field: FieldMeta): Encoding {
  if (field.semanticType === "temporal") {
    return {
      fid: field.fid,
      bucket: { unit: field.profile.temporalRange?.suggestedUnit ?? "month" },
    };
  }
  return { fid: field.fid };
}

/** ChartSpec → URL 쿼리 파라미터 (GOAL_UIUX §5.3 — 새로고침·공유 안전) */
export function encodeSpecParam(spec: ChartSpec): string {
  const json = JSON.stringify(spec);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSpecParam(param: string): ChartSpec | null {
  try {
    const bin = atob(param.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const spec = JSON.parse(new TextDecoder().decode(bytes)) as ChartSpec;
    if (!spec || typeof spec !== "object" || !spec.encodings) return null;
    return spec;
  } catch {
    return null;
  }
}

/** 사람이 읽는 인코딩 라벨: "합계(revenue)" / "order_date (월)" */
export function encodingLabel(enc: Encoding, fields: FieldMeta[]): string {
  const f = fieldOf(fields, enc.fid);
  const name = f?.displayName ?? enc.fid;
  if (enc.bucket && "unit" in enc.bucket) {
    const unitLabels: Record<string, string> = {
      year: "연", quarter: "분기", month: "월", week: "주", day: "일", hour: "시",
    };
    return `${name} (${unitLabels[enc.bucket.unit] ?? enc.bucket.unit})`;
  }
  if (enc.bucket) return `${name} (구간)`;
  // 지표는 집계가 표현식 안에 있으므로 agg 접두를 붙이지 않는다
  if (f?.metric) return name;
  if (f?.analyticType === "measure" || enc.agg) {
    const aggLabels: Record<string, string> = {
      sum: "합계", mean: "평균", median: "중앙값", count: "개수", countDistinct: "고유",
      min: "최소", max: "최대", stdev: "표준편차", variance: "분산",
    };
    const agg = enc.agg ?? defaultAgg(f);
    return `${aggLabels[agg] ?? agg} · ${name}`;
  }
  return name;
}

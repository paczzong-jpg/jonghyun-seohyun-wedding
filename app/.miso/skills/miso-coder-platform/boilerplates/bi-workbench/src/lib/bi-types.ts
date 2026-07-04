/**
 * bi-types — 데이터분석 워크벤치의 단일 데이터 모델 (GOAL.md §4)
 *
 * 모든 데이터 요청은 QuerySpec 하나로 표현되고, 모든 시각화는 ChartSpec
 * 하나로 표현된다. UI·인사이트 엔진·대시보드가 같은 통화를 쓴다.
 * 연산은 브라우저 인메모리 엔진(bi-engine.ts)이 수행하고,
 * 영속화는 PocketBase(bi_datasets/bi_charts/bi_dashboards)만 담당한다.
 */

export type Scalar = string | number | boolean | null;

export type AnalyticType = "dimension" | "measure";
export type SemanticType = "quantitative" | "nominal" | "ordinal" | "temporal";
export type DataType = "int" | "float" | "bool" | "date" | "datetime" | "string";

export type DateUnit = "year" | "quarter" | "month" | "week" | "day" | "hour";

export interface FieldProfile {
  count: number;
  nullCount: number;
  distinctCount: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  stdev?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  skewness?: number;
  /** quantitative: 20-bin equal width */
  histogram?: { lo: number; hi: number; count: number }[];
  /** nominal/ordinal: 상위 10 값 */
  topValues?: { value: string; count: number }[];
  /** temporal */
  temporalRange?: { min: string; max: string; suggestedUnit: DateUnit };
}

export interface DerivedField {
  /** 산술 표현식. 필드는 [컬럼표시명] 또는 fid 참조. 예: "([revenue] - [cost]) / [revenue]" */
  expr: string;
  sourceFids: string[];
  origin: "manual" | "ai";
  prompt?: string;
}

/**
 * 저장된 지표(집계 표현식). 행 단위 계산 필드로는 표현 불가한 "집계 후 산술".
 * 예: "sum([revenue]) / countDistinct([customer_id])" (고객당 매출)
 */
export interface MetricField {
  expr: string;
}

export interface FieldMeta {
  /** 불변 식별자. 컬럼명 변경에도 유지된다. */
  fid: string;
  /** 물리 컬럼명 (원본 헤더 기준 정규화) */
  name: string;
  /** 사용자 편집 표시명 */
  displayName: string;
  analyticType: AnalyticType;
  semanticType: SemanticType;
  dataType: DataType;
  hidden: boolean;
  derived?: DerivedField;
  /** 집계 지표면 표현식(값 컬럼은 없음 — 집계 시점에 계산) */
  metric?: MetricField;
  /** 조인으로 편입된 필드면 원본 데이터셋 라벨(필드 목록 그룹핑용) */
  joinLabel?: string;
  profile: FieldProfile;
}

// ---------------------------------------------------------------------------
// QuerySpec — 선언적 질의 (GOAL §4.2)
// ---------------------------------------------------------------------------

export type AggFn =
  | "sum"
  | "mean"
  | "median"
  | "count"
  | "countDistinct"
  | "min"
  | "max"
  | "stdev"
  | "variance";

export type FilterRule =
  | { fid: string; op: "eq" | "neq"; value: Scalar }
  | { fid: string; op: "oneOf" | "notIn"; values: Scalar[] }
  | { fid: string; op: "range"; min?: number; max?: number }
  | { fid: string; op: "timeRange"; from?: string; to?: string }
  | { fid: string; op: "timeRelative"; lastN: number; unit: DateUnit }
  | { fid: string; op: "isNull" | "notNull" }
  | { fid: string; op: "contains" | "startsWith" | "endsWith"; value: string }
  | { fid: string; op: "topN"; n: number; by: { fid: string; agg: AggFn }; desc: boolean };

export type TransformRule =
  | { as: string; op: "bin"; fid: string; binCount: number }
  | { as: string; op: "log"; fid: string; base: 2 | 10 }
  | { as: string; op: "dateTrunc"; fid: string; unit: DateUnit }
  | { as: string; op: "datePart"; fid: string; part: "dow" | "hour" | "month" };

export type ViewQuery =
  | { type: "raw"; fields: string[] }
  | {
      type: "aggregate";
      groupBy: string[];
      measures: { fid: string; agg: AggFn; as: string }[];
      /** 집계 지표(집계 후 산술). as=출력 컬럼, expr=집계 표현식 */
      metrics?: { as: string; expr: string }[];
    }
  | {
      type: "fold";
      groupBy: string[];
      foldMeasures: { fid: string; agg: AggFn }[];
    };

export interface SortRule {
  field: string;
  order: "asc" | "desc";
}

export interface QuerySpec {
  datasetId: string;
  filters: FilterRule[];
  transforms: TransformRule[];
  view: ViewQuery;
  sort?: SortRule[];
  limit?: number;
  offset?: number;
}

export interface QueryResult {
  /** 출력 컬럼명 순서 (groupBy → measures) */
  columns: string[];
  rows: Record<string, Scalar>[];
  /** limit 적용 전 결과 행 수 */
  totalRows: number;
  elapsedMs: number;
}

// ---------------------------------------------------------------------------
// ChartSpec — 시각 인코딩 (GOAL §4.3)
// ---------------------------------------------------------------------------

export type MarkType =
  | "auto"
  | "bar"
  | "line"
  | "area"
  | "point"
  | "rect"
  | "arc"
  | "boxplot"
  | "kpi"
  | "table";

export interface Encoding {
  fid: string;
  /** measure 채널에서만 */
  agg?: AggFn;
  /** temporal/quantitative의 dimension화 */
  bucket?: { unit: DateUnit } | { binCount: number };
  sort?: "asc" | "desc" | "byMeasure" | null;
}

export interface ChartStyle {
  /** 팔레트 키 (bi-chart의 CHART_PALETTES) */
  palette?: string;
  numberFormat?: "auto" | "comma" | "compact" | "percent" | "currency";
  showLabel?: boolean;
  legend?: "auto" | "hidden";
  axisTitle?: { x?: string; y?: string };
}

export interface ChartSpec {
  datasetId: string;
  markType: MarkType;
  encodings: {
    x?: Encoding;
    y?: Encoding[];
    color?: Encoding;
    size?: Encoding;
    theta?: Encoding;
    /** facet(소형 다중) — Graphic Walker식 row/column 트렐리스 */
    row?: Encoding;
    column?: Encoding;
    /** 산점도 보조 채널 */
    shape?: Encoding;
    opacity?: Encoding;
  };
  stack: "none" | "stack" | "normalize";
  filters: FilterRule[];
  style: ChartStyle;
  /** 시계열 변환 — temporal x의 라인/영역에서 이동평균·예측 오버레이 */
  timeSeries?: { movingAvg?: number; forecast?: number };
  meta: {
    title?: string;
    description?: string;
    origin: "manual" | "recommend" | "ai";
  };
}

// ---------------------------------------------------------------------------
// 영속화 레코드 (PocketBase, GOAL §12 축소판)
// ---------------------------------------------------------------------------

/**
 * 조인 관계 — 팩트(왼쪽) 데이터셋을 디멘션(오른쪽) 데이터셋에 연결한다.
 * 룩업 조인 의미론: 오른쪽 조인키별 첫 행만 매칭해 왼쪽 카디널리티를 보존한다
 * (별표 스키마 enrichment. 1:N 팬아웃/행 폭증 없음).
 */
export interface JoinRelationship {
  /** 안정 식별자 — 조인 필드 fid(`j{id}_{rightFid}`)의 접두가 된다 */
  id: string;
  rightDatasetId: string;
  /** 왼쪽(현재 데이터셋) 조인키 fid */
  leftFid: string;
  /** 오른쪽 데이터셋 조인키 fid */
  rightFid: string;
  kind: "inner" | "left";
}

export interface BiDatasetRecord {
  id: string;
  name: string;
  rowCount: number;
  byteSize: number;
  fields: FieldMeta[];
  sourceName: string;
  version: number;
  /** 다른 데이터셋과의 조인 관계(시맨틱 모델). 없으면 단일 테이블 */
  relationships?: JoinRelationship[];
  /** PB file 필드 — 컬럼 지향 JSON({ cols: { [fid]: Scalar[] } }) */
  data?: string;
  created?: string;
  updated?: string;
}

export interface BiChartRecord {
  id: string;
  datasetId: string;
  name: string;
  spec: ChartSpec;
  created?: string;
  updated?: string;
}

export type WidgetKind = "chart" | "kpi" | "text";

export interface DashboardWidget {
  id: string;
  kind: WidgetKind;
  chartId?: string;
  text?: string;
  layout: { x: number; y: number; w: number; h: number };
}

/** 전역 필터 — fid가 존재하는 위젯에만 주입된다 (GOAL §11) */
export interface GlobalFilterEntry {
  datasetId: string;
  rule: FilterRule;
}

export interface DashboardConfig {
  widgets: DashboardWidget[];
  globalFilters: GlobalFilterEntry[];
  crossFilter: boolean;
}

export interface BiDashboardRecord {
  id: string;
  name: string;
  config: DashboardConfig;
  created?: string;
  updated?: string;
}

// ---------------------------------------------------------------------------
// 인메모리 데이터 테이블 (엔진 입력)
// ---------------------------------------------------------------------------

/**
 * 컬럼 지향 인메모리 테이블. 값 배열은 fid로 키잉한다.
 * temporal 컬럼은 로드 시점에 epoch(ms) number로 정규화해 이중 파싱을 막는다.
 */
export interface DataTable {
  datasetId: string;
  fields: FieldMeta[];
  columns: Record<string, Scalar[]>;
  rowCount: number;
}

export interface InsightCandidate {
  kind:
    | "trend"
    | "seasonality"
    | "changepoint"
    | "outlier-group"
    | "dominance"
    | "correlation"
    | "skewed-dist"
    | "group-diff";
  score: number;
  title: string;
  evidence: string;
  spec: ChartSpec;
}

// ---------------------------------------------------------------------------
// 상수 (GOAL §13)
// ---------------------------------------------------------------------------

export const MAX_CHART_ROWS = 10_000;
/** 산점도는 밀도 래스터로 렌더하므로 개별 심볼 상한 없이 전 포인트를 그린다 */
export const MAX_SCATTER_ROWS = 200_000;
export const GRID_PAGE_SIZE = 100;
export const MAX_UPLOAD_ROWS = 500_000;
export const MAX_INSIGHT_DIMENSION_CARDINALITY = 50;

export const AGG_LABELS: Record<AggFn, string> = {
  sum: "합계",
  mean: "평균",
  median: "중앙값",
  count: "개수",
  countDistinct: "고유 개수",
  min: "최소",
  max: "최대",
  stdev: "표준편차",
  variance: "분산",
};

export const DATE_UNIT_LABELS: Record<DateUnit, string> = {
  year: "연",
  quarter: "분기",
  month: "월",
  week: "주",
  day: "일",
  hour: "시간",
};

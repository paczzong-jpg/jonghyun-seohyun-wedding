/**
 * bi-profile — 타입 추론(GOAL §4.1)과 프로파일 파이프라인(GOAL §8.2)
 *
 * 업로드 직후 원시 셀 값에서 FieldMeta를 추론하고, 값을 엔진 표준형으로
 * 정규화한다(temporal → epoch ms number). 프로파일은 필드 카드·추천·bin
 * 경계·AI 컨텍스트의 공통 재료다.
 */

import type {
  AnalyticType,
  DataTable,
  DataType,
  DateUnit,
  FieldMeta,
  FieldProfile,
  Scalar,
  SemanticType,
} from "./bi-types";
import { computeDerivedColumn } from "./bi-formula";
import { compileMetric } from "./bi-metric";

const ID_LIKE_NAME = /(^|_)(id|uuid|code|zip|post|tel|phone)($|_)/i;
const DATE_LIKE = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}([ T]|$)/;
const BOOL_TOKENS = new Set(["true", "false", "yes", "no", "y", "n"]);

export function sanitizeFieldName(raw: string, fallback: string, used: Set<string>): string {
  const base = (raw || fallback)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_]/gu, "")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  let name = base || fallback;
  let unique = name;
  let n = 2;
  while (used.has(unique)) unique = `${name}_${n++}`;
  used.add(unique);
  return unique;
}

// ---------------------------------------------------------------------------
// 타입 추론 — 원시 값 배열 → (DataType, 정규화 값)
// ---------------------------------------------------------------------------

interface InferredColumn {
  dataType: DataType;
  values: Scalar[];
}

function isEmptyCell(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

/** 셀 원시값 배열을 검사해 타입 확정 + 정규화 값 생성 */
export function inferColumn(raw: unknown[]): InferredColumn {
  let dates = 0;
  let bools = 0;
  let ints = 0;
  let floats = 0;
  let strings = 0;
  let filled = 0;

  for (const v of raw) {
    if (isEmptyCell(v)) continue;
    filled++;
    if (v instanceof Date) {
      dates++;
    } else if (typeof v === "boolean") {
      bools++;
    } else if (typeof v === "number") {
      if (Number.isInteger(v)) ints++;
      else floats++;
    } else {
      const s = String(v).trim();
      if (DATE_LIKE.test(s) && Number.isFinite(Date.parse(s))) dates++;
      else if (BOOL_TOKENS.has(s.toLowerCase())) bools++;
      else {
        const n = Number(s.replace(/,/g, ""));
        if (s !== "" && Number.isFinite(n)) {
          if (Number.isInteger(n)) ints++;
          else floats++;
        } else strings++;
      }
    }
  }

  const pick = (count: number) => filled > 0 && count / filled >= 0.95;

  if (pick(dates)) {
    const values = raw.map((v) => {
      if (isEmptyCell(v)) return null;
      const t = v instanceof Date ? v.getTime() : Date.parse(String(v).trim());
      return Number.isFinite(t) ? t : null;
    });
    const hasTime = values.some((t) => typeof t === "number" && t % 86_400_000 !== 0);
    return { dataType: hasTime ? "datetime" : "date", values };
  }
  if (pick(bools) && strings === 0 && ints === 0 && floats === 0) {
    const values = raw.map((v) => {
      if (isEmptyCell(v)) return null;
      if (typeof v === "boolean") return v;
      return ["true", "yes", "y"].includes(String(v).trim().toLowerCase());
    });
    return { dataType: "bool", values };
  }
  if (pick(ints + floats)) {
    const values = raw.map((v) => {
      if (isEmptyCell(v)) return null;
      const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
      return Number.isFinite(n) ? n : null;
    });
    return { dataType: floats > 0 ? "float" : "int", values };
  }
  const values = raw.map((v) => (isEmptyCell(v) ? null : String(v).trim()));
  return { dataType: "string", values };
}

/** GOAL §4.1 추론 규칙표 — 위에서 아래로 첫 매치 */
export function inferSemantics(
  name: string,
  dataType: DataType,
  distinctCount: number,
  rowCount: number,
): { analyticType: AnalyticType; semanticType: SemanticType } {
  if (dataType === "date" || dataType === "datetime") {
    return { analyticType: "dimension", semanticType: "temporal" };
  }
  if (dataType === "bool") return { analyticType: "dimension", semanticType: "nominal" };
  if (dataType === "int" || dataType === "float") {
    if (ID_LIKE_NAME.test(name)) return { analyticType: "dimension", semanticType: "nominal" };
    if (dataType === "int" && distinctCount <= 12) {
      return { analyticType: "dimension", semanticType: "ordinal" };
    }
    return { analyticType: "measure", semanticType: "quantitative" };
  }
  // string
  void rowCount;
  return { analyticType: "dimension", semanticType: "nominal" };
}

// ---------------------------------------------------------------------------
// 프로파일 (GOAL §8.2)
// ---------------------------------------------------------------------------

function suggestUnit(minMs: number, maxMs: number): DateUnit {
  const span = maxMs - minMs;
  if (span >= 2 * 365 * 86_400_000) return "month";
  if (span >= 60 * 86_400_000) return "week";
  if (span >= 2 * 86_400_000) return "day";
  return "hour";
}

export function profileColumn(values: Scalar[], meta: {
  dataType: DataType;
  semanticType: SemanticType;
}): FieldProfile {
  const count = values.length;
  let nullCount = 0;
  const distinct = new Set<Scalar>();
  for (const v of values) {
    if (v === null) nullCount++;
    else distinct.add(v);
  }
  const profile: FieldProfile = { count, nullCount, distinctCount: distinct.size };

  if (meta.semanticType === "temporal") {
    const nums = values.filter((v): v is number => typeof v === "number");
    if (nums.length > 0) {
      const min = nums.reduce((a, b) => Math.min(a, b));
      const max = nums.reduce((a, b) => Math.max(a, b));
      profile.temporalRange = {
        min: new Date(min).toISOString(),
        max: new Date(max).toISOString(),
        suggestedUnit: suggestUnit(min, max),
      };
      // 시간 분포 스파크라인용 20-bin 히스토그램 (epoch ms 축)
      const bins = 20;
      const width = (max - min) / bins || 1;
      const counts = new Array(bins).fill(0);
      for (const v of nums) counts[Math.min(bins - 1, Math.floor((v - min) / width))]++;
      profile.histogram = counts.map((c, i) => ({
        lo: min + i * width,
        hi: min + (i + 1) * width,
        count: c,
      }));
    }
    return profile;
  }

  if (meta.semanticType === "quantitative" || meta.dataType === "int" || meta.dataType === "float") {
    const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (nums.length > 0) {
      const sorted = [...nums].sort((a, b) => a - b);
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / nums.length;
      profile.min = sorted[0];
      profile.max = sorted[sorted.length - 1];
      profile.mean = mean;
      const q = (p: number) => {
        const pos = (sorted.length - 1) * p;
        const lo = Math.floor(pos);
        const hi = Math.ceil(pos);
        return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
      };
      profile.p25 = q(0.25);
      profile.p50 = q(0.5);
      profile.p75 = q(0.75);
      if (nums.length > 1) {
        const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1);
        const stdev = Math.sqrt(variance);
        profile.stdev = stdev;
        if (stdev > 0) {
          const m3 = nums.reduce((a, b) => a + (b - mean) ** 3, 0) / nums.length;
          profile.skewness = m3 / stdev ** 3;
        }
      }
      // 20-bin equal width 히스토그램
      const lo = sorted[0];
      const hi = sorted[sorted.length - 1];
      const bins = 20;
      const width = (hi - lo) / bins || 1;
      const counts = new Array(bins).fill(0);
      for (const v of nums) {
        counts[Math.min(bins - 1, Math.floor((v - lo) / width))]++;
      }
      profile.histogram = counts.map((c, i) => ({
        lo: lo + i * width,
        hi: lo + (i + 1) * width,
        count: c,
      }));
    }
    if (meta.semanticType === "quantitative") return profile;
  }

  // nominal/ordinal: 상위 10 값
  const freq = new Map<string, number>();
  for (const v of values) {
    if (v === null) continue;
    const key = String(v);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  profile.topValues = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, c]) => ({ value, count: c }));
  return profile;
}

// ---------------------------------------------------------------------------
// 테이블 조립 — 파서 출력(헤더 + 행렬) → DataTable
// ---------------------------------------------------------------------------

export interface ParsedGrid {
  headers: string[];
  rows: unknown[][];
}

export function buildTable(datasetId: string, grid: ParsedGrid): DataTable {
  const used = new Set<string>();
  const names = grid.headers.map((h, i) => sanitizeFieldName(String(h ?? ""), `column_${i + 1}`, used));
  const fields: FieldMeta[] = [];
  const columns: Record<string, Scalar[]> = {};

  for (let c = 0; c < names.length; c++) {
    const rawValues = grid.rows.map((row) => row[c]);
    const { dataType, values } = inferColumn(rawValues);
    const distinct = new Set(values.filter((v) => v !== null)).size;
    const { analyticType, semanticType } = inferSemantics(names[c], dataType, distinct, values.length);
    const fid = `f${c + 1}_${names[c].toLowerCase().slice(0, 24)}`;
    const profile = profileColumn(values, { dataType, semanticType });
    fields.push({
      fid,
      name: names[c],
      displayName: names[c],
      analyticType,
      semanticType,
      dataType,
      hidden: false,
      profile,
    });
    columns[fid] = values;
  }

  return { datasetId, fields, columns, rowCount: grid.rows.length };
}

/** 메타 오버라이드(타입 전환 등) 후 프로파일 재계산 */
export function reprofileField(table: DataTable, field: FieldMeta): FieldMeta {
  return {
    ...field,
    profile: profileColumn(table.columns[field.fid] ?? [], field),
  };
}

/**
 * 계산/파생 필드 FieldMeta를 만든다(수식 → 컬럼 → 타입추론 → 프로파일).
 * 참조·문법 오류는 FormulaError로 전파된다. 반환된 fid는 f{name} 규칙.
 */
export function makeDerivedField(
  table: DataTable,
  displayName: string,
  expr: string,
  usedFids?: Set<string>,
): { field: FieldMeta; values: Scalar[] } {
  const comp = computeDerivedColumn(table, expr);
  const used = usedFids ?? new Set(table.fields.map((f) => f.fid));
  const slug = displayName.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 24) || "calc";
  let fid = `fc_${slug}`;
  let n = 2;
  while (used.has(fid)) fid = `fc_${slug}_${n++}`;
  const distinct = new Set(comp.values.filter((v) => v !== null)).size;
  const { analyticType, semanticType } = inferSemantics(displayName, comp.dataType, distinct, comp.values.length);
  const field: FieldMeta = {
    fid,
    name: fid,
    displayName,
    analyticType,
    semanticType,
    dataType: comp.dataType,
    hidden: false,
    derived: { expr, sourceFids: comp.sourceFids, origin: "manual" },
    profile: profileColumn(comp.values, { dataType: comp.dataType, semanticType }),
  };
  return { field, values: comp.values };
}

/**
 * 집계 지표 FieldMeta를 만든다(값 컬럼 없음 — 집계 시점 계산).
 * 표현식은 compileMetric으로 검증한다(문법·필드 참조 오류는 MetricError로 전파).
 */
export function makeMetricField(
  table: DataTable,
  displayName: string,
  expr: string,
  usedFids?: Set<string>,
): FieldMeta {
  // 검증: 잘못된 표현식/미존재 필드면 여기서 MetricError를 던진다
  compileMetric(expr, (ref) => table.fields.find((f) => f.displayName === ref || f.fid === ref)?.fid ?? null);
  const used = usedFids ?? new Set(table.fields.map((f) => f.fid));
  const slug = displayName.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 24) || "metric";
  let fid = `mt_${slug}`;
  let n = 2;
  while (used.has(fid)) fid = `mt_${slug}_${n++}`;
  return {
    fid,
    name: fid,
    displayName,
    analyticType: "measure",
    semanticType: "quantitative",
    dataType: "float",
    hidden: false,
    metric: { expr },
    profile: profileColumn([], { dataType: "float", semanticType: "quantitative" }),
  };
}

// ---------------------------------------------------------------------------
// 직렬화 — 컬럼 지향 JSON (PB file 필드의 정본 포맷)
// ---------------------------------------------------------------------------

interface SerializedTable {
  v: 1;
  rowCount: number;
  cols: Record<string, Scalar[]>;
}

export function serializeTable(table: DataTable): Blob {
  const payload: SerializedTable = { v: 1, rowCount: table.rowCount, cols: table.columns };
  return new Blob([JSON.stringify(payload)], { type: "application/json" });
}

export function deserializeTable(
  datasetId: string,
  fields: FieldMeta[],
  json: unknown,
): DataTable {
  const payload = json as SerializedTable;
  return {
    datasetId,
    fields,
    columns: payload.cols ?? {},
    rowCount: payload.rowCount ?? 0,
  };
}

// ---------------------------------------------------------------------------
// 품질 검사 (프로파일 탭 경고 배너 재료)
// ---------------------------------------------------------------------------

export interface QualityIssue {
  fid?: string;
  kind: "high-null" | "single-value" | "all-unique-string";
  message: string;
}

export function detectQualityIssues(table: DataTable): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const f of table.fields) {
    const p = f.profile;
    if (p.count === 0) continue;
    const nullRate = p.nullCount / p.count;
    if (nullRate > 0.3) {
      issues.push({
        fid: f.fid,
        kind: "high-null",
        message: `\`${f.displayName}\` 결측 ${Math.round(nullRate * 100)}%`,
      });
    }
    if (p.distinctCount === 1 && p.count > 1) {
      issues.push({ fid: f.fid, kind: "single-value", message: `\`${f.displayName}\` 단일 값` });
    }
    if (
      f.dataType === "string" &&
      p.distinctCount === p.count - p.nullCount &&
      p.count - p.nullCount > 50
    ) {
      issues.push({
        fid: f.fid,
        kind: "all-unique-string",
        message: `\`${f.displayName}\` 전행 고유 (ID 추정)`,
      });
    }
  }
  return issues;
}

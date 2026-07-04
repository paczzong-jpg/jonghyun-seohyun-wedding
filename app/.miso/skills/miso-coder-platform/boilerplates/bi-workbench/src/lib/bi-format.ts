/**
 * bi-format — 값 표시 포맷터. 엔진 결과(raw scalar)를 화면 문자열로.
 * temporal은 epoch ms number로 흐르므로 여기서만 날짜 문자열이 된다.
 */

import type { ChartStyle, DateUnit, FieldMeta, Scalar } from "./bi-types";

const NUM_COMPACT = new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 });
const NUM_COMMA = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });
const NUM_PERCENT = new Intl.NumberFormat("ko-KR", { style: "percent", maximumFractionDigits: 1 });
const NUM_CURRENCY = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });

export function formatNumber(value: number, format: ChartStyle["numberFormat"] = "auto"): string {
  if (!Number.isFinite(value)) return "—";
  switch (format) {
    case "comma":
      return NUM_COMMA.format(value);
    case "compact":
      return NUM_COMPACT.format(value);
    case "percent":
      return NUM_PERCENT.format(value);
    case "currency":
      return NUM_CURRENCY.format(value);
    default:
      return Math.abs(value) >= 10_000 ? NUM_COMPACT.format(value) : NUM_COMMA.format(value);
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

/** epoch ms → 단위에 맞는 라벨 (UTC 기준 — 엔진과 동일 규약) */
export function formatEpoch(epochMs: number, unit?: DateUnit): string {
  const d = new Date(epochMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  switch (unit) {
    case "year":
      return `${y}`;
    case "quarter":
      return `${y} Q${Math.floor((m - 1) / 3) + 1}`;
    case "month":
      return `${y}-${pad(m)}`;
    case "week":
    case "day":
      return `${y}-${pad(m)}-${pad(day)}`;
    case "hour":
      return `${pad(m)}-${pad(day)} ${pad(d.getUTCHours())}시`;
    default: {
      const hasTime = epochMs % 86_400_000 !== 0;
      return hasTime
        ? `${y}-${pad(m)}-${pad(day)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
        : `${y}-${pad(m)}-${pad(day)}`;
    }
  }
}

export const DOW_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

/** 필드 메타 기준 셀 값 포맷 (그리드·툴팁 공용) */
export function formatCell(value: Scalar, field?: FieldMeta): string {
  if (value === null || value === undefined) return "";
  if (field?.semanticType === "temporal" && typeof value === "number") {
    return formatEpoch(value);
  }
  if (typeof value === "number") {
    if (field?.semanticType === "nominal" || field?.semanticType === "ordinal") {
      return String(value);
    }
    return formatNumber(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

/** 축/범례 라벨 포맷 — 출력 컬럼이 dateTrunc/datePart/bin 결과일 수 있다 */
export function formatAxisValue(
  value: Scalar,
  opts: { unit?: DateUnit; part?: "dow" | "hour" | "month"; isTemporal?: boolean; binWidth?: number },
): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (opts.part === "dow") return DOW_LABELS[value] ?? String(value);
    if (opts.part === "hour") return `${value}시`;
    if (opts.part === "month") return `${value}월`;
    if (opts.unit || opts.isTemporal) return formatEpoch(value, opts.unit);
    if (opts.binWidth !== undefined) {
      return `${formatNumber(value)}–${formatNumber(value + opts.binWidth)}`;
    }
    return formatNumber(value);
  }
  return String(value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)}MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)}GB`;
}

export function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

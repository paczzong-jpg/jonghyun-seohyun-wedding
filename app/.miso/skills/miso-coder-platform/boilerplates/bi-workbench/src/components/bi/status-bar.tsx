/**
 * StatusBar — 전 탭 공통 상태 규약 (GOAL_UIUX §4·§12)
 * "1,204,331행 중 84,220행 · 쿼리 43ms · ◉ idle"
 */

import { cn } from "@/lib/utils";

export function StatusBar({
  totalRows,
  shownRows,
  resultLabel,
  elapsedMs,
  computing,
  note,
}: {
  totalRows: number;
  shownRows: number;
  /** 예: "36포인트" — 집계 결과 표현 (탐색 탭) */
  resultLabel?: string;
  elapsedMs?: number;
  computing?: boolean;
  note?: string;
}) {
  return (
    <div className="flex h-7 shrink-0 items-center gap-3 border-t border-border bg-muted/40 px-3 text-[11px] text-muted-foreground">
      <span className="tabular-nums">
        {totalRows.toLocaleString()}행 중 {shownRows.toLocaleString()}행
        {resultLabel ? ` → ${resultLabel}` : ""}
      </span>
      {elapsedMs !== undefined && <span className="tabular-nums">쿼리 {elapsedMs}ms</span>}
      {note && <span className="truncate">{note}</span>}
      <span className="ml-auto inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            computing ? "animate-pulse bg-chart-4 motion-reduce:animate-none" : "bg-chart-2",
          )}
        />
        {computing ? "computing" : "idle"}
      </span>
    </div>
  );
}

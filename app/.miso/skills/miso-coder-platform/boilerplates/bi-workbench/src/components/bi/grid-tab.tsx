/**
 * GridTab — 가상 스크롤 데이터그리드 (GOAL_UIUX §4)
 * 컬럼 지향 테이블을 인덱스로 직접 읽어 뷰포트 행만 렌더한다.
 */

import { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { DataTable, FieldMeta, FilterRule } from "@/lib/bi-types";
import { filterIndices, sortIndices } from "@/lib/bi-engine";
import { formatCell } from "@/lib/bi-format";
import { reprofileField } from "@/lib/bi-profile";
import { useUpdateDatasetFields } from "@/lib/bi-hooks";
import { FieldDetailSheet, FieldTypeIcon } from "./field-list-panel";
import { FilterBar } from "./filter-bar";
import { StatusBar } from "./status-bar";

const ROW_H = 32;
const OVERSCAN = 12;

interface SortState {
  fid: string;
  order: "asc" | "desc";
}

export function GridTab({
  table,
  filters,
  onFiltersChange,
}: {
  table: DataTable;
  filters: FilterRule[];
  onFiltersChange: (next: FilterRule[]) => void;
}) {
  const updateFields = useUpdateDatasetFields();
  const [sort, setSort] = useState<SortState | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  const [detailFid, setDetailFid] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 지표(metric)는 컬럼이 없으므로 그리드에서 제외
  const fields = useMemo(() => table.fields.filter((f) => !f.hidden && !f.metric), [table.fields]);

  const { indices, elapsedMs } = useMemo(() => {
    const started = performance.now();
    let idx = filterIndices(table, filters);
    if (sort) idx = sortIndices(table, idx, sort.fid, sort.order);
    return { indices: idx, elapsedMs: Math.round((performance.now() - started) * 10) / 10 };
  }, [table, filters, sort]);

  const total = indices.length;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const end = Math.min(total, Math.ceil((scrollTop + viewportH) / ROW_H) + OVERSCAN);

  const gridTemplate = `56px ${fields.map(() => "minmax(132px, 1fr)").join(" ")}`;

  const persistField = (next: FieldMeta) => {
    const nextFields = table.fields.map((f) => (f.fid === next.fid ? next : f));
    updateFields.mutate({ id: table.datasetId, fields: nextFields });
  };

  const headerCell = (f: FieldMeta) => {
    const active = sort?.fid === f.fid;
    return (
      <div key={f.fid} className="flex min-w-0 items-center border-r border-border/60 last:border-r-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-full min-w-0 flex-1 items-center gap-1.5 px-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <FieldTypeIcon field={f} />
              <span className="min-w-0 truncate text-xs font-medium">{f.displayName}</span>
              {active &&
                (sort!.order === "asc" ? (
                  <ArrowUp className="size-3 shrink-0 text-primary" />
                ) : (
                  <ArrowDown className="size-3 shrink-0 text-primary" />
                ))}
              <ChevronDown className="ml-auto size-3 shrink-0 text-muted-foreground/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onSelect={() => setSort({ fid: f.fid, order: "asc" })}>
              <ArrowUp className="size-4" /> 오름차순 정렬
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSort({ fid: f.fid, order: "desc" })}>
              <ArrowDown className="size-4" /> 내림차순 정렬
            </DropdownMenuItem>
            {active && <DropdownMenuItem onSelect={() => setSort(null)}>정렬 해제</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setDetailFid(f.fid)}>필드 상세·편집</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => persistField({ ...f, hidden: true })}>
              <EyeOff className="size-4" /> 숨기기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const rows: React.ReactNode[] = [];
  for (let r = start; r < end; r++) {
    const rowIdx = indices[r];
    rows.push(
      <div
        key={r}
        className={cn(
          "grid items-center border-b border-border/40 text-xs",
          r % 2 === 1 && "bg-muted/25",
        )}
        style={{ gridTemplateColumns: gridTemplate, height: ROW_H, transform: `translateY(${r * ROW_H}px)`, position: "absolute", left: 0, right: 0, top: 0 }}
      >
        <div className="px-2.5 text-right tabular-nums text-muted-foreground/60">{r + 1}</div>
        {fields.map((f) => {
          const v = table.columns[f.fid]?.[rowIdx] ?? null;
          return (
            <div
              key={f.fid}
              className={cn(
                "truncate px-2.5 tabular-nums",
                f.analyticType === "measure" && "text-right",
                v === null && "text-muted-foreground/40",
              )}
              title={v === null ? undefined : formatCell(v, f)}
            >
              {v === null ? "∅" : formatCell(v, f)}
            </div>
          );
        })}
      </div>,
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border px-3 py-1.5">
        <FilterBar table={table} filters={filters} onChange={onFiltersChange} />
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto"
        onScroll={(e) => {
          setScrollTop(e.currentTarget.scrollTop);
          if (e.currentTarget.clientHeight !== viewportH) setViewportH(e.currentTarget.clientHeight);
        }}
      >
        <div className="min-w-fit">
          <div
            className="sticky top-0 z-10 grid h-9 border-b border-border bg-muted/90 backdrop-blur"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div className="border-r border-border/60 px-2.5 text-right text-[10px] leading-9 text-muted-foreground">
              #
            </div>
            {fields.map(headerCell)}
          </div>
          <div className="relative" style={{ height: total * ROW_H }}>
            {rows}
          </div>
          {total === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
              필터 조합에 해당하는 데이터가 없습니다
              {filters.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => onFiltersChange(filters.slice(0, -1))}>
                  마지막 필터 해제
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      <StatusBar
        totalRows={table.rowCount}
        shownRows={total}
        elapsedMs={elapsedMs}
        note={sort ? `${table.fields.find((f) => f.fid === sort.fid)?.displayName} ${sort.order === "asc" ? "↑" : "↓"}` : undefined}
      />
      <FieldDetailSheet
        table={table}
        fid={detailFid}
        onClose={() => setDetailFid(null)}
        onSave={(next) => persistField(reprofileField(table, next))}
      />
    </div>
  );
}

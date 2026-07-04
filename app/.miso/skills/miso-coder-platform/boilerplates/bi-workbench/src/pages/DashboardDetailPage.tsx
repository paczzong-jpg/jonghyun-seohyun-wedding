/**
 * DashboardDetailPage — 위젯 그리드 + 전역 필터 + 크로스필터 (GOAL_UIUX §8)
 * 위젯은 12컬럼 그리드에 order+span으로 배치. 편집 모드에서 드래그 재배치·크기 변경.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  Compass,
  Filter as FilterIcon,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Scaling,
  Type,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type {
  BiChartRecord,
  DashboardConfig,
  DashboardWidget,
  DataTable,
  FieldMeta,
  FilterRule,
} from "@/lib/bi-types";
import { useCharts, useDashboardBundle, useSaveDashboard } from "@/lib/bi-hooks";
import { partsToFilterRules } from "@/lib/bi-explain";
import { BiChart, type DatumClickPayload } from "@/components/bi/bi-chart";
import { FreeGrid, layoutPass, normalizeIfOverlapping, type DragHandleProps } from "@/components/bi/dashboard-grid";
import { FieldFilterEditor, filterLabel } from "@/components/bi/filter-bar";
import { FieldTypeIcon } from "@/components/bi/field-list-panel";

interface CrossFilterState {
  fromWidgetId: string;
  rules: FilterRule[];
  label: string;
}

const SIZE_PRESETS: { label: string; w: number; h: number }[] = [
  { label: "KPI (3×2)", w: 3, h: 2 },
  { label: "작게 (4×4)", w: 4, h: 4 },
  { label: "중간 (6×4)", w: 6, h: 4 },
  { label: "넓게 (8×5)", w: 8, h: 5 },
  { label: "전체 폭 (12×5)", w: 12, h: 5 },
];

function WidgetFrame({
  widget,
  chart,
  table,
  editing,
  extraFilters,
  crossActive,
  onDatumClick,
  onRemove,
  onResize,
  onTextChange,
  dragHandle,
}: {
  widget: DashboardWidget;
  chart?: BiChartRecord;
  table?: DataTable;
  editing: boolean;
  extraFilters: FilterRule[];
  crossActive: boolean;
  onDatumClick?: (p: DatumClickPayload) => void;
  onRemove: () => void;
  onResize: (w: number, h: number) => void;
  onTextChange: (text: string) => void;
  dragHandle: DragHandleProps | null;
}) {
  const title = widget.kind === "text" ? null : chart?.name ?? "삭제된 차트";

  return (
    <Card
      className={cn(
        "bi-hairline relative flex h-full min-h-0 flex-col gap-0 overflow-hidden border-0 p-0 transition-shadow",
        crossActive && "ring-2 ring-ring",
      )}
    >
      <div
        className={cn(
          "flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2.5",
          editing && "cursor-grab active:cursor-grabbing",
        )}
        {...(dragHandle ?? {})}
      >
        {editing && <GripVertical className="size-3.5 shrink-0 text-muted-foreground/60" />}
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {title ?? "텍스트"}
        </span>
        {editing && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6" aria-label="위젯 크기">
                  <Scaling className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>크기</DropdownMenuLabel>
                {SIZE_PRESETS.map((p) => (
                  <DropdownMenuItem key={p.label} onSelect={() => onResize(p.w, p.h)}>
                    {p.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {chart && table && (
              <Button variant="ghost" size="icon" className="size-6" asChild>
                <Link to={`/viz/${chart.datasetId}?chart=${chart.id}`} aria-label="탐색에서 열기">
                  <Compass className="size-3.5" />
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="size-6" aria-label="위젯 제거" onClick={onRemove}>
              <X className="size-3.5" />
            </Button>
          </>
        )}
      </div>
      <div className="min-h-0 flex-1 p-2">
        {widget.kind === "text" ? (
          editing ? (
            <Textarea
              value={widget.text ?? ""}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="메모를 입력하세요…"
              aria-label="텍스트 위젯 내용"
              className="h-full resize-none border-none text-sm shadow-none focus-visible:ring-0"
            />
          ) : (
            <div className="h-full overflow-auto whitespace-pre-wrap px-1 text-sm text-foreground/90">
              {widget.text || <span className="text-muted-foreground">빈 텍스트</span>}
            </div>
          )
        ) : chart && table ? (
          <BiChart
            table={table}
            spec={chart.spec}
            extraFilters={extraFilters}
            onDatumClick={onDatumClick}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <AlertCircle className="size-4" />
            <span className="text-xs">차트 또는 데이터셋이 삭제되었습니다</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export function DashboardDetailPage() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useDashboardBundle(dashboardId);
  const saveDashboard = useSaveDashboard();

  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);
  const [cross, setCross] = useState<CrossFilterState | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [globalPicking, setGlobalPicking] = useState<{ field: FieldMeta; datasetId: string } | null>(null);
  const [globalOpen, setGlobalOpen] = useState(false);

  useEffect(() => {
    if (data && config === null) {
      setConfig({
        ...data.dashboard.config,
        widgets: normalizeIfOverlapping(data.dashboard.config.widgets),
      });
      setName(data.dashboard.name);
    }
  }, [data, config]);

  const chartById = useMemo(() => {
    const m = new Map<string, BiChartRecord>();
    for (const c of data?.charts ?? []) m.set(c.id, c);
    return m;
  }, [data]);

  // 전역 필터 후보 필드: 위젯 데이터셋들의 dimension
  const globalFields = useMemo(() => {
    if (!data) return [];
    const out: { field: FieldMeta; datasetId: string; datasetName: string }[] = [];
    for (const [dsId, table] of Object.entries(data.tables)) {
      for (const f of table.fields) {
        if (f.hidden || f.analyticType !== "dimension") continue;
        out.push({ field: f, datasetId: dsId, datasetName: data.datasets[dsId]?.name ?? dsId });
      }
    }
    return out;
  }, [data]);

  if (isLoading || !data || !config) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const persist = (next: DashboardConfig, nextName = name) => {
    setConfig(next);
    saveDashboard.mutate(
      { id: data.dashboard.id, name: nextName, config: next },
      { onError: () => toast.error("저장에 실패했습니다") },
    );
  };

  const extraFiltersFor = (widget: DashboardWidget): FilterRule[] => {
    const chart = widget.chartId ? chartById.get(widget.chartId) : undefined;
    const table = chart ? data.tables[chart.datasetId] : undefined;
    if (!table) return [];
    const rules: FilterRule[] = [];
    for (const g of config.globalFilters) {
      if (table.fields.some((f) => f.fid === g.rule.fid)) rules.push(g.rule);
    }
    if (cross && config.crossFilter && cross.fromWidgetId !== widget.id) {
      for (const r of cross.rules) {
        if (table.fields.some((f) => f.fid === r.fid)) rules.push(r);
      }
    }
    return rules;
  };

  const addTextWidget = () => {
    persist({
      ...config,
      widgets: [
        ...config.widgets,
        { id: `w_${Date.now().toString(36)}`, kind: "text", text: "", layout: { x: 0, y: 0, w: 4, h: 2 } },
      ],
    });
    setAddOpen(false);
    setEditing(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 헤더 */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <Button variant="ghost" size="icon" className="size-7" asChild>
          <Link to="/dash" aria-label="대시보드 목록으로">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        {nameEditing ? (
          <Input
            autoFocus
            aria-label="대시보드 이름"
            name="dashboard-name"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setNameEditing(false);
              if (name.trim()) persist(config, name.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="h-8 w-64"
          />
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold hover:bg-muted"
            onClick={() => setNameEditing(true)}
          >
            {name}
            <Pencil className="size-3 text-muted-foreground" />
          </button>
        )}
        <div className="flex-1" />
        {editing && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" /> 위젯
          </Button>
        )}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
          {(["보기", "편집"] as const).map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setEditing(i === 1)}
              className={cn(
                "rounded-md px-3 py-1 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                (i === 1) === editing
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 전역 필터 바 */}
      <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-1.5 border-b border-border px-3 py-1.5">
        <FilterIcon className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">전역 필터</span>
        {config.globalFilters.map((g, i) => {
          const table = data.tables[g.datasetId];
          return (
            <span
              key={i}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-secondary px-2 text-xs font-medium text-secondary-foreground"
            >
              {table ? filterLabel(g.rule, table.fields) : "…"}
              <button
                type="button"
                aria-label="전역 필터 제거"
                className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() =>
                  persist({ ...config, globalFilters: config.globalFilters.filter((_, j) => j !== i) })
                }
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          );
        })}
        <Popover
          open={globalOpen}
          onOpenChange={(v) => {
            setGlobalOpen(v);
            if (!v) setGlobalPicking(null);
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground">
              <Plus className="size-3.5" /> 추가
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-3">
            {!globalPicking ? (
              <Command className="w-64">
                <CommandInput placeholder="필드 선택…" />
                <CommandList className="max-h-56">
                  <CommandEmpty>
                    {globalFields.length === 0 ? "위젯을 먼저 추가하세요" : "결과 없음"}
                  </CommandEmpty>
                  <CommandGroup>
                    {globalFields.map((g) => (
                      <CommandItem
                        key={`${g.datasetId}-${g.field.fid}`}
                        value={`${g.field.displayName} ${g.datasetName}`}
                        onSelect={() => setGlobalPicking({ field: g.field, datasetId: g.datasetId })}
                      >
                        <FieldTypeIcon field={g.field} />
                        {g.field.displayName}
                        <span className="ml-auto pl-2 text-[10px] text-muted-foreground">{g.datasetName}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            ) : (
              <FieldFilterEditor
                table={data.tables[globalPicking.datasetId]}
                field={globalPicking.field}
                onApply={(rule) => {
                  persist({
                    ...config,
                    globalFilters: [...config.globalFilters, { datasetId: globalPicking.datasetId, rule }],
                  });
                  setGlobalOpen(false);
                  setGlobalPicking(null);
                }}
              />
            )}
          </PopoverContent>
        </Popover>
        {cross && (
          <span className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md bg-primary/10 px-2 text-xs font-medium text-primary">
            크로스필터: {cross.label}
            <button
              type="button"
              aria-label="크로스필터 해제"
              className="rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setCross(null)}
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        )}
      </div>

      {/* 위젯 그리드 */}
      <div className="bi-dots min-h-0 flex-1 overflow-y-auto p-4">
        {config.widgets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-center">
            <div className="text-sm font-medium text-muted-foreground">위젯이 없습니다</div>
            <div className="text-xs text-muted-foreground/70">
              탐색 탭에서 차트를 만들어 "대시보드에 추가"하거나, 편집 모드에서 위젯을 추가하세요.
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" /> 위젯 추가
            </Button>
          </div>
        ) : (
          <FreeGrid
            widgets={config.widgets}
            editing={editing}
            onCommit={(widgets) => persist({ ...config, widgets })}
            renderWidget={(w, dragHandle) => {
              const chart = w.chartId ? chartById.get(w.chartId) : undefined;
              const table = chart ? data.tables[chart.datasetId] : undefined;
              return (
                <WidgetFrame
                  widget={w}
                  dragHandle={dragHandle}
                  chart={chart}
                  table={table}
                  editing={editing}
                  extraFilters={extraFiltersFor(w)}
                  crossActive={cross?.fromWidgetId === w.id}
                  onDatumClick={
                    config.crossFilter && !editing
                      ? (p) => {
                          if (cross?.fromWidgetId === w.id) {
                            setCross(null);
                            return;
                          }
                          setCross({
                            fromWidgetId: w.id,
                            rules: partsToFilterRules(p.parts),
                            label: p.parts.map((part) => `${part.label}=${part.valueLabel}`).join(" · "),
                          });
                        }
                      : undefined
                  }
                  onRemove={() =>
                    persist({ ...config, widgets: config.widgets.filter((x) => x.id !== w.id) })
                  }
                  onResize={(width, height) =>
                    persist({
                      ...config,
                      widgets: layoutPass(config.widgets, w.id, { ...w.layout, w: width, h: height }),
                    })
                  }
                  onTextChange={(text) =>
                    persist({
                      ...config,
                      widgets: config.widgets.map((x) => (x.id === w.id ? { ...x, text } : x)),
                    })
                  }
                />
              );
            }}
          />
        )}
      </div>

      {/* 위젯 추가 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>위젯 추가</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Button variant="outline" className="justify-start" onClick={addTextWidget}>
              <Type className="size-4 text-muted-foreground" /> 텍스트 블록
            </Button>
            <div className="pt-1 text-xs font-medium text-muted-foreground">저장된 차트</div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {(data.charts.length > 0 ? data.charts : []).map((c) => (
                <Button
                  key={c.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    persist({
                      ...config,
                      widgets: [
                        ...config.widgets,
                        {
                          id: `w_${Date.now().toString(36)}`,
                          kind: "chart",
                          chartId: c.id,
                          layout: { x: 0, y: 0, w: c.spec.markType === "kpi" ? 3 : 6, h: c.spec.markType === "kpi" ? 2 : 4 },
                        },
                      ],
                    });
                    setAddOpen(false);
                  }}
                >
                  {c.name}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {data.datasets[c.datasetId]?.name}
                  </span>
                </Button>
              ))}
              <AllChartsPicker
                excludeIds={new Set(data.charts.map((c) => c.id))}
                onPick={(c) => {
                  persist({
                    ...config,
                    widgets: [
                      ...config.widgets,
                      {
                        id: `w_${Date.now().toString(36)}`,
                        kind: "chart",
                        chartId: c.id,
                        layout: { x: 0, y: 0, w: c.spec.markType === "kpi" ? 3 : 6, h: c.spec.markType === "kpi" ? 2 : 4 },
                      },
                    ],
                  });
                  setAddOpen(false);
                }}
              />
            </div>
            <div className="pt-1 text-xs text-muted-foreground">
              새 차트가 필요하면{" "}
              <button type="button" className="rounded-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate("/")}>
                데이터셋 탐색
              </button>
              에서 만들어 추가하세요.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 대시보드에 아직 없는 저장 차트까지 모두 보여주는 picker */
function AllChartsPicker({
  excludeIds,
  onPick,
}: {
  excludeIds: Set<string>;
  onPick: (c: BiChartRecord) => void;
}) {
  const { data: all } = useCharts();
  const rest = (all ?? []).filter((c) => !excludeIds.has(c.id));
  if (rest.length === 0 && excludeIds.size > 0) return null;
  if (rest.length === 0)
    return <div className="py-2 text-center text-xs text-muted-foreground">저장된 차트가 없습니다</div>;
  return (
    <>
      {rest.map((c) => (
        <Button key={c.id} variant="outline" className="w-full justify-start" onClick={() => onPick(c)}>
          {c.name}
        </Button>
      ))}
    </>
  );
}

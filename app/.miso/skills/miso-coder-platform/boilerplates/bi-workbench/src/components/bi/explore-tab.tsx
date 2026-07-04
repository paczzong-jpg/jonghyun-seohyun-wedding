/**
 * ExploreTab — 인코딩 shelf 탐색기 (GOAL_UIUX §5)
 * 필드 드래그 → 즉시 쿼리·렌더. undo/redo, URL 동기화, 차트 저장.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  BookmarkPlus,
  ChartArea,
  ChartBar,
  ChartColumnBig,
  ChartLine,
  ChartPie,
  ChartCandlestick,
  ChartScatter,
  Filter as FilterIcon,
  Grid3x3,
  LayoutDashboard,
  Redo2,
  Save,
  SquareSigma,
  Table2,
  TrendingUp,
  Undo2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  BiDatasetRecord,
  ChartSpec,
  DataTable,
  Encoding,
  MarkType,
} from "@/lib/bi-types";
import {
  decodeSpecParam,
  defaultBucketFor,
  emptyChartSpec,
  encodeSpecParam,
  fieldOf,
  resolveAutoMark,
} from "@/lib/bi-derive";
import { useChartComputation, useCharts, useSaveChart } from "@/lib/bi-hooks";
import { fallbackRecommendations } from "@/lib/bi-insights";
import { partsToFilterRules } from "@/lib/bi-explain";
import { BiChart, type DatumClickPayload } from "./bi-chart";
import { FilterBar } from "./filter-bar";
import { StatusBar } from "./status-bar";
import { AddToDashboardDialog } from "./add-to-dashboard-dialog";
import { ExplainSheet } from "./explain-sheet";
import { CHANNELS, ShelfRow, type ChannelId } from "./explore-shelf";

const MARKS: { value: MarkType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "auto", label: "자동", icon: Wand2 },
  { value: "bar", label: "막대", icon: ChartColumnBig },
  { value: "line", label: "선", icon: ChartLine },
  { value: "area", label: "영역", icon: ChartArea },
  { value: "point", label: "산점도", icon: ChartScatter },
  { value: "rect", label: "히트맵", icon: Grid3x3 },
  { value: "boxplot", label: "박스플롯", icon: ChartCandlestick },
  { value: "arc", label: "도넛", icon: ChartPie },
  { value: "kpi", label: "KPI", icon: SquareSigma },
  { value: "table", label: "테이블", icon: Table2 },
];

// ---------------------------------------------------------------------------
// Explorer 메인
// ---------------------------------------------------------------------------

export function ExploreTab({ record, table }: { record: BiDatasetRecord; table: DataTable }) {
  const datasetId = table.datasetId;
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: savedCharts } = useCharts(datasetId);
  const saveChart = useSaveChart();

  const [spec, setSpecState] = useState<ChartSpec>(() => {
    const fromUrl = searchParams.get("spec");
    return (fromUrl && decodeSpecParam(fromUrl)) || emptyChartSpec(datasetId);
  });
  const [chartId, setChartId] = useState<string | null>(searchParams.get("chart"));
  const [chartName, setChartName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);
  const [selection, setSelection] = useState<DatumClickPayload | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);

  const undoStack = useRef<ChartSpec[]>([]);
  const redoStack = useRef<ChartSpec[]>([]);
  const loadedChartRef = useRef<string | null>(null);

  // 저장 차트 열기 (?chart=)
  useEffect(() => {
    const id = searchParams.get("chart");
    if (id && id !== loadedChartRef.current && savedCharts) {
      const record = savedCharts.find((c) => c.id === id);
      if (record) {
        loadedChartRef.current = id;
        setChartId(id);
        setChartName(record.name);
        setSpecState({ ...record.spec, datasetId });
        undoStack.current = [];
        redoStack.current = [];
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedCharts, searchParams]);

  const setSpec = useCallback(
    (next: ChartSpec, { resetHistory = false }: { resetHistory?: boolean } = {}) => {
      setSpecState((prev) => {
        if (resetHistory) {
          undoStack.current = [];
        } else {
          undoStack.current.push(prev);
          if (undoStack.current.length > 100) undoStack.current.shift();
        }
        redoStack.current = [];
        return next;
      });
      setSelection(null);
      setSearchParams(
        (params) => {
          params.set("spec", encodeSpecParam(next));
          params.delete("chart");
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setSpecState((cur) => {
      redoStack.current.push(cur);
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    setSpecState((cur) => {
      undoStack.current.push(cur);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setSaveOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // AI 패널·AutoPilot 등 외부에서 ?spec= 으로 캔버스를 열 때 반영 (undo 가능)
  useEffect(() => {
    const param = searchParams.get("spec");
    if (!param) return;
    setSpecState((prev) => {
      if (param === encodeSpecParam(prev)) return prev;
      const decoded = decodeSpecParam(param);
      if (!decoded) return prev;
      undoStack.current.push(prev);
      redoStack.current = [];
      return { ...decoded, datasetId };
    });
    setSelection(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const computation = useChartComputation(table, spec);
  const resolvedMark = resolveAutoMark(spec, table.fields);
  const quickStarts = useMemo(() => fallbackRecommendations(table), [table]);

  // 채널 조작
  const encFor = (ch: ChannelId): Encoding[] => {
    if (ch === "y") return spec.encodings.y ?? [];
    const e = spec.encodings[ch];
    return e ? [e] : [];
  };
  const setChannel = (ch: ChannelId, list: Encoding[]) => {
    const encodings = { ...spec.encodings };
    if (ch === "y") encodings.y = list.length ? list : undefined;
    else encodings[ch] = list[0];
    if (ch !== "y" && list.length === 0) delete encodings[ch];
    setSpec({ ...spec, encodings });
  };
  const addToChannel = (ch: ChannelId, fid: string) => {
    const field = fieldOf(table.fields, fid);
    if (!field) return;
    const enc = ch === "x" || ch === "y" ? defaultBucketFor(field) : { fid };
    // color/size에 temporal bucket 불필요
    const cleaned = ch === "color" || ch === "size" ? { fid } : enc;
    setChannel(ch, channelDef(ch).multi ? [...encFor(ch), cleaned] : [cleaned]);
  };
  const channelDef = (ch: ChannelId) => CHANNELS.find((c) => c.id === ch)!;

  const showStack =
    (resolvedMark === "bar" || resolvedMark === "area") &&
    (spec.encodings.color || (spec.encodings.y?.length ?? 0) > 1);

  // 시계열 변환: temporal x + 라인/영역
  const xField = fieldOf(table.fields, spec.encodings.x?.fid ?? "");
  const xIsTemporal =
    xField?.semanticType === "temporal" ||
    Boolean(spec.encodings.x?.bucket && "unit" in (spec.encodings.x.bucket ?? {}));
  const showTimeSeries = xIsTemporal && (resolvedMark === "line" || resolvedMark === "area");
  const tsActive = (spec.timeSeries?.movingAvg ?? 0) >= 2 || (spec.timeSeries?.forecast ?? 0) >= 1;

  const applySelectionFilter = () => {
    if (!selection) return;
    setSpec({ ...spec, filters: [...spec.filters, ...partsToFilterRules(selection.parts)] });
  };

  const doSave = async () => {
    const name = chartName.trim();
    if (!name) return;
    try {
      const saved = await saveChart.mutateAsync({
        id: chartId ?? undefined,
        datasetId,
        name,
        spec: { ...spec, meta: { ...spec.meta, title: name } },
      });
      setChartId(saved.id);
      loadedChartRef.current = saved.id;
      setSaveOpen(false);
      setSearchParams(
        (params) => {
          params.set("chart", saved.id);
          params.delete("spec");
          return params;
        },
        { replace: true },
      );
      toast.success(`“${name}” 차트를 저장했습니다`);
    } catch {
      toast.error("차트 저장에 실패했습니다");
    }
  };

  const hasEncodings =
    Boolean(spec.encodings.x) || (spec.encodings.y?.length ?? 0) > 0 || Boolean(spec.encodings.color);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 툴바 */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border px-3 py-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7" aria-label="실행 취소" onClick={undo} disabled={undoStack.current.length === 0}>
              <Undo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>실행 취소 (⌘Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7" aria-label="다시 실행" onClick={redo} disabled={redoStack.current.length === 0}>
              <Redo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>다시 실행 (⌘⇧Z)</TooltipContent>
        </Tooltip>
        <div className="mx-1 h-4 w-px bg-border" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              {(() => {
                const m = MARKS.find((m) => m.value === spec.markType)!;
                const Icon = m.icon;
                return (
                  <>
                    <Icon className="size-3.5" />
                    {m.label}
                    {spec.markType === "auto" && (
                      <span className="text-muted-foreground">
                        → {MARKS.find((m) => m.value === resolvedMark)?.label}
                      </span>
                    )}
                  </>
                );
              })()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={spec.markType}
              onValueChange={(v) => setSpec({ ...spec, markType: v as MarkType })}
            >
              {MARKS.map((m) => (
                <DropdownMenuRadioItem key={m.value} value={m.value}>
                  <m.icon className="mr-1 size-4" /> {m.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {showStack && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                <ChartBar className="size-3.5" />
                {spec.stack === "none" ? "나란히" : spec.stack === "stack" ? "누적" : "100%"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup
                value={spec.stack}
                onValueChange={(v) => setSpec({ ...spec, stack: v as ChartSpec["stack"] })}
              >
                <DropdownMenuRadioItem value="none">나란히</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="stack">누적</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="normalize">100% 비율</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {showTimeSeries && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={tsActive ? "default" : "outline"}
                size="sm"
                className="h-7 gap-1.5 text-xs"
              >
                <TrendingUp className="size-3.5" /> 시계열
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>이동평균</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={String(spec.timeSeries?.movingAvg ?? 0)}
                onValueChange={(v) =>
                  setSpec({ ...spec, timeSeries: { ...spec.timeSeries, movingAvg: Number(v) } })
                }
              >
                <DropdownMenuRadioItem value="0">없음</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="3">3구간</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="6">6구간</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="12">12구간</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>예측(선형)</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={String(spec.timeSeries?.forecast ?? 0)}
                onValueChange={(v) =>
                  setSpec({ ...spec, timeSeries: { ...spec.timeSeries, forecast: Number(v) } })
                }
              >
                <DropdownMenuRadioItem value="0">없음</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="3">3기간</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="6">6기간</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="12">12기간</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className="flex-1" />
        {(savedCharts?.length ?? 0) > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
                <BookmarkPlus className="size-3.5" /> 저장된 차트 ({savedCharts!.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {savedCharts!.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onSelect={() => {
                    loadedChartRef.current = null;
                    setSearchParams({ chart: c.id });
                  }}
                >
                  <ChartLine className="size-4 text-muted-foreground" /> {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          disabled={!hasEncodings}
          onClick={() => setDashOpen(true)}
        >
          <LayoutDashboard className="size-3.5" /> 대시보드에 추가
        </Button>
        <Button
          size="sm"
          className="h-7 gap-1.5 text-xs"
          disabled={!hasEncodings}
          onClick={() => {
            if (!chartName) setChartName(spec.meta.title ?? "");
            setSaveOpen(true);
          }}
        >
          <Save className="size-3.5" /> {chartId ? "저장" : "차트 저장"}
        </Button>
      </div>

      {/* Shelf */}
      <div className="shrink-0 space-y-1.5 border-b border-border px-3 py-2.5">
        {CHANNELS.map((ch) => (
          <ShelfRow
            key={ch.id}
            channel={ch}
            encodings={encFor(ch.id)}
            table={table}
            onAdd={(fid) => addToChannel(ch.id, fid)}
            onChange={(i, next) => {
              const list = [...encFor(ch.id)];
              list[i] = next;
              setChannel(ch.id, list);
            }}
            onRemove={(i) => setChannel(ch.id, encFor(ch.id).filter((_, j) => j !== i))}
          />
        ))}
        <div className="flex items-center gap-2">
          <div className="w-9 shrink-0 text-right">
            <FilterIcon className="ml-auto size-3.5 text-muted-foreground" />
          </div>
          <FilterBar
            table={table}
            filters={spec.filters}
            onChange={(filters) => setSpec({ ...spec, filters })}
            className="flex-1"
          />
        </div>
      </div>

      {/* 선택 컨텍스트 */}
      {selection && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-primary/5 px-3 py-1.5 text-xs">
          <span className="font-medium">
            {selection.parts.map((p) => `${p.label} = ${p.valueLabel}`).join(" · ")}
          </span>
          <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={applySelectionFilter}>
            이 값으로 필터
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 gap-1 px-2 text-[11px] text-primary"
            onClick={() => setExplainOpen(true)}
          >
            <Wand2 className="size-3" /> 왜?
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setSelection(null)}>
            해제
          </Button>
        </div>
      )}

      {/* 캔버스 */}
      <div className="min-h-0 flex-1 p-3">
        {!hasEncodings ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border">
            <div className="text-center">
              <div className="text-sm font-medium text-muted-foreground">
                좌측 필드를 X·Y로 끌어오면 차트가 그려집니다
              </div>
              <div className="mt-1 text-xs text-muted-foreground/70">또는 아래 추천으로 바로 시작</div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 px-6">
              {quickStarts.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setSpec({ ...q.spec, datasetId })}
                >
                  {q.title}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <BiChart
            table={table}
            spec={spec}
            computation={computation}
            onDatumClick={setSelection}
            className="rounded-xl border border-border bg-card p-2"
          />
        )}
      </div>

      <StatusBar
        totalRows={table.rowCount}
        shownRows={computation.result ? computation.result.totalRows : table.rowCount}
        resultLabel={
          computation.result && computation.derived?.mark !== "table"
            ? `${computation.result.rows.length.toLocaleString()}포인트`
            : undefined
        }
        elapsedMs={computation.result?.elapsedMs}
      />

      {/* 저장 다이얼로그 */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{chartId ? "차트 저장" : "새 차트로 저장"}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={chartName}
            onChange={(e) => setChartName(e.target.value)}
            placeholder="예: 월별 매출 추이"
            name="chart-name"
            autoComplete="off"
            onKeyDown={(e) => e.key === "Enter" && void doSave()}
          />
          <DialogFooter>
            {chartId && (
              <Button
                variant="outline"
                onClick={() => {
                  setChartId(null);
                  void doSave();
                }}
              >
                새 차트로
              </Button>
            )}
            <Button disabled={!chartName.trim()} onClick={() => void doSave()}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddToDashboardDialog
        open={dashOpen}
        onOpenChange={setDashOpen}
        datasetId={datasetId}
        spec={spec}
        chartId={chartId}
        chartName={chartName || spec.meta.title || "새 차트"}
      />

      {selection && (
        <ExplainSheet
          open={explainOpen}
          onOpenChange={setExplainOpen}
          record={record}
          table={table}
          spec={spec}
          parts={selection.parts}
          onOpenSpec={(next) => setSpec({ ...next, datasetId })}
        />
      )}
    </div>
  );
}

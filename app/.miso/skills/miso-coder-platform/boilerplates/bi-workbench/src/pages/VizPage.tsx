/**
 * VizPage — Visualization 메뉴 (GOAL v2.1)
 * 데이터셋 선택 → 인코딩 shelf 탐색기(ExploreTab) + AI 챗 패널.
 */

import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ChartLine,
  ChevronDown,
  Database,
  Loader2,
  PanelLeft,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ChartSpec } from "@/lib/bi-types";
import { useCharts, useDatasets, useDatasetTable } from "@/lib/bi-hooks";
import { decodeSpecParam, encodeSpecParam } from "@/lib/bi-derive";
import { FieldListPanel } from "@/components/bi/field-list-panel";
import { ExploreTab } from "@/components/bi/explore-tab";
import { AiPanel } from "@/components/bi/ai-panel";

/** 데이터셋 미선택 시 — 선택 화면 */
function DatasetPicker() {
  const navigate = useNavigate();
  const { data: datasets, isLoading } = useDatasets();

  return (
    <div className="bi-dots h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/12">
            <ChartLine className="size-5 text-primary" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">어떤 데이터를 시각화할까요?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            데이터셋을 고르면 인코딩 shelf 탐색기가 열립니다.
          </p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (datasets?.length ?? 0) === 0 ? (
          <div className="text-center text-sm text-muted-foreground">
            아직 데이터셋이 없습니다 —{" "}
            <Link to="/data" className="rounded-sm text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Data에서 업로드
            </Link>
            하세요.
          </div>
        ) : (
          <div className="bi-stagger grid grid-cols-1 gap-3 sm:grid-cols-2">
            {datasets!.map((d) => (
              <Card
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/viz/${d.id}`)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/viz/${d.id}`)}
                className="bi-hairline cursor-pointer flex-row items-center gap-3 border-0 p-4 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Database className="size-4 text-secondary-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{d.name}</div>
                  <div className="text-xs tabular-nums text-muted-foreground">
                    {d.rowCount.toLocaleString()}행 · {d.fields.length}열
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function VizPage() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading, error } = useDatasetTable(datasetId);
  const { data: datasets } = useDatasets();
  const { data: savedCharts } = useCharts(datasetId);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  if (!datasetId) return <DatasetPicker />;

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <div className="text-sm text-muted-foreground">데이터셋 로드 중…</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <AlertCircle className="size-6 text-destructive" />
        <div className="text-sm text-muted-foreground">데이터셋을 불러오지 못했습니다</div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/viz">다른 데이터셋 선택</Link>
        </Button>
      </div>
    );
  }

  const { record, table } = data;
  const specParam = searchParams.get("spec");
  const chartParam = searchParams.get("chart");
  const currentSpec: ChartSpec | null =
    (specParam ? decodeSpecParam(specParam) : null) ??
    savedCharts?.find((c) => c.id === chartParam)?.spec ??
    null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setPanelCollapsed((v) => !v)}
          aria-label="필드 패널 접기/펼치기"
        >
          <PanelLeft className="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 font-semibold">
              <Database className="size-3.5 text-muted-foreground" />
              {record.name}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {(datasets ?? []).map((d) => (
              <DropdownMenuItem
                key={d.id}
                onSelect={() => navigate(`/viz/${d.id}`)}
                className={cn(d.id === record.id && "bg-secondary")}
              >
                {d.name}
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  {d.rowCount.toLocaleString()}행
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-xs tabular-nums text-muted-foreground">
          {record.rowCount.toLocaleString()}행
        </span>
        <div className="flex-1" />
        <Button
          variant={aiOpen ? "secondary" : "outline"}
          size="sm"
          className={cn("h-8 gap-1.5", !aiOpen && "text-primary")}
          onClick={() => setAiOpen((v) => !v)}
        >
          <Sparkles className="size-4" /> AI
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        {!panelCollapsed && (
          <aside className="w-60 shrink-0 border-r border-border">
            <FieldListPanel table={table} />
          </aside>
        )}
        <div className="min-w-0 flex-1">
          <ExploreTab record={record} table={table} />
        </div>
        {aiOpen && (
          <aside className="w-[360px] shrink-0 border-l border-border">
            <AiPanel
              record={record}
              table={table}
              currentSpec={currentSpec}
              onOpenSpec={(next) =>
                navigate(`/viz/${record.id}?spec=${encodeSpecParam({ ...next, datasetId: record.id })}`)
              }
            />
          </aside>
        )}
      </div>
    </div>
  );
}

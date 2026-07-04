/**
 * ExplainSheet — "왜?" 응답 카드 (GOAL §8.5)
 * 기여도 분해(로컬 통계)는 항상 표시되고, LLM 서사는 위에 얹힌다.
 */

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { BiDatasetRecord, ChartSpec, DataTable } from "@/lib/bi-types";
import {
  explainSelection,
  type ExplainFactor,
  type ExplainResult,
  type SelectionPart,
} from "@/lib/bi-explain";
import { explainNarrative } from "@/lib/bi-ai";
import { formatNumber } from "@/lib/bi-format";
import { BiChart } from "./bi-chart";

function factorSpec(result: ExplainResult, factor: ExplainFactor, datasetId: string): ChartSpec {
  return {
    datasetId,
    markType: "bar",
    encodings: {
      x: { fid: factor.fid, sort: "byMeasure" },
      y: [{ fid: result.measureFid, agg: result.agg }],
    },
    stack: "none",
    filters: result.targetFilters,
    style: {},
    meta: { origin: "ai", title: `${result.targetLabel} — ${factor.displayName}별` },
  };
}

function GroupRow({ result, group }: { result: ExplainResult; group: ExplainFactor["groups"][number] }) {
  const positive = group.delta >= 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="min-w-0 flex-1 truncate">{group.label}</span>
      {result.mode === "delta" ? (
        <>
          <span className={cn("tabular-nums font-medium", positive ? "text-chart-2" : "text-destructive")}>
            {positive ? "+" : ""}
            {formatNumber(group.delta)}
          </span>
          {group.shareOfChange !== undefined && Math.abs(group.shareOfChange) >= 0.05 && (
            <Badge variant="secondary" className="h-4.5 rounded px-1.5 text-[10px] font-normal">
              변화의 {Math.round(group.shareOfChange * 100)}%
            </Badge>
          )}
        </>
      ) : (
        <span className={cn("tabular-nums font-medium", positive ? "text-chart-2" : "text-destructive")}>
          {positive ? "+" : ""}
          {(group.delta * 100).toFixed(1)}%p
        </span>
      )}
    </div>
  );
}

export function ExplainSheet({
  open,
  onOpenChange,
  record,
  table,
  spec,
  parts,
  onOpenSpec,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: BiDatasetRecord;
  table: DataTable;
  spec: ChartSpec;
  parts: SelectionPart[];
  onOpenSpec: (next: ChartSpec) => void;
}) {
  const result = useMemo(
    () => (open ? explainSelection(table, spec, parts) : null),
    [open, table, spec, parts],
  );

  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeState, setNarrativeState] = useState<"idle" | "loading" | "unavailable">("idle");

  useEffect(() => {
    if (!open || !result) return;
    let cancelled = false;
    setNarrative(null);
    setNarrativeState("loading");
    explainNarrative(record, result)
      .then((text) => {
        if (!cancelled) {
          setNarrative(text);
          setNarrativeState("idle");
        }
      })
      .catch(() => {
        if (!cancelled) setNarrativeState("unavailable");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, result]);

  const delta = result ? result.targetTotal - result.baselineTotal : 0;
  const deltaRate = result && result.baselineTotal !== 0 ? delta / result.baselineTotal : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] overflow-y-auto overscroll-contain sm:max-w-[440px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> 왜 이런 값일까
          </SheetTitle>
          <SheetDescription>
            {result
              ? `${result.targetLabel} · ${result.measureLabel} — ${result.baselineLabel}과 비교`
              : "선택한 지점을 분해합니다"}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 px-4 pb-6">
          {!result ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              분해할 dimension이 없거나 데이터가 비어 있습니다.
            </div>
          ) : (
            <>
              {/* 요약 */}
              <Card className="gap-1.5 p-3.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums tracking-tight">
                    {formatNumber(result.targetTotal)}
                  </span>
                  {result.mode === "delta" && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
                        delta >= 0 ? "text-chart-2" : "text-destructive",
                      )}
                    >
                      {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                      {delta >= 0 ? "+" : ""}
                      {formatNumber(delta)}
                      {deltaRate !== null && ` (${(deltaRate * 100).toFixed(1)}%)`}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {result.baselineLabel}: {formatNumber(result.baselineTotal)}
                  {result.mode === "share" && " — 아래는 구성비 차이 기준"}
                </div>
              </Card>

              {/* AI 서사 */}
              {narrativeState === "loading" && (
                <div className="space-y-1.5 rounded-lg border border-border p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Sparkles className="size-3.5 animate-pulse motion-reduce:animate-none" /> AI 해석 생성 중…
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              )}
              {narrative && (
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3.5">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Sparkles className="size-3.5" /> AI 해석
                  </div>
                  <p className="text-[13px] leading-relaxed">{narrative}</p>
                </div>
              )}
              {narrativeState === "unavailable" && (
                <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
                  AI 모델이 연결되지 않아 통계 분해만 표시합니다.
                </div>
              )}

              {/* 기여 요인 */}
              {result.factors.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  분해에 쓸 만한 추가 dimension이 없습니다.
                </div>
              ) : (
                result.factors.map((f) => (
                  <Card key={f.fid} className="gap-2.5 p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold">{f.displayName}</span>
                      <Badge variant="outline" className="h-4.5 rounded px-1.5 text-[10px] font-normal text-muted-foreground">
                        상위 3그룹 집중도 {Math.round(f.power * 100)}%
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 gap-1 px-2 text-[11px] text-muted-foreground"
                        onClick={() => {
                          onOpenChange(false);
                          onOpenSpec(factorSpec(result, f, table.datasetId));
                        }}
                      >
                        탐색에서 보기 <ArrowRight className="size-3" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {f.groups.map((g) => (
                        <GroupRow key={String(g.value)} result={result} group={g} />
                      ))}
                    </div>
                    <div className="h-20">
                      <BiChart table={table} spec={factorSpec(result, f, table.datasetId)} compact />
                    </div>
                  </Card>
                ))
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

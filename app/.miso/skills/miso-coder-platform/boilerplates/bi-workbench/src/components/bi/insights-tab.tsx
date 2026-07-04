/**
 * InsightsTab — 자동 EDA 인사이트 갤러리 (GOAL v2.2, Rath mega-auto 대응)
 * 통계 엔진이 전수 탐색한 패턴에 진입 즉시 LLM 큐레이션(요약·제목·해설·순서)을
 * 자동으로 얹는다(AI-first). AI 리포트(AutoPilot)는 대시보드 저장형 심화 액션.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, LayoutDashboard, SearchX, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lozenge, type LozengeTone } from "./lozenge";
import { cn } from "@/lib/utils";
import type { BiDatasetRecord, ChartSpec, DataTable, InsightCandidate } from "@/lib/bi-types";
import { generateInsights } from "@/lib/bi-insights";
import { curateInsights, type AutoPilotCuration } from "@/lib/bi-ai";
import { encodeSpecParam } from "@/lib/bi-derive";
import { Skeleton } from "@/components/ui/skeleton";
import { BiChart } from "./bi-chart";
import { AutoPilotDialog } from "./autopilot-dialog";
import { AddToDashboardDialog } from "./add-to-dashboard-dialog";

const KIND_TONE: Record<InsightCandidate["kind"], LozengeTone> = {
  trend: "info",
  seasonality: "discovery",
  changepoint: "warning",
  "outlier-group": "danger",
  dominance: "success",
  correlation: "info",
  "skewed-dist": "default",
  "group-diff": "discovery",
};

const KIND_LABELS: Record<InsightCandidate["kind"], string> = {
  trend: "추세",
  seasonality: "계절성",
  changepoint: "변화점",
  "outlier-group": "특이 그룹",
  dominance: "점유",
  correlation: "상관",
  "skewed-dist": "분포",
  "group-diff": "그룹 차이",
};

export function InsightsTab({ record, table }: { record: BiDatasetRecord; table: DataTable }) {
  const navigate = useNavigate();
  const [kindFilter, setKindFilter] = useState<InsightCandidate["kind"] | "all">("all");
  const [autoPilotOpen, setAutoPilotOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<{ spec: ChartSpec; name: string } | null>(null);

  const stats = useMemo(() => generateInsights(table, { max: 24, perKind: 6 }), [table]);

  // AI-first: 진입 즉시 LLM 큐레이션 자동 수행 → 요약 + 픽 우선 정렬 + 제목·해설 교체
  const [curation, setCuration] = useState<AutoPilotCuration | null>(null);
  const [aiState, setAiState] = useState<"loading" | "done" | "off">("loading");
  useEffect(() => {
    if (stats.length === 0) {
      setAiState("off");
      return;
    }
    let cancelled = false;
    setAiState("loading");
    setCuration(null);
    curateInsights(record, table, stats)
      .then((c) => {
        if (!cancelled) {
          setCuration(c);
          setAiState("done");
        }
      })
      .catch(() => {
        if (!cancelled) setAiState("off");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats]);

  // 큐레이션 결과를 카드에 병합: 픽은 AI 제목·해설로 교체하고 앞으로
  type GalleryItem = InsightCandidate & { aiNarrative?: string };
  const insights = useMemo<GalleryItem[]>(() => {
    if (!curation) return stats;
    const picked = curation.picks
      .filter((pk) => stats[pk.index])
      .map((pk) => ({
        ...stats[pk.index],
        title: pk.title,
        aiNarrative: pk.narrative,
      }));
    const pickedIdx = new Set(curation.picks.map((pk) => pk.index));
    const rest = stats.filter((_, i) => !pickedIdx.has(i));
    return [...picked, ...rest];
  }, [stats, curation]);

  const kinds = useMemo(
    () => [...new Set(insights.map((c) => c.kind))] as InsightCandidate["kind"][],
    [insights],
  );
  const visible = insights.filter((c) => kindFilter === "all" || c.kind === kindFilter);

  return (
    <div className="bi-dots h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">자동 EDA</h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            dimension×measure 조합에서 {insights.length}개 패턴 검출
          </span>
          <div className="flex-1" />
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setAutoPilotOpen(true)}>
            <Wand2 className="size-4" /> AI 리포트
          </Button>
        </div>

        {/* AI 요약 — 기본 동작 */}
        {aiState === "loading" && (
          <div className="mb-5 space-y-1.5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Sparkles className="size-3.5 animate-pulse motion-reduce:animate-none" /> AI가 패턴을 읽고 있습니다…
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        )}
        {aiState === "done" && curation?.summary && (
          <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" /> AI 요약
            </div>
            <p className="text-[13px] leading-relaxed">{curation.summary}</p>
          </div>
        )}

        {insights.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {(["all", ...kinds] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k as typeof kindFilter)}
                className={cn(
                  "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  kindFilter === k
                    ? "border-primary/40 bg-primary/12 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {k === "all" ? `전체 ${insights.length}` : KIND_LABELS[k as InsightCandidate["kind"]]}
              </button>
            ))}
          </div>
        )}

        {insights.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <SearchX className="size-6 text-muted-foreground/50" />
            <div className="text-sm font-medium text-muted-foreground">
              유의미한 패턴을 찾지 못했습니다
            </div>
            <p className="text-xs text-muted-foreground/70">
              프로파일 탭에서 필드 타입(차원/측정값) 지정을 확인해 보세요.
            </p>
          </div>
        ) : (
          <div className="bi-stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((c, i) => (
              <Card key={`${c.kind}-${i}`} className="bi-hairline gap-2.5 border-0 p-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Lozenge tone={KIND_TONE[c.kind]} className="shrink-0">
                        {KIND_LABELS[c.kind]}
                      </Lozenge>
                      <span className="truncate text-[13px] font-semibold">{c.title}</span>
                    </div>
                    {c.aiNarrative ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-snug text-foreground/85">
                        <Sparkles className="mr-1 inline size-3 text-primary" />
                        {c.aiNarrative}
                      </p>
                    ) : null}
                    <div className="mt-1 truncate text-[11px] tabular-nums text-muted-foreground">
                      {c.evidence}
                    </div>
                  </div>
                </div>
                {/* 점수 게이지 */}
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${Math.round(Math.min(1, c.score) * 100)}%` }}
                  />
                </div>
                <div className="h-40">
                  <BiChart table={table} spec={c.spec} compact />
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 gap-1.5 text-xs"
                    onClick={() => navigate(`/viz/${record.id}?spec=${encodeSpecParam(c.spec)}`)}
                  >
                    <Compass className="size-3.5" /> Visualization에서 열기
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-muted-foreground"
                    onClick={() => setAddTarget({ spec: c.spec, name: c.spec.meta.title ?? c.title })}
                  >
                    <LayoutDashboard className="size-3.5" /> 대시보드
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AutoPilotDialog open={autoPilotOpen} onOpenChange={setAutoPilotOpen} record={record} table={table} />
      {addTarget && (
        <AddToDashboardDialog
          open={addTarget !== null}
          onOpenChange={(v) => !v && setAddTarget(null)}
          datasetId={record.id}
          spec={addTarget.spec}
          chartId={null}
          chartName={addTarget.name}
        />
      )}
    </div>
  );
}

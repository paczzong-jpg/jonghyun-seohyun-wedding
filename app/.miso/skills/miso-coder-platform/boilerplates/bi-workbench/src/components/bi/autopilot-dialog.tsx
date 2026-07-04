/**
 * AutoPilotDialog — 원클릭 EDA 리포트 (GOAL §8.4)
 * 통계 엔진이 후보를 전수 계산하고, LLM이 큐레이션·서사·요약을 얹는다.
 * LLM 불가 시 점수순 그대로 리포트를 만든다(G4).
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Compass, LayoutDashboard, Loader2, Sparkles, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { BiDatasetRecord, ChartSpec, DashboardConfig, DataTable } from "@/lib/bi-types";
import { generateInsights } from "@/lib/bi-insights";
import { curateInsights } from "@/lib/bi-ai";
import { encodeSpecParam } from "@/lib/bi-derive";
import { saveChart, saveDashboard } from "@/lib/bi-store";
import { BiChart } from "./bi-chart";

interface ReportItem {
  title: string;
  narrative: string;
  spec: ChartSpec;
}

interface Report {
  summary: string | null;
  aiUsed: boolean;
  items: ReportItem[];
}

type Phase =
  | { step: "stats" }
  | { step: "curating"; count: number }
  | { step: "done"; report: Report }
  | { step: "empty" };

export function AutoPilotDialog({
  open,
  onOpenChange,
  record,
  table,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: BiDatasetRecord;
  table: DataTable;
}) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>({ step: "stats" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase({ step: "stats" });

    // 페인트 후 통계 전수 계산 → LLM 큐레이션
    const timer = setTimeout(async () => {
      const candidates = generateInsights(table, { max: 12, perKind: 3 });
      if (cancelled) return;
      if (candidates.length === 0) {
        setPhase({ step: "empty" });
        return;
      }
      setPhase({ step: "curating", count: candidates.length });
      try {
        const curation = await curateInsights(record, table, candidates);
        if (cancelled) return;
        setPhase({
          step: "done",
          report: {
            summary: curation.summary || null,
            aiUsed: true,
            items: curation.picks.map((p) => ({
              title: p.title,
              narrative: p.narrative,
              spec: { ...candidates[p.index].spec, meta: { ...candidates[p.index].spec.meta, title: p.title } },
            })),
          },
        });
      } catch {
        if (cancelled) return;
        // AI 불가 — 점수순 그대로 (G4)
        setPhase({
          step: "done",
          report: {
            summary: null,
            aiUsed: false,
            items: candidates.slice(0, 6).map((c) => ({
              title: c.title,
              narrative: c.evidence,
              spec: c.spec,
            })),
          },
        });
      }
    }, 60);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const saveAsDashboard = async (report: Report) => {
    setSaving(true);
    try {
      const config: DashboardConfig = { widgets: [], globalFilters: [], crossFilter: true };
      let y = 0;
      for (const [i, item] of report.items.entries()) {
        const chart = await saveChart({
          datasetId: record.id,
          name: item.title,
          spec: item.spec,
        });
        config.widgets.push({
          id: `w_ap_${i}`,
          kind: "chart",
          chartId: chart.id,
          layout: { x: (i % 2) * 6, y, w: 6, h: 4 },
        });
        if (i % 2 === 1) y += 4;
      }
      if (report.summary) {
        config.widgets.unshift({
          id: "w_ap_summary",
          kind: "text",
          text: report.summary,
          layout: { x: 0, y: 0, w: 12, h: 2 },
        });
      }
      const dashboard = await saveDashboard({
        name: `AutoPilot 리포트 — ${record.name}`,
        config,
      });
      toast.success("대시보드로 저장했습니다");
      onOpenChange(false);
      navigate(`/dash/${dashboard.id}`);
    } catch {
      toast.error("대시보드 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-4.5 text-primary" /> AutoPilot 리포트
          </DialogTitle>
          <DialogDescription>
            {record.name} — 통계 엔진이 패턴을 찾고 AI가 스토리로 정리합니다.
          </DialogDescription>
        </DialogHeader>

        {phase.step === "stats" && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <div className="text-sm text-muted-foreground">dimension×measure 조합 검토 중…</div>
          </div>
        )}
        {phase.step === "curating" && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Sparkles className="size-6 animate-pulse text-primary motion-reduce:animate-none" />
            <div className="text-sm text-muted-foreground">
              후보 {phase.count}개 발견 — AI가 큐레이션 중…
            </div>
          </div>
        )}
        {phase.step === "empty" && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            유의미한 패턴을 찾지 못했습니다. 필드 타입 지정을 확인해 보세요.
          </div>
        )}

        {phase.step === "done" && (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
              {phase.report.summary && (
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3.5">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Sparkles className="size-3.5" /> 요약
                  </div>
                  <p className="text-[13px] leading-relaxed">{phase.report.summary}</p>
                </div>
              )}
              {!phase.report.aiUsed && (
                <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-2 text-xs text-muted-foreground">
                  AI 모델이 연결되지 않아 통계 점수순으로 표시합니다.
                </div>
              )}
              {phase.report.items.map((item, i) => (
                <Card key={i} className="gap-2 p-3.5">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold">{i + 1}. {item.title}</div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.narrative}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 shrink-0 gap-1 px-2 text-[11px] text-muted-foreground"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/viz/${record.id}?spec=${encodeSpecParam(item.spec)}`);
                      }}
                    >
                      <Compass className="size-3" /> 탐색
                    </Button>
                  </div>
                  <div className="h-36">
                    <BiChart table={table} spec={item.spec} compact />
                  </div>
                </Card>
              ))}
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-border pt-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
              <Button disabled={saving} onClick={() => void saveAsDashboard(phase.report)}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <LayoutDashboard className="size-4" />}
                대시보드로 저장
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

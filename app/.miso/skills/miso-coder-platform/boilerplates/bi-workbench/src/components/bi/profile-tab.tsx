/**
 * ProfileTab — 첫 10초 경험 (GOAL_UIUX §3)
 * 품질 배너 → 요약 헤더 → 추천 차트 스트립(규칙 기반, LLM 불필요) → 필드 카드
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Sparkles, TriangleAlert, Wand2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BiDatasetRecord, DataTable, FieldMeta } from "@/lib/bi-types";
import { detectQualityIssues, reprofileField } from "@/lib/bi-profile";
import { fallbackRecommendations, generateInsights } from "@/lib/bi-insights";
import { encodeSpecParam } from "@/lib/bi-derive";
import { formatBytes, formatNumber, formatRelativeTime } from "@/lib/bi-format";
import { useUpdateDatasetFields } from "@/lib/bi-hooks";
import { BiChart } from "./bi-chart";
import { AutoPilotDialog } from "./autopilot-dialog";
import { FieldDetailSheet, FieldSparkline, FieldTypeIcon } from "./field-list-panel";

function FieldCard({ field, onClick }: { field: FieldMeta; onClick: () => void }) {
  const p = field.profile;
  const nullRate = p.count > 0 ? p.nullCount / p.count : 0;
  const statLine = (() => {
    if (field.semanticType === "temporal" && p.temporalRange) {
      return `${p.temporalRange.min.slice(0, 10)} ~ ${p.temporalRange.max.slice(0, 10)}`;
    }
    if (field.analyticType === "measure" && p.mean !== undefined) {
      return `μ ${formatNumber(p.mean)} · σ ${p.stdev !== undefined ? formatNumber(p.stdev) : "—"}`;
    }
    const top = p.topValues?.[0];
    return top ? `최빈 ${top.value} ${p.count ? Math.round((top.count / p.count) * 100) : 0}%` : "";
  })();

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "cursor-pointer gap-2 p-3.5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        field.hidden && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2">
        <FieldTypeIcon field={field} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{field.displayName}</span>
        <Badge variant="outline" className="h-4.5 rounded px-1.5 text-[10px] font-normal text-muted-foreground">
          {field.analyticType === "measure" ? "측정값" : field.semanticType === "temporal" ? "시간" : "차원"}
        </Badge>
      </div>
      <FieldSparkline field={field} />
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">{statLine}</span>
        <span className="shrink-0 pl-2 tabular-nums">
          고유 {p.distinctCount.toLocaleString()}
          {nullRate > 0 && ` · 결측 ${Math.round(nullRate * 100)}%`}
        </span>
      </div>
    </Card>
  );
}

export function ProfileTab({ record, table }: { record: BiDatasetRecord; table: DataTable }) {
  const navigate = useNavigate();
  const updateFields = useUpdateDatasetFields();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [detailFid, setDetailFid] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<"all" | "dimension" | "measure">("all");
  const [autoPilotOpen, setAutoPilotOpen] = useState(false);

  const issues = useMemo(() => detectQualityIssues(table), [table]);
  const insights = useMemo(() => {
    const generated = generateInsights(table);
    return generated.length > 0 ? generated : fallbackRecommendations(table);
  }, [table]);

  const visibleFields = table.fields.filter(
    (f) => roleFilter === "all" || f.analyticType === roleFilter,
  );
  const dimCount = table.fields.filter((f) => f.analyticType === "dimension").length;
  const measureCount = table.fields.length - dimCount;

  const openInsight = (specIndex: number) => {
    const spec = insights[specIndex].spec;
    navigate(`/viz/${record.id}?spec=${encodeSpecParam(spec)}`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-5">
        {issues.length > 0 && !bannerDismissed && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-chart-5" />
            <div className="flex-1 text-[13px]">
              <span className="font-medium">데이터 품질: </span>
              <span className="text-muted-foreground">
                {issues.slice(0, 3).map((i) => i.message).join(" · ")}
                {issues.length > 3 && ` 외 ${issues.length - 3}건`}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="size-6" aria-label="품질 배너 닫기" onClick={() => setBannerDismissed(true)}>
              <X className="size-3.5" />
            </Button>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xl font-semibold tabular-nums tracking-tight">
            {record.rowCount.toLocaleString()}행 × {table.fields.length}열
          </span>
          <span className="text-sm text-muted-foreground">
            {formatBytes(record.byteSize)} · {record.sourceName} · {formatRelativeTime(record.updated)} 업데이트
          </span>
          <div className="flex-1" />
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setAutoPilotOpen(true)}>
            <Wand2 className="size-4" /> AutoPilot
          </Button>
        </div>

        {insights.length > 0 && (
          <section className="mb-8">
            <div className="mb-2.5 flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">추천 차트</h2>
              <span className="text-xs text-muted-foreground">통계 규칙으로 찾은 패턴</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {insights.map((c, i) => (
                <Card
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => openInsight(i)}
                  onKeyDown={(e) => e.key === "Enter" && openInsight(i)}
                  className="group w-64 shrink-0 cursor-pointer gap-2 overflow-hidden p-3 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium">{c.title}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.evidence}</div>
                    </div>
                    <ArrowRight className="mt-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="h-24">
                    <BiChart table={table} spec={c.spec} compact />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-2.5 flex items-center gap-2">
            <h2 className="text-sm font-semibold">필드 ({table.fields.length})</h2>
            <div className="flex-1" />
            <div className="flex gap-1">
              {(
                [
                  ["all", `전체`],
                  ["dimension", `차원 ${dimCount}`],
                  ["measure", `측정값 ${measureCount}`],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  variant={roleFilter === key ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setRoleFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleFields.map((f) => (
              <FieldCard key={f.fid} field={f} onClick={() => setDetailFid(f.fid)} />
            ))}
          </div>
        </section>
      </div>

      <AutoPilotDialog open={autoPilotOpen} onOpenChange={setAutoPilotOpen} record={record} table={table} />

      <FieldDetailSheet
        table={table}
        fid={detailFid}
        onClose={() => setDetailFid(null)}
        onSave={(next) => {
          const fields = table.fields.map((f) => (f.fid === next.fid ? reprofileField(table, next) : f));
          updateFields.mutate(
            { id: table.datasetId, fields },
            { onError: () => toast.error("저장에 실패했습니다") },
          );
        }}
      />
    </div>
  );
}

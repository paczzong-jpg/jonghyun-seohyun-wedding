/**
 * MetricDialog — 저장된 지표(집계 표현식) 생성·편집 (GOAL, Superset metric)
 * 행 단위 계산 필드로는 불가능한 "집계 후 산술"을 만든다.
 *   예: sum([revenue]) / countDistinct([customer_id]) → 고객당 매출
 * compileMetric으로 검증하고 기저 집계 목록을 미리보기로 보여준다.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Sigma, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DataTable, FieldMeta } from "@/lib/bi-types";
import { compileMetric, MetricError } from "@/lib/bi-metric";
import { makeMetricField } from "@/lib/bi-profile";
import { useUpdateDatasetFields } from "@/lib/bi-hooks";

const AGG_HINTS = ["sum([필드])", "mean([필드])", "count()", "countDistinct([필드])", "min / max([필드])", "median([필드])"];
const EXAMPLES = [
  { label: "객단가", expr: "sum([revenue]) / count()" },
  { label: "고객당 매출", expr: "sum([revenue]) / countDistinct([customer_id])" },
];

export function MetricDialog({
  table,
  open,
  onOpenChange,
  editing,
}: {
  table: DataTable;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: FieldMeta | null;
}) {
  const [name, setName] = useState("");
  const [expr, setExpr] = useState("");
  const [initedFor, setInitedFor] = useState<string | null>(null);
  const updateFields = useUpdateDatasetFields();

  const key = editing?.fid ?? (open ? "__new__" : null);
  if (key && initedFor !== key) {
    setName(editing?.displayName ?? "");
    setExpr(editing?.metric?.expr ?? "");
    setInitedFor(key);
  }
  if (!open && initedFor !== null) setInitedFor(null);

  // 검증 + 기저 집계 미리보기
  const check = useMemo(() => {
    const trimmed = expr.trim();
    if (!trimmed) return { ok: false as const, error: "" };
    try {
      const compiled = compileMetric(
        trimmed,
        (ref) => table.fields.find((f) => f.displayName === ref || f.fid === ref)?.fid ?? null,
      );
      const labels = compiled.baseAggs.map((ba) => {
        const f = table.fields.find((x) => x.fid === ba.fid);
        return `${ba.agg}(${ba.fid === "*" ? "행 수" : f?.displayName ?? ba.fid})`;
      });
      return { ok: true as const, labels };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof MetricError ? e.message : e instanceof Error ? e.message : "지표 오류",
      };
    }
  }, [expr, table.fields]);

  const insert = (snippet: string) => setExpr((e) => (e ? `${e} ${snippet}` : snippet));

  const save = () => {
    const label = name.trim();
    const trimmed = expr.trim();
    if (!label || !trimmed) return;
    let field: FieldMeta;
    try {
      const usedFids = new Set(table.fields.filter((f) => f.fid !== editing?.fid).map((f) => f.fid));
      const built = makeMetricField(table, label, trimmed, usedFids);
      field = editing ? { ...built, fid: editing.fid, name: editing.name } : built;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "지표를 평가할 수 없습니다");
      return;
    }
    const fields = editing
      ? table.fields.map((f) => (f.fid === editing.fid ? field : f))
      : [...table.fields, field];
    updateFields.mutate(
      { id: table.datasetId, fields },
      {
        onSuccess: () => {
          toast.success(editing ? "지표를 수정했습니다" : `지표 "${label}"를 추가했습니다`);
          onOpenChange(false);
        },
        onError: () => toast.error("지표 저장에 실패했습니다"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sigma className="size-4 text-primary" />
            {editing ? "지표 편집" : "지표 추가"}
          </DialogTitle>
          <DialogDescription>
            집계 후 산술로 지표를 정의합니다. 계산 필드와 달리 <code className="rounded bg-muted px-1">sum</code>·
            <code className="rounded bg-muted px-1">countDistinct</code> 같은 집계를 조합할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="metric-name">지표 이름</Label>
            <Input
              id="metric-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 고객당 매출"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="metric-expr">집계 표현식</Label>
            <Textarea
              id="metric-expr"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              placeholder="예: sum([revenue]) / countDistinct([customer_id])"
              className="min-h-20 font-mono text-[13px]"
              spellCheck={false}
            />
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => { setExpr(ex.expr); if (!name.trim()) setName(ex.label); }}
                  className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* 검증 미리보기 */}
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              검증
            </div>
            {!expr.trim() ? (
              <p className="text-xs text-muted-foreground">표현식을 입력하면 기저 집계가 표시됩니다.</p>
            ) : check.ok ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">기저 집계:</span>
                {check.labels.map((l, i) => (
                  <span key={i} className="bi-lozenge bi-lozenge-success">{l}</span>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <TriangleAlert className="size-3.5 shrink-0" /> {check.error}
              </p>
            )}
          </div>

          {/* 필드·집계 참조 */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">필드</div>
              <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                {table.fields
                  .filter((f) => !f.hidden && !f.metric && f.fid !== editing?.fid)
                  .map((f) => (
                    <button
                      key={f.fid}
                      type="button"
                      onClick={() => insert(`[${f.displayName}]`)}
                      className="rounded border border-border px-1.5 py-0.5 text-xs hover:bg-accent hover:text-accent-foreground"
                    >
                      {f.displayName}
                    </button>
                  ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">집계</div>
              <div className="flex flex-wrap gap-1">
                {AGG_HINTS.map((h) => (
                  <span key={h} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={save} disabled={!name.trim() || !check.ok || updateFields.isPending}>
            {editing ? "수정" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

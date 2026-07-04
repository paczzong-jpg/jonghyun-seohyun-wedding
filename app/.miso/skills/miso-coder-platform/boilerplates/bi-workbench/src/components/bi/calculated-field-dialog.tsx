/**
 * CalculatedFieldDialog — 계산/파생 필드 생성·편집 (GOAL v3, Superset 계산컬럼)
 * 수식 입력 + 실시간 미리보기(샘플 100행) + 필드/함수 참조. bi-formula 엔진으로 평가.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FunctionSquare, TriangleAlert } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { DataTable, FieldMeta } from "@/lib/bi-types";
import { computeDerivedColumn, FormulaError } from "@/lib/bi-formula";
import { makeDerivedField } from "@/lib/bi-profile";
import { useUpdateDatasetFields } from "@/lib/bi-hooks";
import { formatCell } from "@/lib/bi-format";

const FUNC_HINTS = [
  "if(조건, 참, 거짓)",
  "round(x, 자리)",
  "coalesce(a, b, …)",
  "min / max / abs / sqrt",
  "log(x, 밑) / ln / exp",
  "concat / lower / upper",
  "contains(s, 부분)",
  "year / month / day(날짜)",
];

export function CalculatedFieldDialog({
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

  // 편집 진입 초기화
  const key = editing?.fid ?? (open ? "__new__" : null);
  if (key && initedFor !== key) {
    setName(editing?.displayName ?? "");
    setExpr(editing?.derived?.expr ?? "");
    setInitedFor(key);
  }
  if (!open && initedFor !== null) setInitedFor(null);

  // 미리보기용 100행 슬라이스 테이블
  const previewTable = useMemo<DataTable>(() => {
    const n = Math.min(100, table.rowCount);
    const columns: DataTable["columns"] = {};
    for (const f of table.fields) columns[f.fid] = (table.columns[f.fid] ?? []).slice(0, n);
    return { ...table, columns, rowCount: n };
  }, [table]);

  const preview = useMemo(() => {
    const trimmed = expr.trim();
    if (!trimmed) return { ok: false as const, error: "" };
    try {
      const comp = computeDerivedColumn(previewTable, trimmed);
      return { ok: true as const, comp };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof FormulaError ? e.message : e instanceof Error ? e.message : "수식 오류",
      };
    }
  }, [expr, previewTable]);

  const insert = (snippet: string) => setExpr((e) => (e ? `${e} ${snippet}` : snippet));

  const save = () => {
    const trimmed = expr.trim();
    const label = name.trim();
    if (!label || !trimmed) return;
    let field: FieldMeta;
    try {
      // 편집 시 기존 fid 유지, 신규는 새 fid
      const usedFids = new Set(table.fields.filter((f) => f.fid !== editing?.fid).map((f) => f.fid));
      const built = makeDerivedField(table, label, trimmed, usedFids);
      field = editing ? { ...built.field, fid: editing.fid, name: editing.name } : built.field;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "수식을 평가할 수 없습니다");
      return;
    }
    const fields = editing
      ? table.fields.map((f) => (f.fid === editing.fid ? field : f))
      : [...table.fields, field];
    updateFields.mutate(
      { id: table.datasetId, fields },
      {
        onSuccess: () => {
          toast.success(editing ? "계산 필드를 수정했습니다" : `계산 필드 "${label}"를 추가했습니다`);
          onOpenChange(false);
        },
        onError: () => toast.error("계산 필드 저장에 실패했습니다"),
      },
    );
  };

  const sampleField = preview.ok
    ? ({ ...table.fields[0], dataType: preview.comp.dataType, semanticType: "nominal", analyticType: "dimension" } as FieldMeta)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FunctionSquare className="size-4 text-primary" />
            {editing ? "계산 필드 편집" : "계산 필드 추가"}
          </DialogTitle>
          <DialogDescription>
            수식으로 새 필드를 만듭니다. 필드는 <code className="rounded bg-muted px-1">[표시명]</code>으로 참조합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="calc-name">필드 이름</Label>
            <Input
              id="calc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 이익률"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="calc-expr">수식</Label>
            <Textarea
              id="calc-expr"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              placeholder="예: ([revenue] - [cost]) / [revenue]"
              className="min-h-20 font-mono text-[13px]"
              spellCheck={false}
            />
          </div>

          {/* 미리보기 */}
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              미리보기 {preview.ok && <span className="font-normal normal-case">· 추론 타입 {preview.comp.dataType}</span>}
            </div>
            {!expr.trim() ? (
              <p className="text-xs text-muted-foreground">수식을 입력하면 샘플 결과가 표시됩니다.</p>
            ) : preview.ok ? (
              <div className="flex flex-wrap gap-1.5">
                {preview.comp.values.slice(0, 8).map((v, i) => (
                  <span key={i} className="rounded bg-background px-2 py-0.5 text-xs tabular-nums shadow-sm">
                    {sampleField ? formatCell(v, sampleField) : String(v)}
                  </span>
                ))}
                {preview.comp.errorSample.length > 0 && (
                  <span className="text-xs text-destructive">일부 행 계산 실패</span>
                )}
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <TriangleAlert className="size-3.5 shrink-0" /> {preview.error}
              </p>
            )}
          </div>

          {/* 필드·함수 참조 */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                필드
              </div>
              <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                {table.fields
                  .filter((f) => !f.hidden && f.fid !== editing?.fid)
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
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                함수
              </div>
              <div className="flex flex-wrap gap-1">
                {FUNC_HINTS.map((h) => (
                  <span
                    key={h}
                    className={cn("rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground")}
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={save} disabled={!name.trim() || !preview.ok || updateFields.isPending}>
            {editing ? "수정" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

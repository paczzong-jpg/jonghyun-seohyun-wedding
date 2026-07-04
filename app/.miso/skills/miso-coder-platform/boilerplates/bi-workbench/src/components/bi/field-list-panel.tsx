/**
 * FieldListPanel — 좌측 데이터 패널 (GOAL_UIUX §7) + 필드 상세 Sheet (§10)
 * 그리드·탐색 탭 공용. 필드는 shelf/필터로 드래그하는 소스다.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  EyeOff,
  FunctionSquare,
  Hash,
  Link2,
  MoreVertical,
  Plus,
  Search,
  Sigma,
  ToggleLeft,
  Type,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DataTable, FieldMeta, SemanticType } from "@/lib/bi-types";
import { useUpdateDatasetFields } from "@/lib/bi-hooks";
import { formatNumber } from "@/lib/bi-format";
import { reprofileField } from "@/lib/bi-profile";
import { CalculatedFieldDialog } from "./calculated-field-dialog";
import { RelationshipDialog } from "./relationship-dialog";
import { MetricDialog } from "./metric-dialog";

export const FIELD_DRAG_MIME = "application/x-bi-fid";

export function FieldTypeIcon({ field, className }: { field: FieldMeta; className?: string }) {
  const cls = cn("size-3.5 shrink-0", className);
  if (field.metric) return <Sigma className={cn(cls, "text-chart-1")} />;
  if (field.derived) return <FunctionSquare className={cn(cls, "text-chart-3")} />;
  if (field.semanticType === "temporal") return <Calendar className={cn(cls, "text-chart-4")} />;
  if (field.dataType === "bool") return <ToggleLeft className={cn(cls, "text-chart-2")} />;
  if (field.analyticType === "measure") return <Hash className={cn(cls, "text-chart-1")} />;
  return <Type className={cn(cls, "text-chart-2")} />;
}

/** 프로파일 미니 분포 (SVG 스파크 막대) */
export function FieldSparkline({ field, className }: { field: FieldMeta; className?: string }) {
  const bars = useMemo(() => {
    const p = field.profile;
    if (p.histogram?.length) return p.histogram.map((b) => b.count);
    if (p.topValues?.length) return p.topValues.slice(0, 8).map((t) => t.count);
    return [];
  }, [field]);
  if (bars.length === 0) return null;
  const max = Math.max(...bars, 1);
  const w = 100 / bars.length;
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className={cn("h-6 w-full", className)}>
      {bars.map((b, i) => {
        const h = Math.max(1.5, (b / max) * 24);
        return (
          <rect
            key={i}
            x={i * w + w * 0.12}
            y={24 - h}
            width={w * 0.76}
            height={h}
            rx={1}
            className="fill-primary/50"
          />
        );
      })}
    </svg>
  );
}

function FieldRow({
  field,
  onOpenDetail,
  onToggleHidden,
  onConvert,
  onEditDerived,
  onEditMetric,
  onDeleteDerived,
}: {
  field: FieldMeta;
  onOpenDetail: () => void;
  onToggleHidden: () => void;
  onConvert: () => void;
  onEditDerived: () => void;
  onEditMetric: () => void;
  onDeleteDerived: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(FIELD_DRAG_MIME, field.fid);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDoubleClick={onOpenDetail}
      className={cn(
        "group flex h-8 cursor-grab items-center gap-2 rounded-md px-2 text-[13px] transition-colors hover:bg-muted active:cursor-grabbing",
        field.hidden && "opacity-45",
      )}
      title={`${field.displayName} — 드래그해서 축/필터에 놓기`}
    >
      <FieldTypeIcon field={field} />
      <span className="min-w-0 flex-1 truncate">{field.displayName}</span>
      {field.joinLabel && (
        <Link2 className="size-3 shrink-0 text-muted-foreground" aria-label={`${field.joinLabel}에서 조인됨`} />
      )}
      {field.hidden && <EyeOff className="size-3 text-muted-foreground" />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={`${field.displayName} 필드 메뉴`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {field.joinLabel ? (
            // 조인으로 편입된 필드는 오른쪽 데이터셋 소유 — 읽기 전용
            <DropdownMenuItem onSelect={onOpenDetail}>필드 상세</DropdownMenuItem>
          ) : field.metric ? (
            <>
              <DropdownMenuItem onSelect={onEditMetric}>지표 편집</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onToggleHidden}>
                {field.hidden ? "숨김 해제" : "숨기기"}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDeleteDerived}>
                지표 삭제
              </DropdownMenuItem>
            </>
          ) : (
            <>
              {field.derived && (
                <>
                  <DropdownMenuItem onSelect={onEditDerived}>수식 편집</DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onSelect={onOpenDetail}>필드 상세·편집</DropdownMenuItem>
              <DropdownMenuItem onSelect={onConvert}>
                {field.analyticType === "measure" ? "차원으로 전환" : "측정값으로 전환"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onToggleHidden}>
                {field.hidden ? "숨김 해제" : "숨기기"}
              </DropdownMenuItem>
              {field.derived && (
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDeleteDerived}>
                  계산 필드 삭제
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function FieldDetailSheet({
  table,
  fid,
  onClose,
  onSave,
}: {
  table: DataTable;
  fid: string | null;
  onClose: () => void;
  onSave: (next: FieldMeta) => void;
}) {
  const field = table.fields.find((f) => f.fid === fid) ?? null;
  const [displayName, setDisplayName] = useState("");
  const [analyticType, setAnalyticType] = useState<FieldMeta["analyticType"]>("dimension");
  const [semanticType, setSemanticType] = useState<SemanticType>("nominal");
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  if (field && initializedFor !== field.fid) {
    setDisplayName(field.displayName);
    setAnalyticType(field.analyticType);
    setSemanticType(field.semanticType);
    setInitializedFor(field.fid);
  }

  if (!field) return null;
  const p = field.profile;

  return (
    <Sheet open={fid !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-96 overflow-y-auto sm:max-w-96">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FieldTypeIcon field={field} className="size-4" />
            {field.name}
          </SheetTitle>
          <SheetDescription>
            {field.dataType} · 고유 {p.distinctCount.toLocaleString()} · 결측{" "}
            {p.count > 0 ? Math.round((p.nullCount / p.count) * 100) : 0}%
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-5 px-4 pb-6">
          <div className="grid gap-1.5">
            <Label>표시명</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>역할</Label>
              <Select value={analyticType} onValueChange={(v) => setAnalyticType(v as FieldMeta["analyticType"]) }>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dimension">차원 (dimension)</SelectItem>
                  <SelectItem value="measure">측정값 (measure)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>의미 타입</Label>
              <Select value={semanticType} onValueChange={(v) => setSemanticType(v as SemanticType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nominal">nominal</SelectItem>
                  <SelectItem value="ordinal">ordinal</SelectItem>
                  <SelectItem value="quantitative">quantitative</SelectItem>
                  <SelectItem value="temporal" disabled={field.dataType !== "date" && field.dataType !== "datetime"}>
                    temporal
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-muted-foreground">분포</Label>
            <div className="rounded-lg border border-border p-3">
              <FieldSparkline field={field} className="h-10" />
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {typeof p.min === "number" && <span>최소 {formatNumber(p.min)}</span>}
                {typeof p.max === "number" && <span>최대 {formatNumber(p.max)}</span>}
                {p.mean !== undefined && <span>평균 {formatNumber(p.mean)}</span>}
                {p.stdev !== undefined && <span>σ {formatNumber(p.stdev)}</span>}
                {p.temporalRange && (
                  <span className="col-span-2">
                    {p.temporalRange.min.slice(0, 10)} ~ {p.temporalRange.max.slice(0, 10)}
                  </span>
                )}
              </div>
              {p.topValues && p.topValues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {p.topValues.slice(0, 5).map((t) => (
                    <div key={t.value} className="flex items-center gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate">{t.value}</span>
                      <span className="tabular-nums text-muted-foreground">{t.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>취소</Button>
            <Button
              onClick={() => {
                const next = reprofileField(table, {
                  ...field,
                  displayName: displayName.trim() || field.name,
                  analyticType,
                  semanticType,
                });
                onSave(next);
                onClose();
              }}
            >
              저장
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function FieldListPanel({ table }: { table: DataTable }) {
  const [search, setSearch] = useState("");
  const [detailFid, setDetailFid] = useState<string | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [metricOpen, setMetricOpen] = useState(false);
  const [editingDerived, setEditingDerived] = useState<FieldMeta | null>(null);
  const [editingMetric, setEditingMetric] = useState<FieldMeta | null>(null);
  const updateFields = useUpdateDatasetFields();

  const removeField = (fid: string) => {
    updateFields.mutate(
      { id: table.datasetId, fields: table.fields.filter((f) => f.fid !== fid) },
      { onError: () => toast.error("삭제에 실패했습니다") },
    );
  };
  const openNewCalc = () => {
    setEditingDerived(null);
    setCalcOpen(true);
  };
  const openEditCalc = (f: FieldMeta) => {
    setEditingDerived(f);
    setCalcOpen(true);
  };
  const openNewMetric = () => {
    setEditingMetric(null);
    setMetricOpen(true);
  };
  const openEditMetric = (f: FieldMeta) => {
    setEditingMetric(f);
    setMetricOpen(true);
  };

  const persist = (next: FieldMeta) => {
    const fields = table.fields.map((f) => (f.fid === next.fid ? next : f));
    updateFields.mutate(
      { id: table.datasetId, fields },
      { onError: () => toast.error("필드 저장에 실패했습니다") },
    );
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return table.fields.filter((f) => !q || f.displayName.toLowerCase().includes(q));
  }, [table.fields, search]);

  const dimensions = filtered.filter((f) => f.analyticType === "dimension");
  const measures = filtered.filter((f) => f.analyticType === "measure");

  const section = (label: string, items: FieldMeta[]) => (
    <div>
      <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label} <span className="font-normal">({items.length})</span>
      </div>
      {items.map((f) => (
        <FieldRow
          key={f.fid}
          field={f}
          onOpenDetail={() => setDetailFid(f.fid)}
          onToggleHidden={() => persist({ ...f, hidden: !f.hidden })}
          onEditDerived={() => openEditCalc(f)}
          onEditMetric={() => openEditMetric(f)}
          onDeleteDerived={() => removeField(f.fid)}
          onConvert={() =>
            persist(
              reprofileField(table, {
                ...f,
                analyticType: f.analyticType === "measure" ? "dimension" : "measure",
                semanticType: f.analyticType === "measure" ? "nominal" : "quantitative",
              }),
            )
          }
        />
      ))}
      {items.length === 0 && (
        <div className="px-2 py-1.5 text-xs text-muted-foreground/60">없음</div>
      )}
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 p-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="필드 검색…"
            aria-label="필드 검색"
            name="field-search"
            autoComplete="off"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          aria-label="데이터 조인"
          title="데이터 조인"
          onClick={() => setJoinOpen(true)}
        >
          <Link2 className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          aria-label="지표 추가"
          title="지표 추가 (집계 표현식)"
          onClick={openNewMetric}
        >
          <Sigma className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          aria-label="계산 필드 추가"
          title="계산 필드 추가"
          onClick={openNewCalc}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-3">
        {section("차원", dimensions)}
        {section("측정값", measures)}
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <Badge variant="secondary" className="font-normal text-muted-foreground">
          필드를 축·필터로 드래그
        </Badge>
        <button
          type="button"
          onClick={openNewCalc}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          <FunctionSquare className="size-3" /> 계산 필드
        </button>
      </div>
      <FieldDetailSheet table={table} fid={detailFid} onClose={() => setDetailFid(null)} onSave={persist} />
      <CalculatedFieldDialog table={table} open={calcOpen} onOpenChange={setCalcOpen} editing={editingDerived} />
      <MetricDialog table={table} open={metricOpen} onOpenChange={setMetricOpen} editing={editingMetric} />
      <RelationshipDialog table={table} open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
}

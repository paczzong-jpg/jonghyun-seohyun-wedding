/**
 * FilterBar — 필터 칩 + 추가 팝오버 (그리드·탐색·대시보드 공용, GOAL_UIUX §4·5)
 * 필드 타입별 편집기: oneOf(체크리스트) / range / timeRange·timeRelative / contains
 */

import { useMemo, useState } from "react";
import { Filter, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { DataTable, DateUnit, FieldMeta, FilterRule, Scalar } from "@/lib/bi-types";
import { distinctValues } from "@/lib/bi-engine";
import { formatCell, formatNumber } from "@/lib/bi-format";
import { FieldTypeIcon, FIELD_DRAG_MIME } from "./field-list-panel";

// ---------------------------------------------------------------------------
// 칩 라벨
// ---------------------------------------------------------------------------

const RELATIVE_PRESETS: { label: string; lastN: number; unit: DateUnit }[] = [
  { label: "최근 7일", lastN: 7, unit: "day" },
  { label: "최근 30일", lastN: 30, unit: "day" },
  { label: "최근 90일", lastN: 90, unit: "day" },
  { label: "최근 12개월", lastN: 12, unit: "month" },
];

export function filterLabel(rule: FilterRule, fields: FieldMeta[]): string {
  const f = fields.find((x) => x.fid === rule.fid);
  const name = f?.displayName ?? rule.fid;
  switch (rule.op) {
    case "eq":
      return `${name} = ${formatCell(rule.value, f)}`;
    case "neq":
      return `${name} ≠ ${formatCell(rule.value, f)}`;
    case "oneOf":
      return rule.values.length === 1
        ? `${name} = ${formatCell(rule.values[0], f)}`
        : `${name}: ${rule.values.length}개 값`;
    case "notIn":
      return `${name} 제외 ${rule.values.length}개`;
    case "range": {
      const lo = rule.min !== undefined ? formatNumber(rule.min) : "";
      const hi = rule.max !== undefined ? formatNumber(rule.max) : "";
      return `${name}: ${lo} ~ ${hi}`;
    }
    case "timeRange":
      return `${name}: ${rule.from?.slice(0, 10) ?? ""} ~ ${rule.to?.slice(0, 10) ?? ""}`;
    case "timeRelative": {
      const preset = RELATIVE_PRESETS.find((p) => p.lastN === rule.lastN && p.unit === rule.unit);
      return `${name}: ${preset?.label ?? `최근 ${rule.lastN}${rule.unit}`}`;
    }
    case "isNull":
      return `${name} 없음`;
    case "notNull":
      return `${name} 있음`;
    case "contains":
      return `${name} ⊃ "${rule.value}"`;
    case "startsWith":
    case "endsWith":
      return `${name}: "${rule.value}"`;
    case "topN":
      return `${name} 상위 ${rule.n}`;
  }
}

// ---------------------------------------------------------------------------
// 타입별 편집기
// ---------------------------------------------------------------------------

function ValuesEditor({
  table,
  field,
  initial,
  onApply,
}: {
  table: DataTable;
  field: FieldMeta;
  initial?: Scalar[];
  onApply: (values: Scalar[]) => void;
}) {
  const options = useMemo(() => distinctValues(table, field.fid, 60), [table, field.fid]);
  const [selected, setSelected] = useState<Set<Scalar>>(new Set(initial ?? []));
  const [query, setQuery] = useState("");
  const visible = options.filter(
    (o) => !query || String(o).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="w-64">
      <Input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="값 검색…"
        aria-label="값 검색"
        name="value-search"
        autoComplete="off"
        className="mb-2 h-8"
      />
      <div className="max-h-52 space-y-0.5 overflow-y-auto overscroll-contain pr-1">
        {visible.map((v) => {
          const checked = selected.has(v);
          return (
            <label
              key={String(v)}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-muted"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(c) => {
                  const next = new Set(selected);
                  if (c) next.add(v);
                  else next.delete(v);
                  setSelected(next);
                }}
              />
              <span className="min-w-0 flex-1 truncate">{formatCell(v, field)}</span>
            </label>
          );
        })}
        {visible.length === 0 && (
          <div className="py-3 text-center text-xs text-muted-foreground">값이 없습니다</div>
        )}
      </div>
      <div className="mt-2 flex justify-between">
        <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
          모두 해제
        </Button>
        <Button size="sm" disabled={selected.size === 0} onClick={() => onApply([...selected])}>
          적용 ({selected.size})
        </Button>
      </div>
    </div>
  );
}

function RangeEditor({
  field,
  initial,
  onApply,
}: {
  field: FieldMeta;
  initial?: { min?: number; max?: number };
  onApply: (min?: number, max?: number) => void;
}) {
  const [min, setMin] = useState(initial?.min?.toString() ?? "");
  const [max, setMax] = useState(initial?.max?.toString() ?? "");
  const p = field.profile;
  return (
    <div className="w-60 space-y-3">
      <div className="text-xs text-muted-foreground">
        데이터 범위: {typeof p.min === "number" ? formatNumber(p.min) : "—"} ~{" "}
        {typeof p.max === "number" ? formatNumber(p.max) : "—"}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label className="text-xs">최소 (이상)</Label>
          <Input value={min} onChange={(e) => setMin(e.target.value)} inputMode="decimal" className="h-8" />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">최대 (미만)</Label>
          <Input value={max} onChange={(e) => setMax(e.target.value)} inputMode="decimal" className="h-8" />
        </div>
      </div>
      <Button
        size="sm"
        className="w-full"
        disabled={min.trim() === "" && max.trim() === ""}
        onClick={() =>
          onApply(
            min.trim() === "" ? undefined : Number(min),
            max.trim() === "" ? undefined : Number(max),
          )
        }
      >
        적용
      </Button>
    </div>
  );
}

function TimeEditor({
  onApplyRelative,
  onApplyRange,
}: {
  onApplyRelative: (lastN: number, unit: DateUnit) => void;
  onApplyRange: (from?: string, to?: string) => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return (
    <div className="w-64 space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {RELATIVE_PRESETS.map((p) => (
          <Button
            key={p.label}
            variant="outline"
            size="sm"
            onClick={() => onApplyRelative(p.lastN, p.unit)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> 또는 기간 지정 <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8" />
      </div>
      <Button
        size="sm"
        className="w-full"
        disabled={!from && !to}
        onClick={() => onApplyRange(from || undefined, to || undefined)}
      >
        적용
      </Button>
    </div>
  );
}

function ContainsEditor({ initial, onApply }: { initial?: string; onApply: (v: string) => void }) {
  const [value, setValue] = useState(initial ?? "");
  return (
    <div className="w-56 space-y-2">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="예: 서울…"
        aria-label="포함 텍스트"
        name="contains-value"
        autoComplete="off"
        className="h-8"
        onKeyDown={(e) => e.key === "Enter" && value.trim() && onApply(value.trim())}
      />
      <Button size="sm" className="w-full" disabled={!value.trim()} onClick={() => onApply(value.trim())}>
        적용
      </Button>
    </div>
  );
}

export function FieldFilterEditor({
  table,
  field,
  existing,
  onApply,
}: {
  table: DataTable;
  field: FieldMeta;
  existing?: FilterRule;
  onApply: (rule: FilterRule) => void;
}) {
  if (field.semanticType === "temporal") {
    return (
      <TimeEditor
        onApplyRelative={(lastN, unit) => onApply({ fid: field.fid, op: "timeRelative", lastN, unit })}
        onApplyRange={(from, to) =>
          onApply({
            fid: field.fid,
            op: "timeRange",
            from: from ? `${from}T00:00:00Z` : undefined,
            to: to ? `${to}T24:00:00Z` : undefined,
          })
        }
      />
    );
  }
  if (field.semanticType === "quantitative") {
    return (
      <RangeEditor
        field={field}
        initial={existing?.op === "range" ? existing : undefined}
        onApply={(min, max) => onApply({ fid: field.fid, op: "range", min, max })}
      />
    );
  }
  const highCardinality = field.profile.distinctCount > 200;
  if (highCardinality && field.dataType === "string") {
    return (
      <ContainsEditor
        initial={existing?.op === "contains" ? existing.value : undefined}
        onApply={(v) => onApply({ fid: field.fid, op: "contains", value: v })}
      />
    );
  }
  return (
    <ValuesEditor
      table={table}
      field={field}
      initial={existing?.op === "oneOf" ? existing.values : undefined}
      onApply={(values) => onApply({ fid: field.fid, op: "oneOf", values })}
    />
  );
}

// ---------------------------------------------------------------------------
// 메인
// ---------------------------------------------------------------------------

export function FilterBar({
  table,
  filters,
  onChange,
  className,
}: {
  table: DataTable;
  filters: FilterRule[];
  onChange: (next: FilterRule[]) => void;
  className?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [pickingField, setPickingField] = useState<FieldMeta | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fields = table.fields.filter((f) => !f.hidden);

  const applyRule = (rule: FilterRule) => {
    if (editingIndex !== null) {
      onChange(filters.map((r, i) => (i === editingIndex ? rule : r)));
    } else {
      onChange([...filters, rule]);
    }
    setAdding(false);
    setPickingField(null);
    setEditingIndex(null);
  };

  return (
    <div
      className={cn(
        "flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-transparent px-1 py-1",
        dragOver && "border-ring bg-muted/50",
        className,
      )}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(FIELD_DRAG_MIME)) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        const fid = e.dataTransfer.getData(FIELD_DRAG_MIME);
        const field = table.fields.find((f) => f.fid === fid);
        if (field) {
          e.preventDefault();
          setPickingField(field);
          setEditingIndex(null);
          setAdding(true);
        }
      }}
    >
      <Filter className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
      {filters.map((rule, i) => {
        const field = table.fields.find((f) => f.fid === rule.fid);
        return (
          <Popover
            key={`${rule.fid}-${i}`}
            open={editingIndex === i && adding}
            onOpenChange={(v) => {
              if (!v) {
                setAdding(false);
                setEditingIndex(null);
              }
            }}
          >
            <span className="inline-flex h-7 items-stretch overflow-hidden rounded-md bg-secondary text-xs font-medium text-secondary-foreground">
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    setPickingField(field ?? null);
                    setEditingIndex(i);
                    setAdding(true);
                  }}
                  className="inline-flex items-center px-2 transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {filterLabel(rule, table.fields)}
                </button>
              </PopoverTrigger>
              <button
                type="button"
                aria-label="필터 제거"
                onClick={() => onChange(filters.filter((_, j) => j !== i))}
                className="inline-flex items-center px-1.5 text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
            <PopoverContent align="start" className="w-auto p-3">
              {field && (
                <FieldFilterEditor table={table} field={field} existing={rule} onApply={applyRule} />
              )}
            </PopoverContent>
          </Popover>
        );
      })}

      <Popover
        open={adding && editingIndex === null}
        onOpenChange={(v) => {
          setAdding(v);
          if (!v) setPickingField(null);
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground">
            <Plus className="size-3.5" /> 필터
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          {!pickingField ? (
            <Command className="w-56">
              <CommandInput placeholder="필드 선택…" />
              <CommandList className="max-h-56">
                <CommandEmpty>필드가 없습니다</CommandEmpty>
                <CommandGroup>
                  {fields.map((f) => (
                    <CommandItem key={f.fid} value={f.displayName} onSelect={() => setPickingField(f)}>
                      <FieldTypeIcon field={f} />
                      {f.displayName}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          ) : (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium">
                <FieldTypeIcon field={pickingField} />
                {pickingField.displayName}
              </div>
              <FieldFilterEditor table={table} field={pickingField} onApply={applyRule} />
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

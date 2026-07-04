/**
 * ExploreShelf — 인코딩 shelf의 pill·row (GOAL_UIUX §5.1)
 * 드래그 드롭/클릭 추가, pill 메뉴(집계·시간단위·구간화·정렬)를 담당한다.
 */

import { useState } from "react";
import { Hash, X } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { AggFn, DataTable, DateUnit, Encoding } from "@/lib/bi-types";
import { AGG_LABELS, DATE_UNIT_LABELS } from "@/lib/bi-types";
import { encodingLabel, fieldOf } from "@/lib/bi-derive";
import { FIELD_DRAG_MIME, FieldTypeIcon } from "./field-list-panel";

export type ChannelId = "x" | "y" | "color" | "size" | "row" | "column" | "shape" | "opacity";

export const CHANNELS: { id: ChannelId; label: string; multi?: boolean; hint?: string }[] = [
  { id: "x", label: "X" },
  { id: "y", label: "Y", multi: true },
  { id: "color", label: "색상" },
  { id: "size", label: "크기" },
  { id: "shape", label: "모양", hint: "산점도" },
  { id: "opacity", label: "투명도", hint: "산점도" },
  { id: "column", label: "열 분할", hint: "facet" },
  { id: "row", label: "행 분할", hint: "facet" },
];

export function ShelfPill({
  enc,
  table,
  onChange,
  onRemove,
}: {
  enc: Encoding;
  table: DataTable;
  onChange: (next: Encoding) => void;
  onRemove: () => void;
}) {
  const field = fieldOf(table.fields, enc.fid);
  if (!field) return null;
  // 지표는 집계가 표현식 안에 있으므로 agg 선택·구간화를 노출하지 않는다
  const isMeasure = field.analyticType === "measure" && !enc.bucket && !field.metric;
  const isTemporal = field.semanticType === "temporal";
  const isQuant = field.semanticType === "quantitative" && !field.metric;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 max-w-52 items-center gap-1.5 rounded-md bg-primary/10 px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FieldTypeIcon field={field} className="size-3" />
          <span className="truncate">{encodingLabel(enc, table.fields)}</span>
          <X
            aria-hidden="true"
            className="size-3 shrink-0 text-primary/60 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {isMeasure && (
          <>
            <DropdownMenuLabel>집계</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={enc.agg ?? "sum"}
              onValueChange={(v) => onChange({ ...enc, agg: v as AggFn })}
            >
              {(Object.keys(AGG_LABELS) as AggFn[]).slice(0, 7).map((a) => (
                <DropdownMenuRadioItem key={a} value={a}>
                  {AGG_LABELS[a]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
        {isTemporal && (
          <>
            <DropdownMenuLabel>시간 단위</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={enc.bucket && "unit" in enc.bucket ? enc.bucket.unit : "month"}
              onValueChange={(v) => onChange({ ...enc, bucket: { unit: v as DateUnit } })}
            >
              {(Object.keys(DATE_UNIT_LABELS) as DateUnit[]).map((u) => (
                <DropdownMenuRadioItem key={u} value={u}>
                  {DATE_UNIT_LABELS[u]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
        {isQuant && !isTemporal && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                onChange(
                  enc.bucket
                    ? { fid: enc.fid, agg: enc.agg }
                    : { fid: enc.fid, bucket: { binCount: 20 } },
                )
              }
            >
              <Hash className="size-4" />
              {enc.bucket ? "구간화 해제" : "구간화 (20 bins)"}
            </DropdownMenuItem>
          </>
        )}
        {!isMeasure && !isTemporal && (
          <>
            <DropdownMenuLabel>정렬</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={enc.sort ?? "none"}
              onValueChange={(v) =>
                onChange({ ...enc, sort: v === "none" ? null : (v as Encoding["sort"]) })
              }
            >
              <DropdownMenuRadioItem value="none">기본</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="byMeasure">측정값 순</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="asc">값 오름차순</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">값 내림차순</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onRemove}>
          <X className="size-4" /> 제거
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ShelfRow({
  channel,
  encodings,
  table,
  onAdd,
  onChange,
  onRemove,
}: {
  channel: (typeof CHANNELS)[number];
  encodings: Encoding[];
  table: DataTable;
  onAdd: (fid: string) => void;
  onChange: (index: number, next: Encoding) => void;
  onRemove: (index: number) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const canAdd = channel.multi || encodings.length === 0;

  return (
    <div className="flex items-center gap-2">
      <div className="w-9 shrink-0 text-right text-[11px] font-semibold text-muted-foreground">
        {channel.label}
      </div>
      <div
        className={cn(
          "flex min-h-9 flex-1 flex-wrap items-center gap-1.5 rounded-lg border border-dashed px-1.5 py-1 transition-colors",
          dragOver ? "border-ring bg-primary/5" : "border-border/80",
        )}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(FIELD_DRAG_MIME) && canAdd) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          setDragOver(false);
          const fid = e.dataTransfer.getData(FIELD_DRAG_MIME);
          if (fid && canAdd) {
            e.preventDefault();
            onAdd(fid);
          }
        }}
      >
        {encodings.map((enc, i) => (
          <ShelfPill
            key={`${enc.fid}-${i}`}
            enc={enc}
            table={table}
            onChange={(next) => onChange(i, next)}
            onRemove={() => onRemove(i)}
          />
        ))}
        {canAdd && (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {encodings.length === 0 ? "필드를 끌어오거나 클릭" : "+"}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 p-0">
              <Command>
                <CommandInput placeholder="필드 검색…" />
                <CommandList className="max-h-56">
                  <CommandEmpty>필드가 없습니다</CommandEmpty>
                  <CommandGroup>
                    {table.fields
                      .filter((f) => !f.hidden)
                      .map((f) => (
                        <CommandItem
                          key={f.fid}
                          value={f.displayName}
                          onSelect={() => {
                            onAdd(f.fid);
                            setPickerOpen(false);
                          }}
                        >
                          <FieldTypeIcon field={f} />
                          {f.displayName}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

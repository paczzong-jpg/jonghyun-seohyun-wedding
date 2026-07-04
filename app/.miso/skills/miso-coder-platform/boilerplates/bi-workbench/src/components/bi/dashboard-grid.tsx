/**
 * FreeGrid — 대시보드 자유 배치 그리드 (GOAL v2.4)
 *
 * Grafana/react-grid-layout 벤치마크 채택: 12컬럼 × 고정 행높이 절대 배치,
 * 헤더 드래그 이동(스냅 placeholder), SE 코너 리사이즈(min 2×2),
 * 드롭 시 충돌 push + 수직 컴팩션. 외부 라이브러리 없이 포인터 이벤트로 구현.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { DashboardWidget } from "@/lib/bi-types";

export const GRID_COLS = 12;
export const GRID_ROW_H = 64;
export const GRID_GAP = 12;
const MIN_W = 2;
const MIN_H = 2;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function collides(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * 배치 정규화: 고정 위젯(pinnedId)은 그 자리 유지, 나머지는 위로 컴팩션.
 * 고정 위젯과 겹치는 위젯은 자연스럽게 아래로 밀린다 (RGL verticalCompact).
 */
export function layoutPass(
  widgets: DashboardWidget[],
  pinnedId?: string,
  pinnedRect?: Rect,
): DashboardWidget[] {
  const items = widgets.map((w) => ({
    ...w,
    layout: w.id === pinnedId && pinnedRect ? { ...pinnedRect } : { ...w.layout },
  }));
  const pinned = items.find((w) => w.id === pinnedId);
  const others = items
    .filter((w) => w.id !== pinnedId)
    .sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x);

  const placed: Rect[] = pinned ? [pinned.layout] : [];
  for (const item of others) {
    const rect = item.layout;
    rect.x = Math.max(0, Math.min(GRID_COLS - rect.w, rect.x));
    let y = 0;
    while (placed.some((p) => collides({ ...rect, y }, p))) y++;
    rect.y = y;
    placed.push(rect);
  }
  return items;
}

/** 초기 로드 시 겹침이 있으면 정규화 (v1 order-기반 레이아웃 마이그레이션) */
export function normalizeIfOverlapping(widgets: DashboardWidget[]): DashboardWidget[] {
  for (let i = 0; i < widgets.length; i++) {
    for (let j = i + 1; j < widgets.length; j++) {
      if (collides(widgets[i].layout, widgets[j].layout)) return layoutPass(widgets);
    }
  }
  return widgets;
}

interface Interaction {
  type: "move" | "resize";
  id: string;
  startClientX: number;
  startClientY: number;
  startRect: Rect;
  /** 스냅된 현재 타깃 */
  target: Rect;
  /** 드래그 중 픽셀 오프셋 (부드러운 추적용) */
  dx: number;
  dy: number;
}

export interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  style: React.CSSProperties;
}

/** 진행 중 상호작용의 이 위젯 몫 — 비활성 위젯은 항상 null이라 memo가 재렌더를 건다 */
interface ActiveState {
  type: "move" | "resize";
  dx: number;
  dy: number;
  target: Rect;
}

/**
 * 위젯 1개 렌더. React.memo로 감싸 드래그/리사이즈 중 **활성 위젯 하나만**
 * 재렌더되게 한다. 비활성 위젯은 active=null·widget·cellW 등이 불변이라
 * 스킵되어 recharts 차트가 매 프레임 재계산되는 렉을 없앤다.
 */
const GridItem = memo(function GridItem({
  widget,
  cellW,
  rowUnit,
  editing,
  active,
  renderWidget,
  onBeginMove,
  onBeginResize,
}: {
  widget: DashboardWidget;
  cellW: number;
  rowUnit: number;
  editing: boolean;
  active: ActiveState | null;
  renderWidget: (w: DashboardWidget, dragHandle: DragHandleProps | null) => React.ReactNode;
  onBeginMove: (w: DashboardWidget, e: React.PointerEvent) => void;
  onBeginResize: (w: DashboardWidget, e: React.PointerEvent) => void;
}) {
  const px = (rect: Rect) => ({
    left: rect.x * cellW,
    top: rect.y * rowUnit,
    width: rect.w * cellW - GRID_GAP,
    height: rect.h * rowUnit - GRID_GAP,
  });
  const style: React.CSSProperties = active
    ? active.type === "move"
      ? { ...px(widget.layout), transform: `translate(${active.dx}px, ${active.dy}px)`, zIndex: 40 }
      : { ...px(active.target), zIndex: 40 }
    : px(widget.layout);
  const dragHandle: DragHandleProps | null = editing
    ? { onPointerDown: (e) => onBeginMove(widget, e), style: { touchAction: "none", cursor: "grab" } }
    : null;
  return (
    <div
      className={cn(
        "absolute transition-shadow",
        active ? "opacity-95 shadow-2xl" : "transition-[left,top,width,height] duration-150",
      )}
      style={style}
    >
      <div className="h-full">{renderWidget(widget, dragHandle)}</div>
      {editing && (
        <button
          type="button"
          aria-label="위젯 크기 조절"
          onPointerDown={(e) => onBeginResize(widget, e)}
          className="absolute -bottom-1 -right-1 z-10 flex size-5 cursor-nwse-resize items-end justify-end rounded-sm text-muted-foreground/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ touchAction: "none" }}
        >
          <svg viewBox="0 0 10 10" className="size-3" aria-hidden="true">
            <path d="M9 1v8H1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
});

export function FreeGrid({
  widgets,
  editing,
  renderWidget,
  onCommit,
}: {
  widgets: DashboardWidget[];
  editing: boolean;
  renderWidget: (w: DashboardWidget, dragHandle: DragHandleProps | null) => React.ReactNode;
  onCommit: (widgets: DashboardWidget[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  interactionRef.current = interaction;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cellW = width > 0 ? (width + GRID_GAP) / GRID_COLS : 0;
  const rowUnit = GRID_ROW_H + GRID_GAP;

  const px = (rect: Rect) => ({
    left: rect.x * cellW,
    top: rect.y * rowUnit,
    width: rect.w * cellW - GRID_GAP,
    height: rect.h * rowUnit - GRID_GAP,
  });

  const maxY = useMemo(
    () =>
      widgets.reduce(
        (a, w) => Math.max(a, w.layout.y + w.layout.h),
        0,
      ) + (editing ? 4 : 0),
    [widgets, editing],
  );

  const beginInteraction = useCallback(
    (type: Interaction["type"], widget: DashboardWidget, e: React.PointerEvent) => {
      if (!editing) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setInteraction({
        type,
        id: widget.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startRect: { ...widget.layout },
        target: { ...widget.layout },
        dx: 0,
        dy: 0,
      });
    },
    [editing],
  );
  // GridItem memo가 유지되도록 안정 참조로 고정
  const onBeginMove = useCallback(
    (w: DashboardWidget, e: React.PointerEvent) => beginInteraction("move", w, e),
    [beginInteraction],
  );
  const onBeginResize = useCallback(
    (w: DashboardWidget, e: React.PointerEvent) => beginInteraction("resize", w, e),
    [beginInteraction],
  );

  const onPointerMove = (e: React.PointerEvent) => {
    const it = interactionRef.current;
    if (!it || cellW === 0) return;
    const dx = e.clientX - it.startClientX;
    const dy = e.clientY - it.startClientY;
    let target: Rect;
    if (it.type === "move") {
      const x = Math.max(
        0,
        Math.min(GRID_COLS - it.startRect.w, Math.round(it.startRect.x + dx / cellW)),
      );
      const y = Math.max(0, Math.round(it.startRect.y + dy / rowUnit));
      target = { ...it.startRect, x, y };
    } else {
      const w = Math.max(
        MIN_W,
        Math.min(GRID_COLS - it.startRect.x, Math.round(it.startRect.w + dx / cellW)),
      );
      const h = Math.max(MIN_H, Math.round(it.startRect.h + dy / rowUnit));
      target = { ...it.startRect, w, h };
    }
    setInteraction({ ...it, dx, dy, target });
  };

  const onPointerUp = () => {
    const it = interactionRef.current;
    if (!it) return;
    setInteraction(null);
    const changed =
      it.target.x !== it.startRect.x ||
      it.target.y !== it.startRect.y ||
      it.target.w !== it.startRect.w ||
      it.target.h !== it.startRect.h;
    if (!changed) return;
    onCommit(layoutPass(widgets, it.id, it.target));
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative", interaction && "select-none")}
      style={{ height: maxY * rowUnit }}
      onPointerMove={interaction ? onPointerMove : undefined}
      onPointerUp={interaction ? onPointerUp : undefined}
      onPointerCancel={interaction ? onPointerUp : undefined}
    >
      {/* 스냅 placeholder */}
      {interaction && (
        <div
          className="absolute z-0 rounded-xl border-2 border-dashed border-primary/50 bg-primary/8"
          style={px(interaction.target)}
        />
      )}

      {widgets.map((w) => (
        <GridItem
          key={w.id}
          widget={w}
          cellW={cellW}
          rowUnit={rowUnit}
          editing={editing}
          active={
            interaction?.id === w.id
              ? {
                  type: interaction.type,
                  dx: interaction.dx,
                  dy: interaction.dy,
                  target: interaction.target,
                }
              : null
          }
          renderWidget={renderWidget}
          onBeginMove={onBeginMove}
          onBeginResize={onBeginResize}
        />
      ))}
    </div>
  );
}

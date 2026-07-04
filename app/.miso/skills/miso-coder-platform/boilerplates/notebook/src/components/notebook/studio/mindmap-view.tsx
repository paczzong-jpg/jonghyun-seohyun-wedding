import { useMemo, useState } from "react";

import type { ArtifactPayloadMap, MindMapNode } from "@/lib/notebook/types";

// ────────────────────────────────────────────────
// 마인드맵 — 수평 트리 SVG.
// 라벨 클릭 = 해당 주제로 질문, ●/○ 토글 = 가지 접기.
// ────────────────────────────────────────────────

const LEVEL_W = 210;
const ROW_H = 46;
const PAD = 24;

interface LaidNode {
  node: MindMapNode;
  path: string;
  depth: number;
  y: number;
  parentY?: number;
  hasChildren: boolean;
  collapsed: boolean;
}

const PALETTE = [
  { bg: "#4F46E5", fg: "#FFFFFF" },
  { bg: "#EEF0FF", fg: "#4338CA" },
  { bg: "#E6F7F4", fg: "#0F766E" },
  { bg: "#FFF4E0", fg: "#B45309" },
];

function nodeWidth(label: string): number {
  return Math.max(72, Math.min(190, label.length * 12.5 + 30));
}

export function MindMapView({
  payload,
  onAsk,
}: {
  payload: ArtifactPayloadMap["mindmap"];
  onAsk: (question: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { nodes, width, height } = useMemo(() => {
    const out: LaidNode[] = [];
    let leafCursor = 0;
    let maxDepth = 0;

    /** DFS 로 리프 개수 기반 y 배치 — 부모는 자식 y 의 중앙 */
    const layout = (node: MindMapNode, path: string, depth: number): number => {
      maxDepth = Math.max(maxDepth, depth);
      const isCollapsed = collapsed.has(path);
      const children = isCollapsed ? [] : (node.children ?? []);
      let y: number;
      if (children.length === 0) {
        y = leafCursor * ROW_H;
        leafCursor += 1;
      } else {
        const ys = children.map((child, i) => layout(child, `${path}.${i}`, depth + 1));
        y = (ys[0] + ys[ys.length - 1]) / 2;
      }
      out.push({
        node,
        path,
        depth,
        y,
        hasChildren: (node.children?.length ?? 0) > 0,
        collapsed: isCollapsed,
      });
      return y;
    };

    layout(payload.root, "0", 0);

    // 부모 y 를 자식에 전달 (엣지용)
    const byPath = new Map(out.map((n) => [n.path, n]));
    for (const n of out) {
      const parentPath = n.path.split(".").slice(0, -1).join(".");
      if (parentPath) n.parentY = byPath.get(parentPath)?.y;
    }

    return {
      nodes: out,
      width: (maxDepth + 1) * LEVEL_W + PAD * 2 + 190,
      height: Math.max(leafCursor * ROW_H + PAD * 2, 220),
    };
  }, [payload.root, collapsed]);

  const toggle = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  return (
    <div className="flex h-[62dvh] flex-col">
      <div className="nb-scroll flex-1 overflow-auto">
        <svg width={width} height={height} role="img" aria-label="마인드맵">
          {/* 엣지 */}
          {nodes.map((n) => {
            if (n.parentY === undefined) return null;
            const x1 = PAD + n.depth * LEVEL_W - LEVEL_W + nodeWidth("") + 60;
            const parentX = PAD + (n.depth - 1) * LEVEL_W;
            const parent = nodes.find(
              (p) => p.path === n.path.split(".").slice(0, -1).join("."),
            );
            const px = parentX + nodeWidth(parent?.node.label ?? "");
            const cx = PAD + n.depth * LEVEL_W;
            void x1;
            return (
              <path
                key={`edge-${n.path}`}
                d={`M ${px} ${n.parentY + PAD + 16} C ${px + 40} ${n.parentY + PAD + 16}, ${cx - 40} ${n.y + PAD + 16}, ${cx} ${n.y + PAD + 16}`}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={1.5}
              />
            );
          })}

          {/* 노드 */}
          {nodes.map((n) => {
            const color = PALETTE[Math.min(n.depth, PALETTE.length - 1)];
            const w = nodeWidth(n.node.label);
            const x = PAD + n.depth * LEVEL_W;
            const y = n.y + PAD;
            return (
              <g key={n.path}>
                <rect
                  x={x}
                  y={y}
                  rx={16}
                  width={w}
                  height={32}
                  fill={color.bg}
                  stroke={n.depth === 0 ? "none" : "var(--color-border)"}
                  className="cursor-pointer"
                  onClick={() =>
                    onAsk(`'${n.node.label}'에 대해 소스를 근거로 자세히 설명해줘`)
                  }
                >
                  <title>클릭하면 이 주제로 질문합니다</title>
                </rect>
                <text
                  x={x + w / 2}
                  y={y + 20.5}
                  textAnchor="middle"
                  fontSize={12.5}
                  fontWeight={700}
                  fill={color.fg}
                  className="pointer-events-none select-none"
                >
                  {n.node.label}
                </text>
                {n.hasChildren && (
                  <g
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(n.path);
                    }}
                  >
                    <circle
                      cx={x + w + 11}
                      cy={y + 16}
                      r={8}
                      fill="var(--color-card)"
                      stroke="var(--color-border)"
                    />
                    <text
                      x={x + w + 11}
                      y={y + 19.5}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={800}
                      fill="var(--color-muted-foreground)"
                      className="pointer-events-none select-none"
                    >
                      {n.collapsed ? "+" : "−"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="flex-none border-t border-border px-5 py-2.5 text-[11.5px] text-muted-foreground">
        노드를 클릭하면 그 주제로 채팅에 질문합니다 · ＋/− 로 가지를 접고 펼 수 있어요
      </p>
    </div>
  );
}

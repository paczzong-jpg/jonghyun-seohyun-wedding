/**
 * CausalTab — 인과분석 워크벤치 (GOAL v2.3, Rath causal 개념의 실용판)
 * 좌: 변수 선택 · 중: PC 알고리즘 관계 그래프(SVG) · 우: do-개입 What-if.
 * 그래프가 나오면 LLM 해석을 자동 실행한다(AI-first).
 */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  GitFork,
  Plus,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lozenge } from "./lozenge";
import { cn } from "@/lib/utils";
import type { BiDatasetRecord, DataTable } from "@/lib/bi-types";
import {
  analyzeCausal,
  causalCandidateFields,
  predictIntervention,
  type CausalAnalysis,
} from "@/lib/bi-causal";
import { causalNarrative } from "@/lib/bi-ai";
import { formatNumber } from "@/lib/bi-format";

const GRAPH_W = 640;
const GRAPH_H = 460;

function nodePos(index: number, total: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  return {
    x: GRAPH_W / 2 + Math.cos(angle) * (GRAPH_H / 2 - 70),
    y: GRAPH_H / 2 + Math.sin(angle) * (GRAPH_H / 2 - 70),
  };
}

function CausalGraphSvg({
  analysis,
  targetIdx,
  onPickTarget,
}: {
  analysis: CausalAnalysis;
  targetIdx: number | null;
  onPickTarget: (idx: number) => void;
}) {
  const k = analysis.fields.length;
  const positions = analysis.fields.map((_, i) => nodePos(i, k));

  return (
    <svg
      viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
      className="h-full w-full"
      role="img"
      aria-label="인과 관계 그래프"
    >
      <defs>
        <marker id="bi-arrow-pos" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" className="fill-chart-2" />
        </marker>
        <marker id="bi-arrow-neg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" className="fill-chart-4" />
        </marker>
      </defs>

      {analysis.edges.map((e, i) => {
        const pa = positions[e.a];
        const pb = positions[e.b];
        // 노드 반경만큼 안쪽으로 당겨 화살표가 원 표면에 닿게
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const len = Math.hypot(dx, dy) || 1;
        const pad = 34;
        const x1 = pa.x + (dx / len) * pad;
        const y1 = pa.y + (dy / len) * pad;
        const x2 = pb.x - (dx / len) * pad;
        const y2 = pb.y - (dy / len) * pad;
        const positive = e.corr >= 0;
        // 부트스트랩 안정성이 있으면 불투명도로 반영(불안정 엣지는 흐리게)
        const opacity =
          e.stability !== undefined
            ? 0.18 + e.stability * 0.72
            : 0.35 + Math.abs(e.corr) * 0.55;
        const strokeClass = e.forced ? "stroke-primary" : positive ? "stroke-chart-2" : "stroke-chart-4";
        const marker = e.directed
          ? e.forced
            ? "url(#bi-arrow-pos)"
            : positive
              ? "url(#bi-arrow-pos)"
              : "url(#bi-arrow-neg)"
          : undefined;
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth={1 + Math.abs(e.corr) * 3.5}
              strokeLinecap="round"
              strokeDasharray={e.directed ? undefined : "5 5"}
              className={strokeClass}
              opacity={opacity}
              markerEnd={marker}
            />
            {e.stability !== undefined && (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 3}
                textAnchor="middle"
                className="select-none fill-muted-foreground text-[8px] tabular-nums"
              >
                {Math.round(e.stability * 100)}%
              </text>
            )}
          </g>
        );
      })}

      {analysis.fields.map((f, i) => {
        const p = positions[i];
        const isTarget = targetIdx === i;
        const short = f.displayName.length > 9 ? `${f.displayName.slice(0, 8)}…` : f.displayName;
        return (
          <g
            key={f.fid}
            transform={`translate(${p.x}, ${p.y})`}
            className="cursor-pointer"
            onClick={() => onPickTarget(i)}
          >
            <title>{`${f.displayName} — 클릭하면 What-if 타깃으로 지정`}</title>
            <circle
              r={30}
              className={cn(
                "fill-card transition-[stroke]",
                isTarget ? "stroke-primary" : "stroke-border",
              )}
              strokeWidth={isTarget ? 2.5 : 1.5}
            />
            {isTarget && <circle r={35} className="fill-none stroke-primary/30" strokeWidth={1.5} />}
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className={cn("select-none text-[10px]", isTarget ? "fill-primary" : "fill-foreground")}
            >
              {short}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** 배경지식 제약 추가기 — 원인(a) → 결과(b) + 금지/필수 */
function ConstraintAdder({
  fields,
  onAdd,
}: {
  fields: { fid: string; displayName: string }[];
  onAdd: (a: string, b: string, kind: "forbidden" | "required") => void;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [kind, setKind] = useState<"forbidden" | "required">("required");
  const valid = a && b && a !== b;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Select value={a} onValueChange={setA}>
          <SelectTrigger className="h-7 flex-1 text-[11px]">
            <SelectValue placeholder="원인" />
          </SelectTrigger>
          <SelectContent>
            {fields.map((f) => (
              <SelectItem key={f.fid} value={f.fid} className="text-xs">
                {f.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ArrowRight className="size-3 shrink-0 text-muted-foreground/50" />
        <Select value={b} onValueChange={setB}>
          <SelectTrigger className="h-7 flex-1 text-[11px]">
            <SelectValue placeholder="결과" />
          </SelectTrigger>
          <SelectContent>
            {fields.map((f) => (
              <SelectItem key={f.fid} value={f.fid} className="text-xs">
                {f.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex flex-1 overflow-hidden rounded-md border border-border">
          {(["required", "forbidden"] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={cn(
                "flex-1 px-2 py-1 text-[11px] transition-colors",
                kind === k ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
              onClick={() => setKind(k)}
            >
              {k === "required" ? "필수" : "금지"}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-[11px]"
          disabled={!valid}
          onClick={() => {
            if (valid) {
              onAdd(a, b, kind);
              setA("");
              setB("");
            }
          }}
        >
          <Plus className="size-3" /> 추가
        </Button>
      </div>
    </div>
  );
}

export function CausalTab({ record, table }: { record: BiDatasetRecord; table: DataTable }) {
  const candidates = useMemo(() => causalCandidateFields(table), [table]);
  const [selected, setSelected] = useState<Set<string>>(() => {
    const measures = candidates.filter((f) => f.analyticType === "measure");
    const pick = (measures.length >= 2 ? measures : candidates).slice(0, 8);
    return new Set(pick.map((f) => f.fid));
  });
  const [targetFid, setTargetFid] = useState<string | null>(null);
  const [interventions, setInterventions] = useState<Record<string, number>>({});
  const [bootstrap, setBootstrap] = useState(false);
  // 배경지식 제약 — fid 쌍. forbidden=연결 금지, required=a→b 강제
  const [constraints, setConstraints] = useState<
    { a: string; b: string; kind: "forbidden" | "required" }[]
  >([]);

  const selectedKey = [...selected].sort().join(",");
  const orderedFids = useMemo(() => [...selected].sort(), [selectedKey]);
  const nameOf = (fid: string) => candidates.find((f) => f.fid === fid)?.displayName ?? fid;
  // 현재 선택된 변수 양끝을 가진 제약만 유효
  const activeConstraints = constraints.filter((c) => selected.has(c.a) && selected.has(c.b));
  const constraintsKey = activeConstraints.map((c) => `${c.a}>${c.b}:${c.kind}`).join("|");
  const analysis = useMemo(
    () => {
      if (orderedFids.length < 2) return null;
      const idxOf = (fid: string) => orderedFids.indexOf(fid);
      const forbidden = activeConstraints
        .filter((c) => c.kind === "forbidden")
        .map((c) => [idxOf(c.a), idxOf(c.b)] as [number, number]);
      const required = activeConstraints
        .filter((c) => c.kind === "required")
        .map((c) => [idxOf(c.a), idxOf(c.b)] as [number, number]);
      return analyzeCausal(table, orderedFids, {
        forbidden,
        required,
        bootstrap: bootstrap ? 200 : 0,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, selectedKey, constraintsKey, bootstrap],
  );

  // AI 해석 — 그래프가 나오면 자동 실행 (AI-first)
  const [narrative, setNarrative] = useState<string | null>(null);
  const [aiState, setAiState] = useState<"loading" | "done" | "off">("loading");
  useEffect(() => {
    if (!analysis || analysis.edges.length === 0) {
      setAiState("off");
      return;
    }
    let cancelled = false;
    setAiState("loading");
    setNarrative(null);
    causalNarrative(record, analysis)
      .then((text) => {
        if (!cancelled) {
          setNarrative(text);
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
  }, [analysis]);

  if (candidates.length < 2) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <GitFork className="size-6 text-muted-foreground/50" />
        <div className="text-sm font-medium text-muted-foreground">
          인과분석에는 수치형 필드가 2개 이상 필요합니다
        </div>
        <p className="text-xs text-muted-foreground/70">
          프로파일 탭에서 필드 타입을 확인해 보세요.
        </p>
      </div>
    );
  }

  const targetIdx = analysis && targetFid ? analysis.fields.findIndex((f) => f.fid === targetFid) : -1;
  const targetField = targetIdx >= 0 && analysis ? analysis.fields[targetIdx] : null;
  const directedParents =
    analysis && targetIdx >= 0
      ? analysis.fields
          .map((f, i) => ({ field: f, i }))
          .filter(({ i }) => analysis.beta[targetIdx][i] !== 0)
      : [];
  // 방향 미확정(마르코프 동치류)이면 인접 이웃 연관 회귀로 폴백 — UI에 명시
  const assocMode = directedParents.length === 0;
  const parents =
    assocMode && analysis && targetIdx >= 0
      ? analysis.fields
          .map((f, i) => ({ field: f, i }))
          .filter(({ i }) => analysis.assocBeta[targetIdx][i] !== 0)
      : directedParents;

  const targetDeltaSigma = (() => {
    if (!analysis || targetIdx < 0) return 0;
    if (assocMode) {
      // 연관 모드: 전파 없이 직접 효과 합
      let sum = 0;
      for (const [fid, v] of Object.entries(interventions)) {
        const i = analysis.fields.findIndex((f) => f.fid === fid);
        if (i >= 0) sum += analysis.assocBeta[targetIdx][i] * v;
      }
      return sum;
    }
    const deltas = predictIntervention(
      analysis,
      Object.fromEntries(
        Object.entries(interventions)
          .map(([fid, v]) => [analysis.fields.findIndex((f) => f.fid === fid), v])
          .filter(([i]) => (i as number) >= 0),
      ),
    );
    return deltas[targetIdx];
  })();
  const targetDeltaRaw = targetField ? targetDeltaSigma * (targetField.profile.stdev ?? 0) : 0;

  return (
    <div className="flex h-full min-h-0">
      {/* 변수 선택 */}
      <aside className="w-56 shrink-0 overflow-y-auto border-r border-border p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          변수 ({selected.size}/{candidates.length})
        </div>
        <div className="space-y-0.5">
          {candidates.map((f) => (
            <label
              key={f.fid}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-muted"
            >
              <Checkbox
                checked={selected.has(f.fid)}
                onCheckedChange={(c) => {
                  const next = new Set(selected);
                  if (c) next.add(f.fid);
                  else next.delete(f.fid);
                  setSelected(next);
                  setInterventions({});
                }}
              />
              <span className="min-w-0 flex-1 truncate">{f.displayName}</span>
            </label>
          ))}
        </div>

        {/* 엣지 안정성(부트스트랩) */}
        <label className="mt-3 flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-muted">
          <Checkbox checked={bootstrap} onCheckedChange={(c) => setBootstrap(!!c)} />
          <span className="min-w-0 flex-1">엣지 안정성 검사</span>
        </label>
        <p className="px-1.5 text-[10px] leading-relaxed text-muted-foreground/60">
          재표집 200회로 각 엣지의 재현 빈도(%)를 그래프에 표시합니다.
        </p>

        {/* 배경지식 제약 */}
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            배경지식
          </div>
          {activeConstraints.length > 0 && (
            <div className="mb-2 space-y-1">
              {activeConstraints.map((c, i) => (
                <div key={`${c.a}-${c.b}-${i}`} className="flex items-center gap-1.5">
                  <Lozenge tone={c.kind === "forbidden" ? "danger" : "discovery"}>
                    {c.kind === "forbidden" ? "금지" : "필수"}
                  </Lozenge>
                  <span className="min-w-0 flex-1 truncate text-[11px]">
                    {nameOf(c.a)} {c.kind === "forbidden" ? "✕" : "→"} {nameOf(c.b)}
                  </span>
                  <button
                    type="button"
                    aria-label="제약 제거"
                    className="shrink-0 text-muted-foreground/60 hover:text-foreground"
                    onClick={() => setConstraints((prev) => prev.filter((x) => x !== c))}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <ConstraintAdder
            fields={candidates.filter((f) => selected.has(f.fid))}
            onAdd={(a, b, kind) =>
              setConstraints((prev) =>
                prev.some((c) => c.a === a && c.b === b && c.kind === kind)
                  ? prev
                  : [...prev, { a, b, kind }],
              )
            }
          />
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">
          PC 알고리즘(조건부 독립 검정)으로 구조를 추정합니다. 변수는 8개 이하 권장.
        </p>
      </aside>

      {/* 그래프 */}
      <div className="bi-dots flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 p-3">
          {!analysis ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <TriangleAlert className="size-5 text-muted-foreground/60" />
              <div className="text-sm text-muted-foreground">
                {selected.size < 2 ? "변수를 2개 이상 선택하세요" : "결측 없는 행이 부족해 분석할 수 없습니다 (최소 30행)"}
              </div>
            </div>
          ) : (
            <CausalGraphSvg
              analysis={analysis}
              targetIdx={targetIdx >= 0 ? targetIdx : null}
              onPickTarget={(i) => {
                setTargetFid(analysis.fields[i].fid);
                setInterventions({});
              }}
            />
          )}
        </div>

        {/* AI 해석 */}
        <div className="shrink-0 border-t border-border p-3">
          {aiState === "loading" && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="size-3.5 animate-pulse motion-reduce:animate-none" /> AI가 구조를 해석하는 중…
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          )}
          {aiState === "done" && narrative && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" /> AI 해석
              </div>
              <p className="text-[13px] leading-relaxed">{narrative}</p>
            </div>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
            <TriangleAlert className="size-3 shrink-0" />
            관측 데이터의 선형·가우시안 근사입니다 — 인과 방향을 보장하지 않습니다. 실선=방향 추정, 점선=무방향.
          </p>
        </div>
      </div>

      {/* What-if */}
      <aside className="w-80 shrink-0 overflow-y-auto border-l border-border p-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          What-if (do-개입)
        </div>
        {!analysis ? (
          <p className="text-xs text-muted-foreground">그래프를 먼저 만드세요.</p>
        ) : (
          <>
            <Select
              value={targetFid ?? ""}
              onValueChange={(v) => {
                setTargetFid(v);
                setInterventions({});
              }}
            >
              <SelectTrigger className="mb-4 w-full">
                <SelectValue placeholder="타깃 변수 선택 (그래프 노드 클릭)" />
              </SelectTrigger>
              <SelectContent>
                {analysis.fields.map((f) => (
                  <SelectItem key={f.fid} value={f.fid}>
                    {f.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!targetField ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                타깃을 고르면 방향이 추정된 부모 변수를 조절해 예상 변화를 봅니다.
              </p>
            ) : parents.length === 0 ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                “{targetField.displayName}”와(과) 연결된 변수가 없습니다. 변수 조합을 바꿔 보세요.
              </p>
            ) : (
              <>
                {assocMode && (
                  <p className="mb-3 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    방향이 확정되지 않아(마르코프 동치) <b>인접 변수 연관 회귀</b>로 예측합니다.
                  </p>
                )}
                <div className="space-y-4">
                  {parents.map(({ field, i }) => {
                    const sigma = interventions[field.fid] ?? 0;
                    const raw = sigma * (field.profile.stdev ?? 0);
                    return (
                      <div key={field.fid}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                          <span className="min-w-0 truncate text-[13px] font-medium">{field.displayName}</span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {sigma >= 0 ? "+" : ""}
                            {formatNumber(raw)} ({sigma.toFixed(1)}σ)
                          </span>
                        </div>
                        <Slider
                          value={[sigma]}
                          min={-2}
                          max={2}
                          step={0.1}
                          aria-label={`${field.displayName} 개입량`}
                          onValueChange={([v]) =>
                            setInterventions((prev) => ({ ...prev, [field.fid]: v }))
                          }
                        />
                        <div className="mt-1 text-[10px] tabular-nums text-muted-foreground/60">
                          β = {(assocMode ? analysis.assocBeta : analysis.beta)[targetIdx][i].toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Card className="mt-5 gap-1 p-3.5">
                  <div className="text-xs text-muted-foreground">예상 {targetField.displayName} 변화</div>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-2xl font-semibold tabular-nums tracking-tight",
                      targetDeltaRaw > 0 ? "text-chart-2" : targetDeltaRaw < 0 ? "text-chart-4" : "",
                    )}
                  >
                    {targetDeltaRaw > 0 ? (
                      <TrendingUp className="size-5" />
                    ) : targetDeltaRaw < 0 ? (
                      <TrendingDown className="size-5" />
                    ) : null}
                    {targetDeltaRaw >= 0 ? "+" : ""}
                    {formatNumber(targetDeltaRaw)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Lozenge tone="info">
                      R² {(assocMode ? analysis.assocR2 : analysis.r2)[targetIdx].toFixed(2)}
                    </Lozenge>
                    <span className="text-[10px] tabular-nums text-muted-foreground/60">
                      {targetDeltaSigma >= 0 ? "+" : ""}
                      {targetDeltaSigma.toFixed(2)}σ · n={analysis.n.toLocaleString()}
                    </span>
                  </div>
                </Card>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => setInterventions({})}
                >
                  <RotateCcw className="size-3.5" /> 초기화
                </Button>
              </>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

/**
 * AiPanel — 우측 AI 챗 (GOAL_UIUX §6.1)
 * 자연어 → ChartSpec. 응답 차트는 캔버스를 덮지 않고 미리보기 카드로 제안되며
 * [캔버스에 열기]가 명시적 수용이다. 하단에 Copilot 다음 탐색 제안 칩.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  CircleStop,
  Compass,
  RefreshCw,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DirectLlmMessage, DirectLlmTargetModel } from "@/lib/miso-sdk/miso-llm";
import type { BiDatasetRecord, ChartSpec, DataTable } from "@/lib/bi-types";
import {
  buildNeighborSpecs,
  nl2chartStream,
  rankNeighbors,
  resolveModel,
  retryResolveModel,
  type Nl2ChartHandle,
} from "@/lib/bi-ai";
import { BiChart } from "./bi-chart";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  spec?: ChartSpec | null;
  streaming?: boolean;
  error?: boolean;
}

interface CopilotChip {
  title: string;
  reason?: string;
  spec: ChartSpec;
}

function exampleQuestions(table: DataTable): string[] {
  const fields = table.fields.filter((f) => !f.hidden);
  const t = fields.find((f) => f.semanticType === "temporal");
  const m = fields.find((f) => f.analyticType === "measure");
  const d = fields.find(
    (f) => f.analyticType === "dimension" && f.semanticType !== "temporal" && f.profile.distinctCount <= 30,
  );
  const out: string[] = [];
  if (t && m) out.push(`${t.displayName}별 ${m.displayName} 추이 보여줘`);
  if (d && m) out.push(`${d.displayName}별 ${m.displayName} 비교해줘`);
  if (d && m) out.push(`${m.displayName} 상위 5개 ${d.displayName}는?`);
  return out.slice(0, 3);
}

export function AiPanel({
  record,
  table,
  currentSpec,
  onOpenSpec,
}: {
  record: BiDatasetRecord;
  table: DataTable;
  currentSpec: ChartSpec | null;
  onOpenSpec: (spec: ChartSpec) => void;
}) {
  const [modelState, setModelState] = useState<"checking" | "ready" | "unavailable">("checking");
  const modelRef = useRef<DirectLlmTargetModel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chips, setChips] = useState<CopilotChip[]>([]);
  const streamRef = useRef<Nl2ChartHandle | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streaming = messages.some((m) => m.streaming);

  const checkModel = useCallback(async (retry = false) => {
    setModelState("checking");
    const model = retry ? await retryResolveModel() : await resolveModel();
    modelRef.current = model;
    setModelState(model ? "ready" : "unavailable");
  }, []);

  useEffect(() => {
    void checkModel();
  }, [checkModel]);

  // Copilot 제안 — 캔버스 idle 3초 후 갱신 (GOAL §8.4)
  const specKey = currentSpec ? JSON.stringify(currentSpec.encodings) : "";
  useEffect(() => {
    if (!currentSpec || !specKey || modelState !== "ready") {
      if (!currentSpec) setChips([]);
      return;
    }
    const neighbors = buildNeighborSpecs(table, currentSpec);
    if (neighbors.length === 0) {
      setChips([]);
      return;
    }
    const timer = setTimeout(() => {
      rankNeighbors(record, table, currentSpec, neighbors)
        .then((picks) =>
          setChips(picks.map((p) => ({ ...neighbors[p.index], reason: p.reason }))),
        )
        .catch(() => setChips(neighbors.slice(0, 3))); // LLM 실패 → 규칙 상위 3개 (G4)
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specKey, modelState]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = (question: string) => {
    const q = question.trim();
    if (!q || streaming || !modelRef.current) return;
    setInput("");

    const history: DirectLlmMessage[] = messages
      .filter((m) => !m.error)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.text }));

    setMessages((prev) => [
      ...prev,
      { role: "user", text: q },
      { role: "assistant", text: "", streaming: true },
    ]);

    streamRef.current = nl2chartStream(
      {
        record,
        table,
        question: q,
        currentSpec,
        history,
        model: modelRef.current,
      },
      {
        onAnswer: (partial) =>
          setMessages((prev) =>
            prev.map((m, i) => (i === prev.length - 1 ? { ...m, text: partial } : m)),
          ),
        onDone: (result) =>
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1
                ? { ...m, text: result.answer || "차트를 만들었습니다.", spec: result.spec, streaming: false }
                : m,
            ),
          ),
        onError: (message) =>
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1
                ? { ...m, text: `요청에 실패했습니다: ${message}`, streaming: false, error: true }
                : m,
            ),
          ),
      },
    );
  };

  const stop = () => {
    streamRef.current?.abort();
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false, text: m.text || "(중지됨)" } : m)),
    );
  };

  if (modelState === "unavailable") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <Sparkles className="size-6 text-muted-foreground/50" />
        <div className="text-sm font-medium text-muted-foreground">AI 모델이 연결되지 않았습니다</div>
        <p className="text-xs leading-relaxed text-muted-foreground/70">
          MISO에서 이 앱에 direct LLM 모델을 연결하면 자연어 차트 생성·자동 해석을 쓸 수 있습니다.
          수동 탐색 기능은 모두 그대로 동작합니다.
        </p>
        <Button variant="outline" size="sm" onClick={() => void checkModel(true)}>
          <RefreshCw className="size-3.5" /> 다시 확인
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 대화 */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="size-4.5 text-primary" />
            </div>
            <div className="text-sm font-medium">무엇이 궁금한가요?</div>
            <p className="text-xs text-muted-foreground">
              질문하면 차트로 답합니다. 만든 차트는 shelf에서 이어서 조작할 수 있어요.
            </p>
            <div className="mt-1 flex flex-col gap-1.5">
              {exampleQuestions(table).map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  size="sm"
                  className="h-auto whitespace-normal py-1.5 text-xs font-normal"
                  onClick={() => send(q)}
                  disabled={modelState !== "ready"}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" && "justify-end")}>
                {m.role === "assistant" && (
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="size-3 text-primary" />
                  </div>
                )}
                <div className={cn("min-w-0 max-w-[85%] space-y-2", m.role === "user" && "flex flex-col items-end")}>
                  {(m.text || m.streaming) && (
                    <div
                      className={cn(
                        "rounded-xl px-3 py-2 text-[13px] leading-relaxed",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : m.error
                            ? "border border-destructive/30 bg-destructive/5 text-destructive"
                            : "bg-muted",
                      )}
                    >
                      {m.text}
                      {m.streaming && <span aria-hidden="true" className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-current align-middle motion-reduce:animate-none" />}
                    </div>
                  )}
                  {m.spec && (
                    <Card className="w-full gap-2 overflow-hidden p-2.5">
                      {m.spec.meta.title && (
                        <div className="truncate text-xs font-medium">{m.spec.meta.title}</div>
                      )}
                      <div className="h-32">
                        <BiChart table={table} spec={m.spec} compact />
                      </div>
                      <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => onOpenSpec(m.spec!)}>
                        <Compass className="size-3.5" /> 캔버스에 열기
                      </Button>
                    </Card>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <User className="size-3 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Copilot 제안 */}
      {chips.length > 0 && (
        <div className="shrink-0 border-t border-border px-3 py-2">
          <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">다음 탐색 제안</div>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onOpenSpec(c.spec)}
                title={c.reason}
                className="inline-flex h-7 max-w-full items-center gap-1 truncate rounded-full border border-border px-2.5 text-xs transition-colors hover:border-ring hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Sparkles className="size-3 shrink-0 text-primary" />
                <span className="truncate">{c.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 입력 */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-1.5">
          <Textarea
            aria-label="AI 질문 입력"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={modelState === "checking" ? "AI 연결 확인 중…" : "무엇이 궁금한가요…"}
            disabled={modelState !== "ready"}
            className="max-h-28 min-h-9 resize-none text-[13px]"
            rows={1}
          />
          {streaming ? (
            <Button size="icon" variant="outline" className="size-9 shrink-0" aria-label="생성 중지" onClick={stop}>
              <CircleStop className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="size-9 shrink-0"
              aria-label="질문 보내기"
              disabled={!input.trim() || modelState !== "ready"}
              onClick={() => send(input)}
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

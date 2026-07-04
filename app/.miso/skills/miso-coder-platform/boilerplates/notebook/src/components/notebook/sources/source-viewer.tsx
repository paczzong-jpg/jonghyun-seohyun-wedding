import { useEffect, useMemo, useState } from "react";

import { ChevronDown, ChevronUp, ExternalLink, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { SOURCE_TYPE_LABEL, SourceIcon } from "@/components/notebook/shared/source-icon";

import { deleteSource, getSourceText, updateSource } from "@/lib/notebook/db";
import type { ContextMode, Source } from "@/lib/notebook/types";

const MODES: Array<{ key: ContextMode; label: string; hint: string }> = [
  { key: "full", label: "전문", hint: "원문 전체를 컨텍스트로" },
  { key: "summary", label: "요약만", hint: "AI 요약만 컨텍스트로" },
  { key: "off", label: "제외", hint: "채팅에서 사용 안 함" },
];

/** 표시 상한 — 초대형 문서 렌더 가드 */
const DISPLAY_CAP = 120_000;
const MAX_MARKS = 200;

export function SourceViewer({
  state,
  onClose,
  onChanged,
  onAsk,
}: {
  state: { source: Source; find?: string } | null;
  onClose: () => void;
  onChanged: () => Promise<Source[]>;
  onAsk?: (question: string) => void;
}) {
  const source = state?.source ?? null;
  const [text, setText] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);

  useEffect(() => {
    setText(null);
    setQuery(state?.find ?? "");
    setMatchIndex(0);
    if (state?.source && state.source.status === "ready") {
      getSourceText(state.source.id).then(setText).catch(console.error);
    }
  }, [state]);

  const display = useMemo(() => (text ?? "").slice(0, DISPLAY_CAP), [text]);

  // 검색 매치 위치 (디바운스 없이 memo — display 캡으로 비용 제한)
  const matches = useMemo(() => {
    if (!query.trim() || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    const lower = display.toLowerCase();
    const out: number[] = [];
    let at = lower.indexOf(q);
    while (at >= 0 && out.length < MAX_MARKS) {
      out.push(at);
      at = lower.indexOf(q, at + q.length);
    }
    return out;
  }, [display, query]);

  useEffect(() => {
    setMatchIndex(0);
  }, [matches.length]);

  useEffect(() => {
    if (matches.length > 0) {
      document
        .getElementById(`nb-match-${matchIndex}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [matchIndex, matches]);

  if (!source) return null;

  const setMode = async (mode: ContextMode) => {
    await updateSource(source.id, { context_mode: mode });
    await onChanged();
  };

  const rename = async (title: string) => {
    if (!title.trim() || title === source.title) return;
    await updateSource(source.id, { title: title.trim() });
    await onChanged();
  };

  const remove = async () => {
    if (!window.confirm(`'${source.title}' 소스를 삭제할까요?`)) return;
    await deleteSource(source.id);
    await onChanged();
    toast.success("소스를 삭제했습니다");
    onClose();
  };

  const segments = (() => {
    if (matches.length === 0) return [display];
    const q = query.trim().length;
    const out: Array<string | { i: number; text: string }> = [];
    let prev = 0;
    matches.forEach((at, i) => {
      out.push(display.slice(prev, at));
      out.push({ i, text: display.slice(at, at + q) });
      prev = at + q;
    });
    out.push(display.slice(prev));
    return out;
  })();

  return (
    <Sheet open={!!state} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5">
          <div className="flex items-start gap-3">
            <SourceIcon type={source.type} size={38} />
            <div className="min-w-0 flex-1">
              <SheetTitle asChild>
                <input
                  key={source.title}
                  defaultValue={source.title}
                  onBlur={(e) => rename(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className="w-full truncate rounded-md bg-transparent text-[16px] font-extrabold tracking-tight outline-none hover:bg-muted focus:bg-muted"
                  aria-label="소스 제목"
                />
              </SheetTitle>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
                <span className="font-bold">{SOURCE_TYPE_LABEL[source.type]}</span>
                {source.char_count > 0 && (
                  <span>{source.char_count.toLocaleString()}자</span>
                )}
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                  >
                    원본 열기 <ExternalLink size={11} />
                  </a>
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-none text-muted-foreground hover:text-destructive"
              onClick={remove}
              aria-label="소스 삭제"
            >
              <Trash2 size={15} />
            </Button>
          </div>

          {/* 컨텍스트 모드 */}
          <div className="mt-3 flex rounded-full border border-border bg-muted/50 p-0.5">
            {MODES.map((mode) => (
              <button
                key={mode.key}
                type="button"
                title={mode.hint}
                onClick={() => setMode(mode.key)}
                className={`flex-1 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
                  source.context_mode === mode.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="nb-scroll flex-1 px-5 py-4">
          {source.summary && (
            <section>
              <h3 className="text-[12px] font-extrabold uppercase tracking-wide text-muted-foreground">
                요약
              </h3>
              <p className="mt-1.5 rounded-xl bg-secondary/50 px-3.5 py-3 text-[13.5px] leading-relaxed">
                {source.summary}
              </p>
            </section>
          )}

          {source.topics.length > 0 && (
            <section className="mt-4">
              <h3 className="text-[12px] font-extrabold uppercase tracking-wide text-muted-foreground">
                핵심 토픽
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {source.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </section>
          )}

          {onAsk && source.questions.length > 0 && (
            <section className="mt-4">
              <h3 className="text-[12px] font-extrabold uppercase tracking-wide text-muted-foreground">
                이 소스에 물어보기
              </h3>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {source.questions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => onAsk(question)}
                    className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors hover:border-primary/40 hover:bg-secondary/40"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[12px] font-extrabold uppercase tracking-wide text-muted-foreground">
                원문
              </h3>
              {matches.length > 0 && (
                <span className="flex items-center gap-1 text-[11.5px] font-semibold text-muted-foreground">
                  {matchIndex + 1} / {matches.length}
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted"
                    onClick={() => setMatchIndex((i) => (i - 1 + matches.length) % matches.length)}
                    aria-label="이전 결과"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted"
                    onClick={() => setMatchIndex((i) => (i + 1) % matches.length)}
                    aria-label="다음 결과"
                  >
                    <ChevronDown size={13} />
                  </button>
                </span>
              )}
            </div>
            <div className="relative mt-1.5">
              <Search
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="원문에서 찾기"
                className="h-8 pl-8 text-[12.5px]"
              />
            </div>
            <div className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-card px-4 py-3.5 text-[13px] leading-[1.75] text-foreground/90">
              {text === null ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={13} className="animate-spin" /> 원문 불러오는 중…
                </span>
              ) : (
                <>
                  {segments.map((seg, i) =>
                    typeof seg === "string" ? (
                      <span key={i}>{seg}</span>
                    ) : (
                      <mark
                        key={i}
                        id={`nb-match-${seg.i}`}
                        className={`rounded px-0.5 ${seg.i === matchIndex ? "bg-primary text-primary-foreground" : "bg-[#FDE68A]"}`}
                      >
                        {seg.text}
                      </mark>
                    ),
                  )}
                  {(text?.length ?? 0) > DISPLAY_CAP && (
                    <p className="mt-3 text-[12px] text-muted-foreground">
                      … 표시 한도를 넘는 나머지 {(text!.length - DISPLAY_CAP).toLocaleString()}자는
                      생략됐습니다 (검색·채팅에는 모두 사용됩니다)
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

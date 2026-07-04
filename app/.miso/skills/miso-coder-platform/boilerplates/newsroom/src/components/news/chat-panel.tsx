import { useEffect, useRef, useState } from "react";
import { Send, Square, Sparkles, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NewsMarkdown } from "./markdown";
import { askNews, generateSessionTitle, type StreamHandle } from "@/lib/news/llm";
import { selectContext } from "@/lib/news/search";
import { listMessages, createMessage, createSession } from "@/lib/news/db";
import type { Article, ChatMessage, ChatSession, CitationRef, Settings } from "@/lib/news/types";

// ────────────────────────────────────────────────
// 대화형 뉴스 Q&A 패널 — 하나의 세션을 담당한다.
//   · selectContext 로 질문에 맞는 기사 컨텍스트(BM25+최신성) 선별
//   · askNews 스트리밍 → 라이브 마크다운 + [n] 인용 칩
//   · 세션이 없으면(신규) 첫 질문 전송 시 세션을 만들고 onSessionCreated 통지
// 세션 전환은 부모가 key 를 바꿔 리마운트한다(메시지 재적재).
// ────────────────────────────────────────────────

const STARTERS = [
  "오늘 가장 중요한 뉴스 3가지는?",
  "이번 주 반도체 업계 흐름 정리해줘",
  "환율 관련 최근 보도 요약해줘",
];

interface Props {
  session: ChatSession | null;
  corpus: Article[];
  settings: Settings;
  keywords: string[];
  seedQuestion?: string;
  onSessionCreated?: (session: ChatSession) => void;
  onCite?: (ref: CitationRef) => void;
}

export function ChatPanel({ session, corpus, settings, keywords, seedQuestion, onSessionCreated, onCite }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<{ content: string; refs: CitationRef[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const handleRef = useRef<StreamHandle | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const seededRef = useRef(false);

  // 세션 메시지 적재 (신규 세션은 빈 상태)
  useEffect(() => {
    let alive = true;
    if (!session) {
      setMessages([]);
      return;
    }
    listMessages(session.id)
      .then((rows) => {
        if (alive) setMessages(rows);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [session]);

  // 언마운트 시 진행 중 스트림 중단
  useEffect(() => () => handleRef.current?.abort(), []);

  // 자동 스크롤
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function send(rawQuestion: string) {
    const question = rawQuestion.trim();
    if (!question || busy) return;
    setInput("");
    setBusy(true);

    // 신규 세션이면 먼저 만든다
    let active = session;
    if (!active) {
      try {
        const title = await generateSessionTitle(question);
        active = await createSession(title);
        onSessionCreated?.(active);
      } catch {
        setBusy(false);
        toast.error("대화를 시작하지 못했어요.");
        return;
      }
    }

    const history = messages;
    let userMsg: ChatMessage;
    try {
      userMsg = await createMessage({ session: active.id, role: "user", content: question, citations: [] });
    } catch {
      setBusy(false);
      toast.error("메시지 저장에 실패했어요.");
      return;
    }
    setMessages((prev) => [...prev, userMsg]);
    setStreaming({ content: "", refs: [] });

    const context = selectContext(corpus, question, 8);
    try {
      const { handle, refs } = await askNews(
        question,
        context,
        history,
        { tone: settings.tone, keywords },
        {
          onChunk: (_delta, full) => setStreaming({ content: full, refs }),
          onDone: async (full) => {
            handleRef.current = null;
            try {
              const saved = await createMessage({
                session: active!.id,
                role: "assistant",
                content: full,
                citations: refs.filter((r) => full.includes(`[${r.n}]`)),
              });
              setMessages((prev) => [...prev, saved]);
            } catch {
              /* 저장 실패해도 화면엔 남긴다 */
            }
            setStreaming(null);
            setBusy(false);
          },
          onError: (err) => {
            handleRef.current = null;
            setStreaming(null);
            setBusy(false);
            toast.error(err.message || "답변 생성 중 오류가 발생했어요.");
          },
        },
      );
      handleRef.current = handle;
      setStreaming({ content: "", refs });
    } catch (err) {
      setStreaming(null);
      setBusy(false);
      toast.error((err as Error).message || "답변 생성에 실패했어요.");
    }
  }

  function stop() {
    handleRef.current?.abort();
    handleRef.current = null;
    setStreaming(null);
    setBusy(false);
  }

  // seedQuestion 자동 전송 (스토리의 추천 질문 → 채팅 진입)
  useEffect(() => {
    if (seedQuestion && !seededRef.current && corpus.length > 0) {
      seededRef.current = true;
      void send(seedQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuestion, corpus.length]);

  const empty = messages.length === 0 && !streaming;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-1 py-4">
        {empty && (
          <div className="mx-auto max-w-xl px-4 py-10 text-center">
            <MessageSquareText className="mx-auto mb-3 size-8 text-[var(--nw-ink-3)]" />
            <h2 className="nw-lead mb-1.5">무엇이든 물어보세요</h2>
            <p className="nw-meta mb-5">수집된 기사만 근거로, 출처를 붙여 답해드려요.</p>
            <div className="flex flex-col gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="flex items-center gap-2 rounded-lg border border-[var(--nw-hairline)] px-3.5 py-2.5 text-left text-sm transition-colors hover:border-[var(--nw-accent)] hover:bg-[var(--nw-surface-2)]"
                >
                  <Sparkles className="size-4 shrink-0 text-[var(--nw-accent)]" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--nw-accent)] px-4 py-2.5 text-[15px] leading-relaxed text-white">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="max-w-[92%]">
              <NewsMarkdown content={m.content} refs={m.citations} onCite={onCite} />
            </div>
          ),
        )}

        {streaming && (
          <div className="max-w-[92%]">
            <NewsMarkdown content={streaming.content} refs={streaming.refs} onCite={onCite} streaming />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-[var(--nw-hairline)] bg-[var(--nw-surface)] p-3"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="예: 최근 AI 반도체 수출 규제 어떻게 됐어?"
            rows={1}
            className="max-h-32 min-h-[44px] resize-none bg-[var(--nw-surface-2)]"
          />
          {busy ? (
            <Button type="button" variant="secondary" size="icon" onClick={stop} aria-label="중단">
              <Square className="size-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label="전송">
              <Send className="size-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

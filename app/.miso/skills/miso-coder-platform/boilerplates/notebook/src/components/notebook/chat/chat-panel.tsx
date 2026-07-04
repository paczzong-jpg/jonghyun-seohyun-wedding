import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  MessageCircle,
  NotebookPen,
  Plus,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Textarea } from "@/components/ui/textarea";

import { Markdown } from "@/components/notebook/shared/markdown";

import {
  createMessage,
  createNote,
  createSession,
  deleteMessage,
  deleteSession,
  listMessages,
  listSessions,
  renameSession,
  touchSession,
} from "@/lib/notebook/db";
import {
  askNotebook,
  generateSessionTitle,
  suggestQuestions,
  type ChatStreamHandle,
  type NotebookContext,
} from "@/lib/notebook/llm";
import type { ChatMessage, ChatSession, CitationRef, Source } from "@/lib/notebook/types";

export function ChatPanel({
  notebookId,
  sources,
  getContext,
  onOpenSource,
  injectedQuestion,
  onInjectedConsumed,
}: {
  notebookId: string;
  sources: Source[];
  getContext: () => Promise<NotebookContext>;
  onOpenSource: (sourceId: string, find?: string) => void;
  injectedQuestion?: string | null;
  onInjectedConsumed?: () => void;
}) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const streamHandle = useRef<ChatStreamHandle | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const readySources = useMemo(() => sources.filter((s) => s.status === "ready"), [sources]);
  const activeCount = useMemo(
    () => readySources.filter((s) => s.context_mode !== "off").length,
    [readySources],
  );

  // 세션 로드
  useEffect(() => {
    listSessions(notebookId).then((list) => {
      setSessions(list);
      setActiveId(list[0]?.id ?? null);
    });
  }, [notebookId]);

  // 메시지 로드
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    listMessages(activeId).then(setMessages);
  }, [activeId]);

  // 추천 질문 — 소스 브리프에서 수집, 부족하면 LLM 생성
  useEffect(() => {
    const fromSources = Array.from(new Set(readySources.flatMap((s) => s.questions))).slice(0, 4);
    if (fromSources.length >= 3) {
      setSuggested(fromSources);
    } else if (readySources.length > 0) {
      getContext()
        .then(suggestQuestions)
        .then(setSuggested)
        .catch(() => setSuggested(fromSources));
    } else {
      setSuggested([]);
    }
  }, [readySources, getContext]);

  // 주입 질문 (소스 뷰어 "이 소스에 물어보기")
  useEffect(() => {
    if (injectedQuestion) {
      setInput(injectedQuestion);
      onInjectedConsumed?.();
      inputRef.current?.focus();
    }
  }, [injectedQuestion, onInjectedConsumed]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }, []);

  useEffect(scrollToBottom, [messages, streaming, scrollToBottom]);

  const send = async (raw?: string) => {
    const question = (raw ?? input).trim();
    if (!question || busy) return;
    if (activeCount === 0) {
      toast.error("사용할 소스가 없습니다. 소스를 추가하거나 컨텍스트 제외를 해제해주세요.");
      return;
    }
    setInput("");
    setBusy(true);
    setStreaming("");

    try {
      // 세션 확보
      let sessionId = activeId;
      let isNewSession = false;
      if (!sessionId) {
        const session = await createSession(notebookId, "새 대화");
        sessionId = session.id;
        isNewSession = true;
        setSessions((prev) => [session, ...prev]);
        setActiveId(session.id);
      }

      const userMessage = await createMessage({
        session: sessionId,
        notebook: notebookId,
        role: "user",
        content: question,
      });
      const history = messages;
      setMessages((prev) => [...prev, userMessage]);

      const context = await getContext();
      const handle = await askNotebook(question, history, context, {
        onChunk: (_, full) => setStreaming(full),
        onDone: async (full, citations) => {
          streamHandle.current = null;
          if (full.trim()) {
            const assistant = await createMessage({
              session: sessionId!,
              notebook: notebookId,
              role: "assistant",
              content: full,
              citations,
            });
            setMessages((prev) => [...prev, assistant]);
          }
          setStreaming(null);
          setBusy(false);
          await touchSession(sessionId!);
          if (isNewSession || history.length === 0) {
            const title = await generateSessionTitle(question);
            await renameSession(sessionId!, title);
            setSessions((prev) =>
              prev.map((s) => (s.id === sessionId ? { ...s, title } : s)),
            );
          }
        },
        onError: (error) => {
          streamHandle.current = null;
          setStreaming(null);
          setBusy(false);
          toast.error(`응답 생성 실패: ${error.message}`);
        },
      });
      streamHandle.current = handle;
    } catch (error) {
      setStreaming(null);
      setBusy(false);
      toast.error(error instanceof Error ? error.message : "요청에 실패했습니다");
    }
  };

  const abort = () => {
    streamHandle.current?.abort();
    streamHandle.current = null;
  };

  const regenerate = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || busy) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant) {
      await deleteMessage(lastAssistant.id);
    }
    const trimmed = messages.filter((m) => m.id !== lastAssistant?.id && m.id !== lastUser.id);
    await deleteMessage(lastUser.id);
    setMessages(trimmed);
    await send(lastUser.content);
  };

  const newSession = () => {
    setActiveId(null);
    setMessages([]);
    inputRef.current?.focus();
  };

  const removeSession = async (id: string) => {
    if (!window.confirm("이 대화를 삭제할까요?")) return;
    await deleteSession(id);
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  const saveNote = async (message: ChatMessage) => {
    const title = message.content.replace(/[#*`>\-\n]/g, " ").trim().slice(0, 40);
    await createNote({
      notebook: notebookId,
      title: title || "채팅 답변",
      content: message.content,
      kind: "ai",
      origin: "채팅 저장",
    });
    toast.success("노트에 저장했습니다 — 스튜디오 패널에서 확인하세요");
  };

  const activeSession = sessions.find((s) => s.id === activeId);

  return (
    <section className="nb-panel w-full">
      <header className="nb-panel-header">
        <span className="nb-panel-title">
          <MessageCircle size={15} className="text-muted-foreground" />
          채팅
        </span>
        <div className="flex items-center gap-1.5">
          <span className="hidden text-[11.5px] font-semibold text-muted-foreground sm:block">
            소스 {activeCount}개 사용
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 max-w-44 gap-1 px-2 text-[12px] font-bold">
                <span className="truncate">{activeSession?.title ?? "새 대화"}</span>
                <ChevronDown size={13} className="flex-none text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={newSession}>
                <Plus size={14} /> 새 대화
              </DropdownMenuItem>
              {sessions.length > 0 && <DropdownMenuSeparator />}
              {sessions.map((session) => (
                <DropdownMenuItem
                  key={session.id}
                  onClick={() => setActiveId(session.id)}
                  className={session.id === activeId ? "bg-secondary" : ""}
                >
                  <span className="min-w-0 flex-1 truncate">{session.title || "대화"}</span>
                  <button
                    type="button"
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSession(session.id);
                    }}
                    aria-label="대화 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="nb-scroll flex-1 px-4 py-4 sm:px-6">
        {messages.length === 0 && streaming === null ? (
          <EmptyChat
            hasSources={activeCount > 0}
            suggested={suggested}
            onPick={(q) => send(q)}
          />
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {messages.map((message, i) => (
              <MessageItem
                key={message.id}
                message={message}
                sources={sources}
                isLast={i === messages.length - 1}
                busy={busy}
                onOpenSource={onOpenSource}
                onCopy={() => {
                  navigator.clipboard.writeText(message.content);
                  toast.success("복사했습니다");
                }}
                onSaveNote={() => saveNote(message)}
                onRegenerate={regenerate}
              />
            ))}
            {streaming !== null && (
              <div className="nb-fade-up">
                {streaming ? (
                  <Markdown content={streaming} />
                ) : (
                  <span className="nb-typing" aria-label="응답 생성 중">
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="flex-none border-t border-[var(--nb-hairline)] p-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-[var(--nb-shadow-card)] focus-within:border-ring">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              activeCount > 0
                ? "소스에 대해 무엇이든 물어보세요"
                : "먼저 소스를 추가해주세요"
            }
            disabled={activeCount === 0}
            rows={1}
            className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent p-1.5 text-[14px] shadow-none focus-visible:ring-0"
          />
          {busy ? (
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 flex-none rounded-xl"
              onClick={abort}
              aria-label="생성 중단"
            >
              <Square size={14} fill="currentColor" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-9 w-9 flex-none rounded-xl"
              disabled={!input.trim() || activeCount === 0}
              onClick={() => send()}
              aria-label="보내기"
            >
              <ArrowUp size={16} strokeWidth={2.6} />
            </Button>
          )}
        </div>
        <p className="mx-auto mt-1.5 max-w-2xl px-1 text-[11px] text-[var(--nb-ink-faint)]">
          답변은 소스에 근거하며 [번호] 인용으로 출처를 확인할 수 있습니다
        </p>
      </div>
    </section>
  );
}

// ── 빈 상태 ────────────────────────────────────

function EmptyChat({
  hasSources,
  suggested,
  onPick,
}: {
  hasSources: boolean;
  suggested: string[];
  onPick: (question: string) => void;
}) {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center pb-8 text-center">
      <span className="grid h-13 w-13 place-items-center rounded-2xl bg-secondary p-3 text-secondary-foreground">
        <MessageCircle size={24} strokeWidth={1.8} />
      </span>
      <h2 className="mt-4 text-[16.5px] font-extrabold tracking-tight">
        {hasSources ? "소스에 대해 물어보세요" : "소스를 기다리고 있어요"}
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        {hasSources
          ? "모든 답변에는 근거 소스가 [번호]로 인용됩니다"
          : "좌측에서 소스를 추가하면 대화를 시작할 수 있습니다"}
      </p>
      {hasSources && suggested.length > 0 && (
        <div className="mt-5 flex w-full flex-col gap-2">
          {suggested.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onPick(question)}
              className="nb-fade-up rounded-xl border border-border bg-card px-4 py-3 text-left text-[13px] font-medium shadow-[var(--nb-shadow-card)] transition-all hover:-translate-y-px hover:border-primary/40 hover:bg-secondary/40"
            >
              {question}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 메시지 ─────────────────────────────────────

function MessageItem({
  message,
  sources,
  isLast,
  busy,
  onOpenSource,
  onCopy,
  onSaveNote,
  onRegenerate,
}: {
  message: ChatMessage;
  sources: Source[];
  isLast: boolean;
  busy: boolean;
  onOpenSource: (sourceId: string) => void;
  onCopy: () => void;
  onSaveNote: () => void;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[var(--nb-user-bubble)] px-4 py-2.5 text-[14px] leading-relaxed text-foreground">
          {message.content}
        </p>
      </div>
    );
  }

  const citations = message.citations ?? [];

  return (
    <div className="group nb-fade-up">
      <Markdown
        content={message.content}
        citations={citations}
        onCiteClick={(ref) => onOpenSource(ref.source_id)}
      />

      {citations.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-[var(--nb-ink-faint)]">출처</span>
          {citations.map((ref) => (
            <CitationCard
              key={ref.n}
              citation={ref}
              source={sources.find((s) => s.id === ref.source_id)}
              onOpen={() => onOpenSource(ref.source_id)}
            />
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={() => {
            onCopy();
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
          aria-label="복사"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={onSaveNote}
          aria-label="노트로 저장"
          title="노트로 저장"
        >
          <NotebookPen size={13} />
        </Button>
        {isLast && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onRegenerate}
            disabled={busy}
            aria-label="다시 생성"
            title="다시 생성"
          >
            <RefreshCw size={13} />
          </Button>
        )}
      </div>
    </div>
  );
}

function CitationCard({
  citation,
  source,
  onOpen,
}: {
  citation: CitationRef;
  source?: Source;
  onOpen: () => void;
}) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-1.5 pr-2.5 text-[11.5px] font-bold transition-colors hover:border-primary/40 hover:bg-secondary/50"
        >
          <span className="grid h-4 w-4 place-items-center rounded-full bg-secondary text-[10px] text-secondary-foreground">
            {citation.n}
          </span>
          <span className="max-w-36 truncate">{citation.title}</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-72">
        <p className="text-[12.5px] font-extrabold">{citation.title}</p>
        {source?.summary ? (
          <p className="mt-1 line-clamp-4 text-[12px] leading-relaxed text-muted-foreground">
            {source.summary}
          </p>
        ) : source?.excerpt ? (
          <p className="mt-1 line-clamp-4 text-[12px] leading-relaxed text-muted-foreground">
            {source.excerpt}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onOpen}
          className="mt-2 text-[12px] font-bold text-primary hover:underline"
        >
          원문 보기 →
        </button>
      </HoverCardContent>
    </HoverCard>
  );
}

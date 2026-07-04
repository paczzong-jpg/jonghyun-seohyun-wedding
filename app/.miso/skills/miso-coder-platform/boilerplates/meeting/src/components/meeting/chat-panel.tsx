import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleStopIcon, EraserIcon, SendIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { clearChat, createChatMessage, listChatMessages } from "@/lib/meeting/db";
import { askMeeting, buildTranscriptContext } from "@/lib/meeting/llm";
import { collectAttachmentContext } from "@/lib/meeting/process";
import type { ChatMessage, Meeting, Segment } from "@/lib/meeting/types";
import { Markdown } from "./markdown";

// ────────────────────────────────────────────────
// AI 채팅 — 트랜스크립트+첨부자료 근거 스트리밍 Q&A.
// 답변의 [mm:ss] 인용 칩을 클릭하면 오디오가 그 지점으로 시크된다.
// ────────────────────────────────────────────────

const SUGGESTIONS = [
  "핵심 결정사항을 정리해줘",
  "내가 맡은 액션 아이템이 뭐야?",
  "이 회의를 3줄로 요약해줘",
];

export interface ChatPanelProps {
  meeting: Meeting;
  segments: Segment[];
  /** 첨부 목록 변경 감지용 키 — 바뀌면 자료 컨텍스트를 다시 만든다 */
  attachmentsKey: string;
  onSeek: (sec: number) => void;
}

export function ChatPanel({ meeting, segments, attachmentsKey, onSeek }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  const abortRef = useRef<{ abort: () => void } | null>(null);
  const attachmentCtxRef = useRef<{ key: string; ctx: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const transcriptCtx = useMemo(
    () => buildTranscriptContext(segments, meeting.speaker_names ?? {}),
    [segments, meeting.speaker_names],
  );

  useEffect(() => {
    let alive = true;
    listChatMessages(meeting.id)
      .then((list) => {
        if (alive) setMessages(list);
      })
      .catch(() => toast.error("채팅 기록을 불러오지 못했습니다"));
    return () => {
      alive = false;
    };
  }, [meeting.id]);

  // 새 메시지·스트리밍 갱신 시 맨 아래로
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, draft]);

  const getAttachmentCtx = useCallback(async (): Promise<string> => {
    if (attachmentCtxRef.current?.key === attachmentsKey) return attachmentCtxRef.current.ctx;
    const ctx = await collectAttachmentContext(meeting.id);
    attachmentCtxRef.current = { key: attachmentsKey, ctx };
    return ctx;
  }, [attachmentsKey, meeting.id]);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || streaming) return;
      if (segments.length === 0) {
        toast.error("트랜스크립트가 준비된 후에 질문할 수 있습니다");
        return;
      }
      setInput("");
      setStreaming(true);
      setDraft("");

      // 낙관적 표시 + 저장
      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        meeting: meeting.id,
        role: "user",
        content: trimmed,
        citations: [],
        created: new Date().toISOString(),
      };
      const history = [...messages];
      setMessages((prev) => [...prev, optimistic]);
      createChatMessage({ meeting: meeting.id, role: "user", content: trimmed }).catch(() => undefined);

      try {
        const attachmentCtx = await getAttachmentCtx();
        const handle = await askMeeting(
          trimmed,
          history,
          transcriptCtx,
          attachmentCtx,
          meeting.duration,
          {
            onChunk: (full) => setDraft(full),
            onDone: (full, citations) => {
              setStreaming(false);
              setDraft("");
              abortRef.current = null;
              if (!full.trim()) return;
              const assistant: ChatMessage = {
                id: `local-a-${Date.now()}`,
                meeting: meeting.id,
                role: "assistant",
                content: full,
                citations,
                created: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, assistant]);
              createChatMessage({
                meeting: meeting.id,
                role: "assistant",
                content: full,
                citations,
              }).catch(() => undefined);
            },
            onError: (error) => {
              setStreaming(false);
              setDraft("");
              abortRef.current = null;
              toast.error(`답변 생성 실패: ${error.message}`);
            },
          },
        );
        abortRef.current = handle;
      } catch (error) {
        setStreaming(false);
        toast.error(error instanceof Error ? error.message : "답변 생성에 실패했습니다");
      }
    },
    [streaming, segments.length, messages, meeting.id, meeting.duration, transcriptCtx, getAttachmentCtx],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(async () => {
    if (streaming) return;
    try {
      await clearChat(meeting.id);
      setMessages([]);
      toast.success("채팅을 비웠습니다");
    } catch {
      toast.error("채팅 삭제에 실패했습니다");
    }
  }, [meeting.id, streaming]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 메시지 목록 */}
      <div ref={scrollRef} className="mn-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !streaming ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
            <SparklesIcon className="size-6 text-primary" />
            <p className="text-sm text-muted-foreground">
              회의 내용과 첨부자료를 근거로 답합니다.
              <br />
              답변의 타임스탬프를 누르면 그 지점이 재생됩니다.
            </p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:border-primary hover:text-primary"
                  onClick={() => void send(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-3.5 py-2 text-sm text-secondary-foreground">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="max-w-full text-sm">
                  <Markdown onSeek={onSeek}>{message.content}</Markdown>
                </div>
              ),
            )}
            {streaming ? (
              draft ? (
                <div className="max-w-full text-sm">
                  <Markdown onSeek={onSeek}>{draft}</Markdown>
                </div>
              ) : (
                <p className="mn-shimmer text-sm">답변 작성 중…</p>
              )
            ) : null}
          </div>
        )}
      </div>

      {/* 입력 */}
      <div className="border-t border-border p-2.5">
        <form
          className="flex items-end gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          {messages.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground"
              onClick={() => void reset()}
              disabled={streaming}
              title="채팅 비우기"
            >
              <EraserIcon className="size-4" />
            </Button>
          ) : null}
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="회의에 대해 물어보세요…"
            rows={1}
            className="max-h-28 min-h-9 flex-1 resize-none text-sm"
            disabled={streaming}
          />
          {streaming ? (
            <Button type="button" size="icon" variant="outline" className="size-9 shrink-0" onClick={stop} title="중단">
              <CircleStopIcon className="size-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" className="size-9 shrink-0" disabled={!input.trim()} title="보내기">
              <SendIcon className="size-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

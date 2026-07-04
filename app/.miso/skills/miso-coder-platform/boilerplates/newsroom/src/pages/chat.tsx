import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/news/chat-panel";
import { listSessions, deleteSession } from "@/lib/news/db";
import { relativeTime } from "@/lib/news/normalize";
import { useNews } from "./context";
import type { ChatSession } from "@/lib/news/types";

// ────────────────────────────────────────────────
// 대화 — 수집된 코퍼스를 근거로 한 뉴스 질의응답([n] 인용).
//   · 좌측 세션 목록, 우측 대화. 세션 전환/신규는 chatKey 로 ChatPanel 리마운트
//   · 신규 세션 최초 전송으로 만들어진 세션은 리마운트하지 않음(스트리밍 유지)
// ────────────────────────────────────────────────

export function ChatPage() {
  const location = useLocation();
  const { articles, settings, keywords, onCite, booting } = useNews();
  const seed = (location.state as { seed?: string } | null)?.seed;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [active, setActive] = useState<ChatSession | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const seededRef = useRef(false);

  const refreshSessions = useCallback(async () => {
    const rows = await listSessions().catch(() => []);
    setSessions(rows);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  // /story → "이 이슈로 대화하기" 로 넘어온 seed 는 새 세션에서 시작
  useEffect(() => {
    if (seed && !seededRef.current) {
      seededRef.current = true;
      setActive(null);
      setChatKey((k) => k + 1);
    }
  }, [seed]);

  const startNew = useCallback(() => {
    setActive(null);
    setChatKey((k) => k + 1);
  }, []);

  const pick = useCallback(
    (s: ChatSession) => {
      if (s.id === active?.id) return;
      setActive(s);
      setChatKey((k) => k + 1);
    },
    [active?.id],
  );

  const onSessionCreated = useCallback(
    (s: ChatSession) => {
      // 스트리밍 중이므로 리마운트 없이 목록만 갱신하고 활성 표시만 반영
      setActive(s);
      void refreshSessions();
    },
    [refreshSessions],
  );

  const remove = useCallback(
    async (s: ChatSession) => {
      await deleteSession(s.id).catch(() => {});
      if (active?.id === s.id) startNew();
      void refreshSessions();
    },
    [active?.id, refreshSessions, startNew],
  );

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-0 px-4 py-6 md:grid-cols-[240px_1fr] md:gap-6">
      {/* 세션 목록 */}
      <aside className="mb-4 md:mb-0">
        <Button variant="outline" size="sm" className="mb-3 w-full justify-start" onClick={startNew}>
          <MessageSquarePlus className="mr-1.5 size-4" /> 새 대화
        </Button>
        {!loaded ? (
          <div className="flex items-center gap-2 px-1 py-4 text-sm text-[var(--nw-ink-3)]">
            <Loader2 className="size-4 animate-spin" /> 불러오는 중…
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-1 py-4 text-sm text-[var(--nw-ink-3)]">아직 대화가 없어요.</p>
        ) : (
          <ul className="space-y-0.5">
            {sessions.map((s) => (
              <li key={s.id}>
                <div
                  className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${
                    active?.id === s.id ? "bg-[var(--nw-surface-2)]" : "hover:bg-[var(--nw-surface-2)]"
                  }`}
                >
                  <button className="min-w-0 flex-1 text-left" onClick={() => pick(s)}>
                    <div className="truncate">{s.title || "새 대화"}</div>
                    <div className="nw-meta text-[var(--nw-ink-3)]">{relativeTime(s.updated || s.created)}</div>
                  </button>
                  <button
                    className="shrink-0 text-[var(--nw-ink-3)] opacity-0 transition-opacity hover:text-[var(--nw-live)] group-hover:opacity-100"
                    onClick={() => void remove(s)}
                    aria-label="삭제"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* 대화 패널 */}
      <div className="min-w-0">
        {settings && !booting ? (
          <ChatPanel
            key={chatKey}
            session={active}
            corpus={articles}
            settings={settings}
            keywords={keywords}
            seedQuestion={active ? undefined : seed}
            onSessionCreated={onSessionCreated}
            onCite={onCite}
          />
        ) : (
          <div className="flex items-center gap-2 py-16 text-[var(--nw-ink-2)]">
            <Loader2 className="size-5 animate-spin" /> 준비 중…
          </div>
        )}
      </div>
    </div>
  );
}

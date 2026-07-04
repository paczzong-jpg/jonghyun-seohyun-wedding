import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  MessageCircle,
  Moon,
  PanelLeft,
  PanelRight,
  Sparkles,
  Sun,
  FolderOpen,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { ChatPanel } from "@/components/notebook/chat/chat-panel";
import { SourcesPanel } from "@/components/notebook/sources/sources-panel";
import { SourceViewer } from "@/components/notebook/sources/source-viewer";
import { StudioPanel } from "@/components/notebook/studio/studio-panel";

import { getNotebook, listSources, updateNotebook } from "@/lib/notebook/db";
import { buildNotebookContext, type NotebookContext } from "@/lib/notebook/llm";
import type { Notebook, Source } from "@/lib/notebook/types";
import { useTheme } from "@/lib/notebook/use-theme";
import { APP_NAME } from "@/lib/notebook-config";

type MobileTab = "sources" | "chat" | "studio";

export function NotebookPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [viewer, setViewer] = useState<{ source: Source; find?: string } | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [missing, setMissing] = useState(false);
  /** 소스 뷰어·마인드맵 등에서 채팅으로 주입되는 질문 */
  const [pendingAsk, setPendingAsk] = useState<string | null>(null);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    getNotebook(id)
      .then(setNotebook)
      .catch(() => setMissing(true));
  }, [id]);

  const refreshSources = useCallback(async () => {
    const next = await listSources(id);
    setSources(next);
    return next;
  }, [id]);

  useEffect(() => {
    refreshSources().catch(console.error);
  }, [refreshSources]);

  // 컨텍스트 캐시 — 소스 구성이 바뀔 때만 재구성 (청크 재조회 방지)
  const contextKey = useMemo(
    () =>
      sources
        .map((s) => `${s.id}:${s.status}:${s.context_mode}:${s.updated}`)
        .join("|"),
    [sources],
  );
  const contextCache = useRef<{ key: string; promise: Promise<NotebookContext> } | null>(null);
  const getContext = useCallback((): Promise<NotebookContext> => {
    if (!contextCache.current || contextCache.current.key !== contextKey) {
      contextCache.current = { key: contextKey, promise: buildNotebookContext(sources) };
    }
    return contextCache.current.promise;
  }, [contextKey, sources]);

  const openSource = useCallback(
    (sourceId: string, find?: string) => {
      const source = sources.find((s) => s.id === sourceId);
      if (source) setViewer({ source, find });
    },
    [sources],
  );

  const renameNotebook = async (name: string) => {
    if (!notebook || !name.trim() || name === notebook.name) return;
    const updated = await updateNotebook(notebook.id, { name: name.trim() });
    setNotebook(updated);
    toast.success("노트북 이름을 변경했습니다");
  };

  const ask = useCallback((question: string) => {
    setViewer(null);
    setPendingAsk(question);
    setMobileTab("chat");
  }, []);

  if (missing) {
    return (
      <div className="grid min-h-full place-items-center bg-background">
        <div className="text-center">
          <p className="text-[15px] font-bold">노트북을 찾을 수 없습니다</p>
          <Button variant="link" onClick={() => navigate("/")}>
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const readyCount = sources.filter((s) => s.status === "ready").length;

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* ── 상단 바 ── */}
      <header className="flex h-14 flex-none items-center gap-2 border-b border-border bg-background px-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={() => navigate("/")}
          aria-label="대시보드로"
        >
          <ArrowLeft size={17} />
        </Button>
        <span className="hidden h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground sm:grid">
          <Sparkles size={13} strokeWidth={2.4} />
        </span>
        {notebook ? (
          <input
            key={notebook.name}
            defaultValue={notebook.name}
            onBlur={(e) => renameNotebook(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="min-w-0 flex-1 truncate rounded-md bg-transparent px-2 py-1 text-[15px] font-extrabold tracking-tight outline-none transition-colors hover:bg-muted focus:bg-muted sm:max-w-md sm:flex-none"
            aria-label="노트북 이름"
          />
        ) : (
          <span className="h-5 w-40 animate-pulse rounded bg-muted" />
        )}
        <span className="hidden text-[12px] font-medium text-muted-foreground md:block">
          {APP_NAME}
        </span>

        <div className="ml-auto hidden items-center gap-1 lg:flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={toggleTheme}
            aria-label="테마 전환"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${leftOpen ? "text-foreground" : "text-muted-foreground"}`}
            onClick={() => setLeftOpen((v) => !v)}
            aria-label="소스 패널 접기"
            title="소스 패널"
          >
            <PanelLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${rightOpen ? "text-foreground" : "text-muted-foreground"}`}
            onClick={() => setRightOpen((v) => !v)}
            aria-label="스튜디오 패널 접기"
            title="스튜디오 패널"
          >
            <PanelRight size={16} />
          </Button>
        </div>

        {/* 모바일 탭 */}
        <nav className="ml-auto flex rounded-full border border-border bg-card p-0.5 lg:hidden">
          {(
            [
              { key: "sources", icon: FolderOpen, label: "소스" },
              { key: "chat", icon: MessageCircle, label: "채팅" },
              { key: "studio", icon: Wand2, label: "스튜디오" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMobileTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
                mobileTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── 3컬럼 ── */}
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <div
          className={`${mobileTab === "sources" ? "flex" : "hidden"} w-full min-w-0 lg:w-[300px] lg:flex-none ${leftOpen ? "lg:flex" : "lg:hidden"}`}
        >
          <SourcesPanel
            notebookId={id}
            sources={sources}
            onChanged={refreshSources}
            onOpenSource={(s) => setViewer({ source: s })}
          />
        </div>

        <div className={`${mobileTab === "chat" ? "flex" : "hidden"} min-w-0 flex-1 lg:flex`}>
          <ChatPanel
            notebookId={id}
            sources={sources}
            getContext={getContext}
            onOpenSource={openSource}
            injectedQuestion={pendingAsk}
            onInjectedConsumed={() => setPendingAsk(null)}
          />
        </div>

        <div
          className={`${mobileTab === "studio" ? "flex" : "hidden"} w-full min-w-0 lg:w-[340px] lg:flex-none ${rightOpen ? "lg:flex" : "lg:hidden"}`}
        >
          <StudioPanel
            notebookId={id}
            readySourceCount={readyCount}
            getContext={getContext}
            onSourcesChanged={refreshSources}
            onOpenSource={openSource}
            onAsk={ask}
          />
        </div>
      </div>

      <SourceViewer
        state={viewer}
        onClose={() => setViewer(null)}
        onChanged={refreshSources}
        onAsk={ask}
      />
    </div>
  );
}

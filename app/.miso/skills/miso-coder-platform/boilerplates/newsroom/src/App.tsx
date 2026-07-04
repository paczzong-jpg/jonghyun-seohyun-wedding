import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Masthead } from "@/components/news/masthead";
import { useCollectProgress } from "@/components/news/collect-console";
import {
  getSettings,
  listClusters,
  listRecentArticles,
  listSources,
  listTopics,
  loadReadSet,
  markRead,
} from "@/lib/news/db";
import { ensureSeeded, maybeAutoCollect } from "@/lib/news/bootstrap";
import { configureSanitizer } from "@/lib/news/reader";
import { kstDay } from "@/lib/news/normalize";
import { COLLECT } from "@/lib/news-config";
import { HomePage } from "@/pages/home";
import { StoryPage } from "@/pages/story";
import { ArticlePage } from "@/pages/article";
import { ChatPage } from "@/pages/chat";
import { BriefingPage } from "@/pages/briefing";
import { ManagePage } from "@/pages/manage";
import type { NewsContext } from "@/pages/context";
import type { Article, CitationRef, Cluster, Settings, Source, Topic } from "@/lib/news/types";

import "@/styles/news.css";

// ────────────────────────────────────────────────
// App — RootLayout 이 코퍼스·구독·설정을 한 번 적재해 Outlet 으로 내려준다.
//   · 부팅: 시딩 → 초기 코퍼스 → 자동 수집(신선도 만료 시)
//   · 수집 완료(phase=done) 감지 시 코퍼스/매체 상태 재조회
// ────────────────────────────────────────────────

const PHASE_LABEL: Record<string, string> = {
  fetching: "기사 수집 중",
  summarizing: "AI 요약 중",
  clustering: "이슈 묶는 중",
};

function RootLayout() {
  const navigate = useNavigate();
  const progress = useCollectProgress();

  const [articles, setArticles] = useState<Article[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(() => loadReadSet());
  const [booting, setBooting] = useState(true);

  const refreshCorpus = useCallback(() => {
    const sinceIso = new Date(Date.now() - COLLECT.maxAgeMs).toISOString();
    void Promise.all([listRecentArticles(sinceIso, 500), listClusters(kstDay())])
      .then(([arts, cls]) => {
        setArticles(arts);
        setClusters(cls);
      })
      .catch(() => {});
  }, []);

  const refreshTopics = useCallback(async () => {
    const rows = await listTopics().catch(() => [] as Topic[]);
    setTopics(rows);
  }, []);

  const refreshSources = useCallback(async () => {
    const rows = await listSources().catch(() => [] as Source[]);
    setSources(rows);
  }, []);

  const markArticleRead = useCallback((id: string) => {
    setReadSet(markRead(id));
  }, []);

  const onCite = useCallback(
    (ref: CitationRef) => {
      navigate(`/article/${ref.article_id}`);
    },
    [navigate],
  );

  // 부팅
  useEffect(() => {
    let alive = true;
    (async () => {
      await configureSanitizer();
      const seed = await ensureSeeded().catch(() => ({ sources: [] as Source[], topics: [] as Topic[] }));
      const st = await getSettings().catch(() => null);
      if (!alive) return;
      setTopics(seed.topics);
      setSources(seed.sources);
      setSettings(st);
      refreshCorpus();
      setBooting(false);
      // 신선도 만료 시에만 자동 수집(force 아님)
      void maybeAutoCollect(seed.sources, seed.topics);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 수집 완료 감지 → 코퍼스/매체 상태 재조회
  const wasCollecting = useRef(false);
  useEffect(() => {
    const busy = progress.phase !== "idle" && progress.phase !== "done" && progress.phase !== "error";
    if (busy) wasCollecting.current = true;
    if (!busy && wasCollecting.current) {
      wasCollecting.current = false;
      refreshCorpus();
      void refreshSources();
    }
  }, [progress.phase, refreshCorpus, refreshSources]);

  const keywords = useMemo(
    () =>
      Array.from(new Set(topics.filter((t) => t.active).flatMap((t) => [t.name, ...t.related]))).slice(0, 24),
    [topics],
  );

  const collecting = progress.phase !== "idle" && progress.phase !== "done" && progress.phase !== "error";
  const live = { active: collecting, label: PHASE_LABEL[progress.phase] ?? "수집 중" };

  const ctx: NewsContext = {
    articles,
    clusters,
    topics,
    sources,
    settings,
    readSet,
    keywords,
    booting,
    refreshCorpus,
    refreshTopics,
    refreshSources,
    setSettings,
    markArticleRead,
    onCite,
  };

  return (
    <div className="nw-app min-h-screen bg-[var(--nw-surface)] text-[var(--nw-ink)]">
      <Masthead live={live} />
      <Outlet context={ctx} />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="story/:id" element={<StoryPage />} />
          <Route path="article/:id" element={<ArticlePage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="briefing" element={<BriefingPage />} />
          <Route path="manage" element={<ManagePage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

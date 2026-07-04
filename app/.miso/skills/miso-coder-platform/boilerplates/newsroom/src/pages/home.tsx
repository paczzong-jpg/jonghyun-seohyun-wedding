import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw, Newspaper, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClusterCard } from "@/components/news/cluster-card";
import { ArticleRow } from "@/components/news/article-row";
import { CoverageBar } from "@/components/news/coverage-bar";
import { KeywordDialog } from "@/components/news/keyword-dialog";
import { CollectConsole, NewArticlesPill, useCollectProgress } from "@/components/news/collect-console";
import { collectNow } from "@/lib/news/bootstrap";
import { updateArticle } from "@/lib/news/db";
import { useNews } from "./context";
import type { Article, Cluster, Topic } from "@/lib/news/types";

// ────────────────────────────────────────────────
// 홈 — 오늘의 지면. 상단 이슈(클러스터) + 최신 기사 피드.
//   · 수집 중 새 기사는 발밑에서 밀지 않고 알림 필(pill)로 모았다가 클릭 시 반영
//   · 키워드 칩으로 구독 추가 → 즉시 해당 토픽만 수집
// ────────────────────────────────────────────────

export function HomePage() {
  const { articles, clusters, topics, sources, readSet, booting, refreshTopics } = useNews();
  const progress = useCollectProgress();
  const collecting = progress.phase !== "idle" && progress.phase !== "done" && progress.phase !== "error";

  // 표시 스냅샷 — 사용자가 읽는 동안 피드가 튀지 않도록 코퍼스와 분리
  const [snap, setSnap] = useState<{ articles: Article[]; clusters: Cluster[] }>({ articles: [], clusters: [] });
  const [pending, setPending] = useState(0);
  const [kwOpen, setKwOpen] = useState(false);
  const adopted = useRef(false);

  useEffect(() => {
    // 최초 데이터 도착 → 즉시 표시
    if (!adopted.current) {
      if (articles.length > 0 || clusters.length > 0) {
        adopted.current = true;
        setSnap({ articles, clusters });
        setPending(0);
      }
      return;
    }
    // 이후 변경 → 새 기사 수만 집계(표시는 보류)
    const shown = new Set(snap.articles.map((a) => a.id));
    const fresh = articles.reduce((n, a) => (shown.has(a.id) ? n : n + 1), 0);
    setPending(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, clusters]);

  const adopt = useCallback(() => {
    setSnap({ articles, clusters });
    setPending(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [articles, clusters]);

  const onBookmark = useCallback(async (a: Article, next: boolean) => {
    setSnap((s) => ({ ...s, articles: s.articles.map((x) => (x.id === a.id ? { ...x, bookmarked: next } : x)) }));
    await updateArticle(a.id, { bookmarked: next }).catch(() => {});
  }, []);

  const onKeywordCreated = useCallback(
    async (t: Topic) => {
      await refreshTopics();
      void collectNow([], [t]); // 새 토픽만 즉시 수집
    },
    [refreshTopics],
  );

  // 기사 → 카테고리(클러스터에서 유도) 매핑
  const catByArticle = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of snap.clusters) for (const id of c.article_ids) if (!m.has(id)) m.set(id, c.category);
    return m;
  }, [snap.clusters]);

  const activeTopics = useMemo(() => topics.filter((t) => t.active), [topics]);

  // 상단 이슈 레이아웃: 첫 클러스터는 리드, 이후 그리드
  const [lead, ...restClusters] = snap.clusters;
  const gridClusters = restClusters.slice(0, 6);

  // 최신 피드: 이슈 대표 기사로 이미 노출된 것 제외
  const shownRepIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of [lead, ...gridClusters]) if (c) ids.add(c.rep);
    return ids;
  }, [lead, gridClusters]);
  const feed = useMemo(
    () => snap.articles.filter((a) => !shownRepIds.has(a.id)).slice(0, 40),
    [snap.articles, shownRepIds],
  );

  if (booting) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="nw-skeleton mb-4 h-56 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="nw-skeleton h-40 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const empty = snap.articles.length === 0 && snap.clusters.length === 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      {pending > 0 && <NewArticlesPill count={pending} onClick={adopt} />}

      {/* 키워드 구독 바 */}
      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-[var(--nw-hairline)] pb-4">
        <div className="nw-overline mr-1 flex items-center gap-1.5 text-[var(--nw-ink-2)]">
          <LayoutGrid className="size-3.5" /> 구독
        </div>
        {activeTopics.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--nw-hairline)] bg-[var(--nw-surface-2)] px-3 py-1 text-sm"
          >
            <span className="size-2 rounded-full" style={{ background: t.color }} aria-hidden />
            {t.name}
          </span>
        ))}
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setKwOpen(true)}>
          <Plus className="mr-1 size-3.5" /> 키워드
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => void collectNow(sources, topics)}
          disabled={collecting}
        >
          <RefreshCw className={`mr-1.5 size-4 ${collecting ? "animate-spin" : ""}`} />
          {collecting ? "수집 중" : "새로고침"}
        </Button>
      </div>

      {collecting && (
        <div className="mb-6">
          <CollectConsole />
        </div>
      )}

      {empty && !collecting && (
        <div className="py-24 text-center text-[var(--nw-ink-2)]">
          <Newspaper className="mx-auto mb-3 size-10 text-[var(--nw-ink-3)]" />
          <p className="nw-lead mb-1.5">아직 지면이 비어 있어요</p>
          <p className="nw-meta mb-5">뉴스를 수집하면 오늘의 이슈가 여기 정리됩니다.</p>
          <Button onClick={() => void collectNow(sources, topics)}>
            <RefreshCw className="mr-1.5 size-4" /> 지금 수집
          </Button>
        </div>
      )}

      {/* 오늘의 이슈 */}
      {snap.clusters.length > 0 && (
        <section className="mb-8">
          <div className="nw-double-rule mb-4 flex items-baseline justify-between">
            <h2 className="nw-serif text-xl">오늘의 이슈</h2>
            <span className="nw-meta text-[var(--nw-ink-3)]">{snap.clusters.length}개 이슈</span>
          </div>
          {lead && (
            <div className="mb-5">
              <ClusterCard cluster={lead} articles={snap.articles} variant="lead" read={readSet.has(lead.rep)} />
            </div>
          )}
          {gridClusters.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gridClusters.map((c) => (
                <ClusterCard key={c.id} cluster={c} articles={snap.articles} variant="card" read={readSet.has(c.rep)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 최신 기사 */}
      {feed.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between border-b border-[var(--nw-hairline)] pb-2">
            <h2 className="nw-serif text-xl">최신 기사</h2>
            <CoverageBar articles={snap.articles} />
          </div>
          <div className="divide-y divide-[var(--nw-hairline)]">
            {feed.map((a) => (
              <ArticleRow
                key={a.id}
                article={a}
                read={readSet.has(a.id)}
                category={catByArticle.get(a.id) ?? ""}
                onBookmark={onBookmark}
              />
            ))}
          </div>
        </section>
      )}

      <KeywordDialog open={kwOpen} onOpenChange={setKwOpen} existingCount={topics.length} onCreated={onKeywordCreated} />
    </main>
  );
}

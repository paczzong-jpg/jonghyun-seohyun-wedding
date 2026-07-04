import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoryBriefView } from "@/components/news/story-brief";
import { ArticleRow } from "@/components/news/article-row";
import { CoverageBar } from "@/components/news/coverage-bar";
import { getCluster, listArticlesByIds } from "@/lib/news/db";
import { generateStoryBrief } from "@/lib/news/llm";
import { useNews } from "./context";
import type { Article, CitationRef, Cluster, StoryBrief } from "@/lib/news/types";

// ────────────────────────────────────────────────
// 이슈 상세 — 클러스터 한 건을 하나의 서사로 브리핑([n] 인용 포함).
//   · 브리핑은 진입 시마다 생성(refs 는 표시용이라 저장하지 않음 — 인용 번호 일관성 보장)
//   · 소속 기사 목록 + 커버리지 + "이 이슈로 대화하기" 진입점
// ────────────────────────────────────────────────

export function StoryPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { settings, readSet, onCite } = useNews();
  const tone = settings?.tone ?? "newsletter";

  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [arts, setArts] = useState<Article[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [brief, setBrief] = useState<StoryBrief | null>(null);
  const [refs, setRefs] = useState<CitationRef[]>([]);
  const [status, setStatus] = useState<"loading" | "briefing" | "ready" | "error">("loading");

  // 클러스터 + 소속 기사 적재
  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setNotFound(false);
    setBrief(null);
    setRefs([]);
    (async () => {
      try {
        const c = await getCluster(id);
        if (!alive) return;
        setCluster(c);
        const members = await listArticlesByIds(c.article_ids);
        if (!alive) return;
        setArts(members);
      } catch {
        if (alive) setNotFound(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // 브리핑 생성 (기사 준비되면)
  useEffect(() => {
    if (!cluster || arts.length === 0) return;
    let alive = true;
    setStatus("briefing");
    generateStoryBrief({ label: cluster.label, category: cluster.category }, arts, tone)
      .then((out) => {
        if (!alive) return;
        setBrief(out.brief);
        setRefs(out.refs);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster?.id, arts, tone]);

  const seedQuestion = useMemo(
    () => (cluster ? `"${cluster.label}" 이슈에 대해 핵심만 정리해줘.` : ""),
    [cluster],
  );

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-[var(--nw-ink-2)]">
        <p className="nw-lead mb-4">이슈를 찾을 수 없어요.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-1.5 size-4" /> 홈으로
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1.5 size-4" /> 뒤로
        </Button>
        {cluster && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/chat", { state: { seed: seedQuestion } })}
          >
            <MessageSquare className="mr-1.5 size-4" /> 이 이슈로 대화하기
          </Button>
        )}
      </div>

      {status === "briefing" && (
        <div className="flex items-center gap-2 py-16 text-[var(--nw-ink-2)]">
          <Loader2 className="size-5 animate-spin" /> 이슈를 브리핑으로 정리하는 중…
        </div>
      )}

      {status === "error" && (
        <div className="py-16 text-center">
          <p className="nw-meta mb-3 text-[var(--nw-live)]">브리핑을 만들지 못했어요.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => cluster && setArts((a) => [...a])}
          >
            <RefreshCw className="mr-1.5 size-4" /> 다시 시도
          </Button>
        </div>
      )}

      {status === "ready" && brief && (
        <article className="nw-article mb-8">
          <StoryBriefView brief={brief} refs={refs} onCite={onCite} />
        </article>
      )}

      {arts.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between border-b border-[var(--nw-hairline)] pb-2">
            <h2 className="nw-serif text-lg">이 이슈의 기사 {arts.length}건</h2>
            <CoverageBar articles={arts} />
          </div>
          <div className="divide-y divide-[var(--nw-hairline)]">
            {arts.map((a) => (
              <ArticleRow key={a.id} article={a} read={readSet.has(a.id)} category={cluster?.category ?? ""} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

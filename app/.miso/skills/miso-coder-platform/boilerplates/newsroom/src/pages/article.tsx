import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReaderView } from "@/components/news/reader-view";
import { getArticle, updateArticle } from "@/lib/news/db";
import { extractReader } from "@/lib/news/reader";
import { useNews } from "./context";
import type { Article } from "@/lib/news/types";

// ────────────────────────────────────────────────
// 기사 상세 — 리더 모드. 원문을 읽기 좋게 재구성(Readability) + AI 요약/키포인트.
//   · reader_status 가 비어 있으면 최초 진입 시 1회 본문 추출 후 저장
//   · 요약 재작성(스타일 변경)은 summary_variants 에 캐시
// ────────────────────────────────────────────────

export function ArticlePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { markArticleRead } = useNews();

  const [article, setArticle] = useState<Article | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingReader, setLoadingReader] = useState(false);
  const tried = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    setArticle(null);
    setNotFound(false);
    getArticle(id)
      .then((a) => {
        if (!alive) return;
        setArticle(a);
        markArticleRead(a.id);
      })
      .catch(() => {
        if (alive) setNotFound(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 본문 미추출 기사 → 리더 추출 1회
  useEffect(() => {
    if (!article || !article.url) return;
    if (article.reader_status || tried.current === article.id) return;
    tried.current = article.id;
    setLoadingReader(true);
    void (async () => {
      const res = await extractReader(article.url).catch(() => null);
      const patch: Partial<Article> = res
        ? { reader_status: res.status, reader_html: res.html, reader_text: res.text }
        : { reader_status: "unavailable" };
      setArticle((prev) => (prev ? { ...prev, ...patch } : prev));
      setLoadingReader(false);
      await updateArticle(article.id, patch).catch(() => {});
    })();
  }, [article]);

  const onRestyleCached = useCallback(
    (style: string, text: string) => {
      setArticle((prev) => {
        if (!prev) return prev;
        const next = { ...prev, summary_variants: { ...prev.summary_variants, [style]: text } };
        void updateArticle(prev.id, { summary_variants: next.summary_variants }).catch(() => {});
        return next;
      });
    },
    [],
  );

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-[var(--nw-ink-2)]">
        <p className="nw-lead mb-4">기사를 찾을 수 없어요.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-1.5 size-4" /> 홈으로
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-1.5 size-4" /> 뒤로
      </Button>
      {article ? (
        <ReaderView article={article} loadingReader={loadingReader} onRestyleCached={onRestyleCached} />
      ) : (
        <div>
          <div className="nw-skeleton mb-3 h-8 w-3/4 rounded" />
          <div className="nw-skeleton mb-6 h-4 w-1/3 rounded" />
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="nw-skeleton h-4 w-full rounded" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

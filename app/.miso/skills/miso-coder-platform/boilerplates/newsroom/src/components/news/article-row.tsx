import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";
import type { Article } from "@/lib/news/types";
import { relativeTime } from "@/lib/news/normalize";
import { faviconUrl } from "@/lib/news-config";
import { mediaLabel, ArticleThumb } from "./shared";

// ────────────────────────────────────────────────
// 단일 기사 행 — 목록·클러스터 멤버·검색 결과 공통.
// 썸네일(옵션) + 출처 파비콘·매체 + 제목 + 한 줄 요약 + 상대 시각.
// ────────────────────────────────────────────────

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

interface Props {
  article: Article;
  read?: boolean;
  category?: string;
  showThumb?: boolean;
  onBookmark?: (article: Article, next: boolean) => void;
}

export function ArticleRow({ article, read, category = "", showThumb = true, onBookmark }: Props) {
  const lead = article.one_liner || article.summary || article.desc_src || "";
  const origin = safeOrigin(article.url);

  return (
    <div className="group flex gap-3 py-3">
      {showThumb && (
        <Link to={`/article/${article.id}`} className="shrink-0">
          <ArticleThumb
            article={article}
            category={category}
            className="h-16 w-24 overflow-hidden rounded-md sm:h-20 sm:w-28"
          />
        </Link>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          {origin && (
            <img src={faviconUrl(origin)} alt="" className="size-3.5 rounded-sm" loading="lazy" referrerPolicy="no-referrer" />
          )}
          <span className="nw-overline truncate">{article.source_name || "출처"}</span>
          {article.media_type && <span className="nw-meta shrink-0">· {mediaLabel(article.media_type)}</span>}
          <span className="nw-meta ml-auto shrink-0">{relativeTime(article.published)}</span>
        </div>

        <Link to={`/article/${article.id}`} className="block">
          <h3 className={`nw-headline line-clamp-2 transition-colors group-hover:text-[var(--nw-accent)] ${read ? "nw-read" : ""}`}>
            {article.title}
          </h3>
        </Link>

        {lead && <p className="nw-meta mt-1 line-clamp-2 leading-relaxed">{lead}</p>}
      </div>

      {onBookmark && (
        <button
          type="button"
          aria-label={article.bookmarked ? "북마크 해제" : "북마크"}
          onClick={() => onBookmark(article, !article.bookmarked)}
          className="h-fit shrink-0 rounded p-1 text-[var(--nw-ink-3)] transition-colors hover:text-[var(--nw-accent)]"
        >
          <Bookmark className={`size-4 ${article.bookmarked ? "fill-[var(--nw-accent)] text-[var(--nw-accent)]" : ""}`} />
        </button>
      )}
    </div>
  );
}

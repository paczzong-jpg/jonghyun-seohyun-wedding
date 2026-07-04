import { Link } from "react-router-dom";
import type { Article, Cluster } from "@/lib/news/types";
import { relativeTime } from "@/lib/news/normalize";
import { ArticleThumb, FaviconStack } from "./shared";

// ────────────────────────────────────────────────
// 클러스터 카드 — 스토리(다중 매체 보도 묶음)가 1급 객체.
// 오버라인(카테고리) + 세리프 헤드라인 + 리드 + 파비콘 스택 + 상대시각.
// 이미지 유무가 카드 높이를 바꾸지 않도록 텍스트 존 고정.
// ────────────────────────────────────────────────

interface Props {
  cluster: Cluster;
  articles: Article[]; // 이 클러스터 소속 (rep 우선)
  variant?: "lead" | "card" | "row";
  read?: boolean;
}

export function ClusterCard({ cluster, articles, variant = "card", read }: Props) {
  const rep = articles.find((a) => a.id === cluster.rep) ?? articles[0];
  if (!rep) return null;
  const lead = rep.one_liner || rep.summary || rep.desc_src;
  const to = `/story/${cluster.id}`;

  if (variant === "row") {
    return (
      <Link to={to} className="group flex items-start gap-3 border-b border-[var(--nw-hairline)] py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="nw-overline">{cluster.category}</span>
            {cluster.size > 1 && <span className="nw-meta">· {cluster.size}개 보도</span>}
          </div>
          <h3 className={`nw-headline mt-0.5 group-hover:text-[var(--nw-accent)] ${read ? "nw-read" : ""}`}>{cluster.label}</h3>
          {lead && <p className="nw-meta mt-1 line-clamp-2">{lead}</p>}
          <div className="mt-1.5 flex items-center gap-2">
            <FaviconStack articles={articles} />
            <span className="nw-meta">{relativeTime(rep.published)}</span>
          </div>
        </div>
        {rep.image_url && (
          <ArticleThumb article={rep} category={cluster.category} className="size-20 shrink-0 rounded object-cover" />
        )}
      </Link>
    );
  }

  if (variant === "lead") {
    return (
      <Link to={to} className="group block">
        <ArticleThumb article={rep} category={cluster.category} className="mb-4 aspect-[16/9] w-full rounded-lg object-cover" />
        <div className="flex items-center gap-2">
          <span className="nw-overline">{cluster.category}</span>
          {cluster.size > 1 && <span className="nw-meta">· {cluster.size}개 매체 보도</span>}
        </div>
        <h2 className={`nw-display mt-1 group-hover:text-[var(--nw-accent)] ${read ? "nw-read" : ""}`}>{cluster.label}</h2>
        {lead && <p className="nw-body mt-2 line-clamp-3">{lead}</p>}
        <div className="mt-3 flex items-center gap-2">
          <FaviconStack articles={articles} max={6} />
          <span className="nw-meta">{relativeTime(rep.published)}</span>
        </div>
      </Link>
    );
  }

  // card
  return (
    <Link to={to} className="group flex flex-col">
      <ArticleThumb article={rep} category={cluster.category} className="mb-3 aspect-[16/9] w-full rounded-md object-cover" />
      <div className="flex items-center gap-2">
        <span className="nw-overline">{cluster.category}</span>
        {cluster.size > 1 && <span className="nw-meta">· {cluster.size}</span>}
      </div>
      <h3 className={`nw-headline mt-1 group-hover:text-[var(--nw-accent)] ${read ? "nw-read" : ""}`}>{cluster.label}</h3>
      {lead && <p className="nw-meta mt-1.5 line-clamp-2 leading-relaxed">{lead}</p>}
      <div className="mt-auto flex items-center gap-2 pt-2.5">
        <FaviconStack articles={articles} />
        <span className="nw-meta">{relativeTime(rep.published)}</span>
      </div>
    </Link>
  );
}

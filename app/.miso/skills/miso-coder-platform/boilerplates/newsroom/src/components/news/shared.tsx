import { faviconUrl, CATEGORIES } from "@/lib/news-config";
import type { Article, MediaType } from "@/lib/news/types";

// ────────────────────────────────────────────────
// 작은 공유 프리미티브 — 파비콘 스택, 카테고리 플레이스홀더, 소스 칩.
// ────────────────────────────────────────────────

export function tintForCategory(category: string): string {
  const found = CATEGORIES.find((c) => c.key === category || category.startsWith(c.key));
  return found?.tint ?? "var(--nw-tint-general)";
}

/** 여러 매체 파비콘을 겹쳐 표시 ("12개 매체 보도"의 시각 신호) */
export function FaviconStack({ articles, max = 5 }: { articles: Article[]; max?: number }) {
  const hosts = new Map<string, string>();
  for (const a of articles) {
    try {
      const host = new URL(a.url).hostname;
      if (!hosts.has(host)) hosts.set(host, a.url);
    } catch {
      /* skip */
    }
    if (hosts.size >= max) break;
  }
  const urls = [...hosts.values()];
  if (urls.length === 0) return null;
  return (
    <div className="flex items-center">
      {urls.map((url, i) => (
        <img
          key={url}
          src={faviconUrl(new URL(url).origin)}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-4 rounded-sm border border-[var(--nw-bg)] bg-[var(--nw-surface)]"
          style={{ marginLeft: i === 0 ? 0 : -5, zIndex: max - i }}
        />
      ))}
    </div>
  );
}

/** 이미지 없는 카드용 플레이스홀더 — 카테고리 틴트 + 세리프 모노그램 */
export function ArticleThumb({ article, category, className }: { article: Article; category: string; className?: string }) {
  if (article.image_url) {
    return (
      <img
        src={article.image_url}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className={className}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  const mono = (article.source_name || article.title || "•").trim().charAt(0);
  return (
    <div className={`nw-placeholder ${className ?? ""}`} style={{ background: tintForCategory(category) }}>
      <span style={{ fontSize: "1.6em" }}>{mono}</span>
    </div>
  );
}

const MEDIA_LABEL: Record<string, string> = {
  종합지: "종합지",
  경제지: "경제지",
  IT전문지: "IT전문지",
  방송: "방송",
  글로벌: "외신",
  커뮤니티: "커뮤니티",
};

export function mediaLabel(t: MediaType | string): string {
  return MEDIA_LABEL[t] ?? t;
}

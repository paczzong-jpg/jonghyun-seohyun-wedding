import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUMMARY_STYLES } from "@/lib/news-config";
import type { Article } from "@/lib/news/types";
import { relativeTime, readMinutes } from "@/lib/news/normalize";
import { restyleSummary } from "@/lib/news/llm";

// ────────────────────────────────────────────────
// 리더 뷰 — 추출된 전문 + 실패 배지 + 요약 스타일 토글 + 리딩 프로그레스.
// ────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; tone: string } | null> = {
  full: null,
  partial: { label: "본문 일부만 추출됨", tone: "var(--nw-ink-2)" },
  "feed-only": { label: "요약본만 제공 — 전문은 원문에서", tone: "var(--nw-ink-2)" },
  blocked: { label: "원문이 구독자 전용이거나 접근이 제한됨", tone: "var(--nw-live)" },
  unavailable: { label: "본문을 불러올 수 없음 — 원문 열기", tone: "var(--nw-live)" },
};

interface Props {
  article: Article;
  loadingReader: boolean;
  onRestyleCached?: (style: string, text: string) => void;
}

export function ReaderView({ article, loadingReader, onRestyleCached }: Props) {
  const [style, setStyle] = useState("default");
  const [restyled, setRestyled] = useState<Record<string, string>>(article.summary_variants ?? {});
  const [restyling, setRestyling] = useState(false);
  const [progress, setProgress] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  const cleanHtml = useMemo(
    () => (article.reader_html ? DOMPurify.sanitize(article.reader_html) : ""),
    [article.reader_html],
  );

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function pickStyle(key: string) {
    setStyle(key);
    if (key === "default" || restyled[key]) return;
    setRestyling(true);
    try {
      const text = await restyleSummary(article, key);
      const next = { ...restyled, [key]: text };
      setRestyled(next);
      onRestyleCached?.(key, text);
    } catch {
      /* 실패 시 기본 요약으로 남음 */
    } finally {
      setRestyling(false);
    }
  }

  const badge = STATUS_BADGE[article.reader_status] ?? null;
  const summaryText = style === "default" ? article.summary : restyled[style] ?? article.summary;
  const charCount = article.reader_text?.length ?? article.content_src?.length ?? 0;

  return (
    <article className="nw-app">
      <div className="fixed left-0 top-0 z-40 h-0.5 bg-[var(--nw-accent)]" style={{ width: `${progress}%` }} />

      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="nw-overline">{article.source_name || "출처"}</span>
        {article.author && <span className="nw-meta">· {article.author}</span>}
        <span className="nw-meta">· {relativeTime(article.published)}</span>
        {charCount > 0 && <span className="nw-meta">· {readMinutes(charCount)}분</span>}
      </div>
      <h1 className="nw-lead mb-4">{article.title}</h1>

      {/* AI 요약 + 스타일 토글 */}
      {(article.summary || article.one_liner) && (
        <div className="mb-6 rounded-lg border border-[var(--nw-hairline)] bg-[var(--nw-surface-2)] p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[var(--nw-accent)]">
              <Sparkles className="size-4" />
              <span className="nw-overline">AI 요약</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {SUMMARY_STYLES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => pickStyle(s.key)}
                  className={`rounded px-2 py-0.5 text-xs transition-colors ${
                    style === s.key
                      ? "bg-[var(--nw-accent)] text-white"
                      : "text-[var(--nw-ink-2)] hover:bg-[var(--nw-surface)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {restyling ? (
            <div className="flex items-center gap-2 py-2 text-[var(--nw-ink-2)]">
              <Loader2 className="size-4 animate-spin" /> 다시 요약하는 중…
            </div>
          ) : style === "facts" && restyled.facts ? (
            <div className="nw-md text-[15px]" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(mdBulletsToHtml(summaryText)) }} />
          ) : (
            <p className="text-[15px] leading-relaxed">{summaryText}</p>
          )}
          {article.key_points?.length > 0 && style === "default" && (
            <ul className="mt-3 space-y-1">
              {article.key_points.map((pt, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--nw-ink-2)]">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--nw-accent)]" />
                  {pt}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {badge && (
        <div className="mb-4 rounded-md border border-[var(--nw-hairline)] px-3 py-2 text-sm" style={{ color: badge.tone }}>
          {badge.label}
        </div>
      )}

      {loadingReader && !cleanHtml && (
        <div className="space-y-3 py-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="nw-skeleton h-4" style={{ width: `${90 - i * 8}%` }} />
          ))}
        </div>
      )}

      {cleanHtml ? (
        <div ref={bodyRef} className="nw-reader" dangerouslySetInnerHTML={{ __html: cleanHtml }} />
      ) : (
        !loadingReader && (
          <p className="nw-body text-[var(--nw-ink-2)]">{article.desc_src || article.content_src || "본문이 제공되지 않았습니다."}</p>
        )
      )}

      <div className="mt-8 border-t border-[var(--nw-hairline)] pt-5">
        <Button variant="outline" asChild>
          <a href={article.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 size-4" />
            {article.source_name || "원문"}에서 전체 기사 보기
          </a>
        </Button>
      </div>
    </article>
  );
}

/** "- **누가**: ..." 형태 5W 불릿을 간단 HTML로 (facts 스타일 표시용) */
function mdBulletsToHtml(md: string): string {
  const lines = md.split("\n").filter((l) => l.trim());
  const items = lines
    .map((l) => l.replace(/^[-*]\s*/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"))
    .map((l) => `<li>${l}</li>`)
    .join("");
  return `<ul>${items}</ul>`;
}

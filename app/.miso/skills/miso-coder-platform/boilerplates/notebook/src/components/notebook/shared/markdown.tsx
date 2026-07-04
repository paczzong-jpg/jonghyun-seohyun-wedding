import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { CitationRef } from "@/lib/notebook/types";

type MarkdownProps = {
  content: string;
  /** 인용 인덱스 — 있으면 [n] 을 클릭 가능한 칩으로 렌더 */
  citations?: CitationRef[];
  onCiteClick?: (ref: CitationRef) => void;
  className?: string;
};

/**
 * [n] 인용을 마크다운 링크(#cite-n)로 변환한 뒤 a 렌더러에서 칩으로 바꾼다.
 * 기존 마크다운 링크 [text](url) 는 건드리지 않는다.
 */
function linkifyCitations(content: string): string {
  return content.replace(/\[(\d{1,2})\](?!\()/g, (_, n: string) => `[${n}](#cite-${n})`);
}

export function Markdown({ content, citations, onCiteClick, className }: MarkdownProps) {
  const processed = citations ? linkifyCitations(content) : content;

  return (
    <div className={`nb-prose ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const cite = href?.match(/^#cite-(\d{1,2})$/);
            if (cite && citations) {
              const n = Number(cite[1]);
              const ref = citations.find((c) => c.n === n);
              if (ref) {
                return (
                  <button
                    type="button"
                    className="nb-cite-chip"
                    title={ref.title}
                    onClick={() => onCiteClick?.(ref)}
                  >
                    {n}
                  </button>
                );
              }
              return <span className="nb-cite-chip">{n}</span>;
            }
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

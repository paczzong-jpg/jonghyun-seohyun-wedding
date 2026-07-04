import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { parseClockLabel } from "@/lib/meeting/llm";

// ────────────────────────────────────────────────
// 마크다운 렌더 + [mm:ss] 타임스탬프 인용 칩.
// 전처리로 [mm:ss] → [mm:ss](#t=mm:ss) 링크로 바꾸고,
// a 렌더러가 #t= 링크를 클릭 가능한 칩으로 그린다.
// onSeek 이 없으면(공유 뷰) 칩은 비활성 표시로만 남는다.
// ────────────────────────────────────────────────

const CLOCK_TOKEN_RE = /\[(\d{1,2}:\d{2}(?::\d{2})?)\](?!\()/g;

function linkifyTimestamps(markdown: string): string {
  return markdown.replace(CLOCK_TOKEN_RE, (_m, label: string) => `[${label}](#t=${label})`);
}

export interface MarkdownProps {
  children: string;
  onSeek?: (sec: number) => void;
  className?: string;
}

export function Markdown({ children, onSeek, className }: MarkdownProps) {
  return (
    <div className={`mn-doc ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: linkChildren }) => {
            if (href?.startsWith("#t=")) {
              const label = decodeURIComponent(href.slice(3));
              const sec = parseClockLabel(label);
              return (
                <button
                  type="button"
                  className="mn-cite-chip"
                  data-inert={!onSeek || sec < 0}
                  title={onSeek ? `${label} 지점 재생` : label}
                  onClick={() => {
                    if (onSeek && sec >= 0) onSeek(sec);
                  }}
                >
                  <span aria-hidden>▶</span>
                  {label}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
                {linkChildren}
              </a>
            );
          },
        }}
      >
        {linkifyTimestamps(children)}
      </ReactMarkdown>
    </div>
  );
}

import { Fragment, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { faviconUrl } from "@/lib/news-config";
import { relativeTime } from "@/lib/news/normalize";
import type { CitationRef } from "@/lib/news/types";

// ────────────────────────────────────────────────
// 마크다운 렌더 + [n] 인용 칩.
// [n] → 파비콘+번호 칩, hover 시 기사 제목/매체/발행 팝오버, 클릭 시 콜백(원문/스크롤).
// 컨텍스트 라인 형식([n])을 바꾸면 llm.ts extractCitations 와 함께 바꿔야 한다.
// ────────────────────────────────────────────────

interface Props {
  content: string;
  refs: CitationRef[];
  onCite?: (ref: CitationRef) => void;
  streaming?: boolean;
}

/** 텍스트 노드에서 [n] 마커를 칩으로 치환. 스트리밍 중 말미의 미완성 '[' 는 홀드백. */
function renderWithCitations(
  text: string,
  refMap: Map<number, CitationRef>,
  onCite?: (ref: CitationRef) => void,
  streaming?: boolean,
): ReactNode[] {
  let working = text;
  // 스트리밍 말미의 불완전 '[' / '[1' 은 렌더에서 숨긴다
  if (streaming) {
    const tail = working.match(/\[\d{0,2}$/);
    if (tail) working = working.slice(0, tail.index);
  }
  const nodes: ReactNode[] = [];
  const regex = /\[(\d{1,2})\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(working)) !== null) {
    const ref = refMap.get(Number(m[1]));
    if (m.index > last) nodes.push(<Fragment key={`t${k}`}>{working.slice(last, m.index)}</Fragment>);
    if (ref) {
      nodes.push(<CitationChip key={`c${k}`} refItem={ref} onCite={onCite} />);
    } else {
      // 자료 범위 밖 번호는 드롭 (환각 인용 차단)
    }
    last = m.index + m[0].length;
    k++;
  }
  if (last < working.length) nodes.push(<Fragment key={`t${k}`}>{working.slice(last)}</Fragment>);
  return nodes;
}

export function CitationChip({ refItem, onCite }: { refItem: CitationRef; onCite?: (ref: CitationRef) => void }) {
  const favicon = refItem.url ? faviconUrl(new URL(refItem.url, "https://x").origin || refItem.url) : "";
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="nw-cite"
          onClick={(e) => {
            e.preventDefault();
            onCite?.(refItem);
          }}
        >
          {favicon && <img src={favicon} alt="" loading="lazy" referrerPolicy="no-referrer" />}
          {refItem.n}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 text-sm">
        <div className="nw-overline mb-1">{refItem.source_name || "출처"}</div>
        <div className="font-medium leading-snug">{refItem.title}</div>
        <div className="nw-meta mt-1">{relativeTime(refItem.published)}</div>
      </HoverCardContent>
    </HoverCard>
  );
}

/** 자식 텍스트를 재귀적으로 순회하며 [n] 치환 */
function citeChildren(
  children: ReactNode,
  refMap: Map<number, CitationRef>,
  onCite?: (ref: CitationRef) => void,
  streaming?: boolean,
): ReactNode {
  if (typeof children === "string") return renderWithCitations(children, refMap, onCite, streaming);
  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === "string" ? (
        <Fragment key={i}>{renderWithCitations(child, refMap, onCite, streaming)}</Fragment>
      ) : (
        child
      ),
    );
  }
  return children;
}

export function NewsMarkdown({ content, refs, onCite, streaming }: Props) {
  const refMap = new Map(refs.map((r) => [r.n, r]));
  const cc = (children: ReactNode) => citeChildren(children, refMap, onCite, streaming);
  return (
    <div className={`nw-md ${streaming ? "nw-cursor" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{cc(children)}</p>,
          li: ({ children }) => <li>{cc(children)}</li>,
          strong: ({ children }) => <strong>{cc(children)}</strong>,
          em: ({ children }) => <em>{cc(children)}</em>,
          td: ({ children }) => <td>{cc(children)}</td>,
          blockquote: ({ children }) => <blockquote>{children}</blockquote>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

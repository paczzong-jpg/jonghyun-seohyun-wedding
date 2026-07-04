import { Quote, Clock, Users, Lightbulb, TelescopeIcon } from "lucide-react";
import type { CitationRef, StoryBrief } from "@/lib/news/types";
import { CitationChip } from "./markdown";

// ────────────────────────────────────────────────
// Kite식 구조화 스토리 브리핑 렌더 — 존재하는 섹션만 카드로.
// 모든 사실 문장의 [n] 은 인용 칩으로 치환.
// ────────────────────────────────────────────────

interface Props {
  brief: StoryBrief;
  refs: CitationRef[];
  onCite?: (ref: CitationRef) => void;
}

/** 텍스트 속 [n] → 칩 */
function withCites(text: string, refMap: Map<number, CitationRef>, onCite?: (r: CitationRef) => void) {
  const nodes: React.ReactNode[] = [];
  const regex = /\[(\d{1,2})\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const ref = refMap.get(Number(m[1]));
    if (ref) nodes.push(<CitationChip key={k} refItem={ref} onCite={onCite} />);
    last = m.index + m[0].length;
    k++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--nw-hairline)] py-5">
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className="text-[var(--nw-accent)]">{icon}</span>
        <h3 className="nw-overline">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function StoryBriefView({ brief, refs, onCite }: Props) {
  const refMap = new Map(refs.map((r) => [r.n, r]));
  const cite = (t: string) => withCites(t, refMap, onCite);

  return (
    <div>
      <h1 className="nw-lead mb-3">{brief.headline}</h1>
      <p className="nw-body">{cite(brief.short_summary)}</p>

      {brief.talking_points?.length > 0 && (
        <Section icon={<Lightbulb className="size-4" />} title="핵심 논점">
          <ul className="space-y-2">
            {brief.talking_points.map((pt, i) => (
              <li key={i} className="nw-body flex gap-2 text-base">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--nw-accent)]" />
                <span>{cite(pt)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {brief.quote?.text && (
        <Section icon={<Quote className="size-4" />} title="주요 발언">
          <blockquote className="border-l-[3px] border-[var(--nw-accent)] bg-[var(--nw-highlight)] py-2 pl-4">
            <p className="nw-serif text-lg leading-relaxed">"{brief.quote.text}"</p>
            {brief.quote.attribution && <p className="nw-meta mt-1.5">— {brief.quote.attribution}</p>}
          </blockquote>
        </Section>
      )}

      {brief.perspectives && brief.perspectives.length > 0 && (
        <Section icon={<Users className="size-4" />} title="입장 차이">
          <div className="grid gap-3 sm:grid-cols-2">
            {brief.perspectives.map((p, i) => (
              <div key={i} className="rounded-md border border-[var(--nw-hairline)] bg-[var(--nw-surface-2)] p-3">
                <div className="mb-1 font-semibold text-[var(--nw-accent)]">{p.stakeholder}</div>
                <p className="text-sm leading-relaxed">{cite(p.stance)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {brief.timeline && brief.timeline.length > 0 && (
        <Section icon={<Clock className="size-4" />} title="전개 타임라인">
          <ol className="relative ml-2 space-y-3 border-l border-[var(--nw-hairline)] pl-5">
            {brief.timeline.map((t, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[23px] top-1 size-2.5 rounded-full border-2 border-[var(--nw-bg)] bg-[var(--nw-accent)]" />
                <div className="nw-overline">{t.date}</div>
                <p className="mt-0.5 text-sm leading-relaxed">{cite(t.content)}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {brief.did_you_know && (
        <Section icon={<Lightbulb className="size-4" />} title="알아두면 좋은 것">
          <p className="text-base leading-relaxed">{cite(brief.did_you_know)}</p>
        </Section>
      )}

      {brief.future_outlook && (
        <Section icon={<TelescopeIcon className="size-4" />} title="앞으로는">
          <p className="text-base leading-relaxed">{cite(brief.future_outlook)}</p>
        </Section>
      )}
    </div>
  );
}

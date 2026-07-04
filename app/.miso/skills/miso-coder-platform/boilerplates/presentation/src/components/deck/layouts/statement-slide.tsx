import type { ReactNode } from "react";

import type { StatementSlide } from "@/lib/deck/types";

function renderHighlighted(text: string, highlight?: string): ReactNode {
  if (!highlight || !text.includes(highlight)) return text;
  const [before, ...rest] = text.split(highlight);
  return (
    <>
      {before}
      <span style={{ color: "var(--deck-accent)" }}>{highlight}</span>
      {rest.join(highlight)}
    </>
  );
}

export function StatementSlideView({ slide }: { slide: StatementSlide }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-center px-[110px]">
      <p
        className="deck-display whitespace-pre-line"
        style={{ fontSize: 54, lineHeight: 1.22, maxWidth: 1010, fontWeight: 700 }}
      >
        {renderHighlighted(slide.text, slide.highlight)}
      </p>
      {slide.attribution && (
        <div className="mt-[44px] flex items-center gap-[14px]">
          <span className="inline-block h-[2px] w-[36px]" style={{ background: "var(--deck-accent)" }} />
          <span className="deck-caption" style={{ fontSize: 14 }}>
            {slide.attribution}
          </span>
        </div>
      )}
    </div>
  );
}

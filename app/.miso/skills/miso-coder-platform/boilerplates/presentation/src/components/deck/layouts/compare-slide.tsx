import { Check } from "lucide-react";

import type { CompareSlide } from "@/lib/deck/types";

export function CompareSlideView({ slide }: { slide: CompareSlide }) {
  return (
    <div className="absolute inset-0 flex flex-col px-[88px] pt-[84px] pb-[88px]">
      <header style={{ maxWidth: 860 }}>
        {slide.kicker && <div className="deck-kicker">{slide.kicker}</div>}
        <h2 className="deck-slide-title mt-[14px] whitespace-pre-line">{slide.title}</h2>
      </header>
      <div
        className="mt-[34px] grid flex-1 gap-[22px]"
        style={{ gridTemplateColumns: `repeat(${slide.columns.length}, minmax(0, 1fr))` }}
      >
        {slide.columns.map((col) => (
          <div
            key={col.title}
            className="deck-surface flex flex-col p-[30px]"
            style={
              col.highlight
                ? { borderColor: "var(--deck-accent)", borderWidth: 2, background: "var(--deck-surface)" }
                : undefined
            }
          >
            <div className="flex items-center justify-between">
              <div className="text-[21px] font-extrabold" style={{ color: "var(--deck-ink)" }}>
                {col.title}
              </div>
              {col.tag && (
                <span
                  className="rounded-full px-[12px] py-[4px] text-[11px] font-extrabold tracking-[0.06em]"
                  style={{
                    background: col.highlight ? "var(--deck-accent)" : "var(--deck-accent-soft)",
                    color: col.highlight ? "var(--deck-bg)" : "var(--deck-accent)",
                  }}
                >
                  {col.tag}
                </span>
              )}
            </div>
            <div className="mt-[18px] h-px" style={{ background: "var(--deck-line)" }} />
            <ul className="mt-[18px] flex flex-col gap-[13px]">
              {col.points.map((p) => (
                <li key={p} className="flex items-start gap-[11px]">
                  <span
                    className="mt-[3px] grid h-[18px] w-[18px] flex-none place-items-center rounded-full"
                    style={{ background: "var(--deck-accent-soft)", color: "var(--deck-accent)" }}
                  >
                    <Check size={11} strokeWidth={3.2} />
                  </span>
                  <span className="text-[14.5px] leading-relaxed" style={{ color: "var(--deck-ink)" }}>
                    {p}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

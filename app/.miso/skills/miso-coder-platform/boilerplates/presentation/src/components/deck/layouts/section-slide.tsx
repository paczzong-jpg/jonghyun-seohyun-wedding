import type { SectionSlide } from "@/lib/deck/types";

export function SectionSlideView({ slide }: { slide: SectionSlide }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end px-[88px] pb-[110px]">
      <div
        aria-hidden
        className="deck-display deck-num absolute right-[72px] top-[36px] select-none"
        style={{
          fontSize: 320,
          lineHeight: 1,
          color: "transparent",
          WebkitTextStroke: "2px var(--deck-line)",
        }}
      >
        {slide.index}
      </div>
      <div className="flex items-baseline gap-[22px]">
        <span
          className="deck-display deck-num"
          style={{ fontSize: 30, color: "var(--deck-accent)" }}
        >
          {slide.index}
        </span>
        <span className="inline-block h-[3px] w-[56px]" style={{ background: "var(--deck-accent)" }} />
      </div>
      <h2 className="deck-display mt-[22px] whitespace-pre-line" style={{ fontSize: 64, maxWidth: 900 }}>
        {slide.title}
      </h2>
      {slide.subtitle && (
        <p className="deck-lead mt-[22px] whitespace-pre-line" style={{ maxWidth: 720 }}>
          {slide.subtitle}
        </p>
      )}
    </div>
  );
}

import type { QuoteSlide } from "@/lib/deck/types";

function initials(name: string): string {
  return name.trim().slice(0, 2);
}

export function QuoteSlideView({ slide }: { slide: QuoteSlide }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-center px-[120px]">
      <span
        aria-hidden
        className="deck-display select-none"
        style={{ fontSize: 150, lineHeight: 0.6, color: "var(--deck-accent)", opacity: 0.9 }}
      >
        “
      </span>
      <blockquote
        className="mt-[34px] whitespace-pre-line"
        style={{
          fontFamily: "var(--deck-font-display)",
          fontSize: 38,
          lineHeight: 1.42,
          fontWeight: 600,
          letterSpacing: "-0.015em",
          color: "var(--deck-ink)",
          maxWidth: 960,
        }}
      >
        {slide.quote}
      </blockquote>
      <div className="mt-[52px] flex items-center gap-[18px]">
        <div
          className="deck-num grid h-[52px] w-[52px] place-items-center rounded-full text-[17px] font-extrabold"
          style={{ background: "var(--deck-accent-soft)", color: "var(--deck-accent)" }}
        >
          {initials(slide.name)}
        </div>
        <div>
          <div className="text-[16px] font-bold" style={{ color: "var(--deck-ink)" }}>
            {slide.name}
          </div>
          {slide.role && (
            <div className="deck-caption mt-[2px]" style={{ fontSize: 13.5 }}>
              {slide.role}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

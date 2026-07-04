import type { TitleSlide } from "@/lib/deck/types";

export function TitleSlideView({ slide }: { slide: TitleSlide }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-between px-[88px] pt-[92px] pb-[72px]">
      <div>
        {slide.kicker && (
          <div className="flex items-center gap-[14px]">
            <span
              className="inline-block h-[3px] w-[44px]"
              style={{ background: "var(--deck-accent)" }}
            />
            <span className="deck-kicker">{slide.kicker}</span>
          </div>
        )}
      </div>
      <div>
        <h1
          className="deck-display whitespace-pre-line"
          style={{ fontSize: 78, maxWidth: 980 }}
        >
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p className="deck-lead mt-[28px] whitespace-pre-line" style={{ maxWidth: 760 }}>
            {slide.subtitle}
          </p>
        )}
      </div>
      <div
        className="flex items-center gap-[18px] border-t pt-[26px]"
        style={{ borderColor: "var(--deck-line)" }}
      >
        {slide.presenter && (
          <span className="text-[15px] font-bold" style={{ color: "var(--deck-ink)" }}>
            {slide.presenter}
          </span>
        )}
        {slide.presenter && slide.date && (
          <span
            className="inline-block h-[4px] w-[4px] rounded-full"
            style={{ background: "var(--deck-muted)" }}
          />
        )}
        {slide.date && (
          <span className="deck-num text-[15px]" style={{ color: "var(--deck-muted)" }}>
            {slide.date}
          </span>
        )}
      </div>
    </div>
  );
}

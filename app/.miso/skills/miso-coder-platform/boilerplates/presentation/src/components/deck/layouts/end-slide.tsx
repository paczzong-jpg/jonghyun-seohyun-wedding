import type { EndSlide } from "@/lib/deck/types";

export function EndSlideView({ slide }: { slide: EndSlide }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-center px-[110px]">
      <span className="inline-block h-[3px] w-[56px]" style={{ background: "var(--deck-accent)" }} />
      <h2 className="deck-display mt-[30px] whitespace-pre-line" style={{ fontSize: 72 }}>
        {slide.title}
      </h2>
      {slide.message && (
        <p className="deck-lead mt-[26px] whitespace-pre-line" style={{ maxWidth: 720 }}>
          {slide.message}
        </p>
      )}
      {slide.contact && slide.contact.length > 0 && (
        <div className="mt-[64px] flex gap-[64px]">
          {slide.contact.map((c) => (
            <div key={c.label}>
              <div className="deck-kicker" style={{ fontSize: 11.5 }}>
                {c.label}
              </div>
              <div className="mt-[8px] text-[17px] font-bold" style={{ color: "var(--deck-ink)" }}>
                {c.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

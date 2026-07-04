import type { CardsSlide } from "@/lib/deck/types";

export function CardsSlideView({ slide }: { slide: CardsSlide }) {
  const count = slide.cards.length;
  const cols = count <= 3 ? count : count === 4 ? 2 : 3;

  return (
    <div className="absolute inset-0 flex flex-col px-[88px] pt-[84px] pb-[88px]">
      <header style={{ maxWidth: 860 }}>
        {slide.kicker && <div className="deck-kicker">{slide.kicker}</div>}
        <h2 className="deck-slide-title mt-[14px] whitespace-pre-line">{slide.title}</h2>
      </header>
      <div
        className="mt-[34px] grid flex-1 gap-[22px]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {slide.cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="deck-surface flex flex-col p-[28px]">
              <div className="flex items-center justify-between">
                {Icon && (
                  <span
                    className="grid h-[46px] w-[46px] place-items-center"
                    style={{
                      background: "var(--deck-accent-soft)",
                      color: "var(--deck-accent)",
                      borderRadius: "calc(var(--deck-radius) * 0.6)",
                    }}
                  >
                    <Icon size={22} strokeWidth={2.1} />
                  </span>
                )}
                {card.tag && (
                  <span
                    className="rounded-full px-[12px] py-[4px] text-[11px] font-extrabold tracking-[0.08em]"
                    style={{ background: "var(--deck-accent2-soft)", color: "var(--deck-ink)" }}
                  >
                    {card.tag}
                  </span>
                )}
              </div>
              <div className="mt-auto pt-[20px]">
                <div className="text-[20px] font-extrabold leading-snug" style={{ color: "var(--deck-ink)" }}>
                  {card.title}
                </div>
                <p className="deck-body mt-[8px]" style={{ fontSize: 14.5 }}>
                  {card.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

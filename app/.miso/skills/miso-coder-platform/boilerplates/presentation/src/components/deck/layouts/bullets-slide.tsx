import type { BulletsSlide } from "@/lib/deck/types";

export function BulletsSlideView({ slide }: { slide: BulletsSlide }) {
  const columns = slide.columns ?? 1;

  return (
    <div className="absolute inset-0 flex flex-col px-[88px] pt-[84px] pb-[88px]">
      <header style={{ maxWidth: 900 }}>
        {slide.kicker && <div className="deck-kicker">{slide.kicker}</div>}
        <h2 className="deck-slide-title mt-[14px] whitespace-pre-line">{slide.title}</h2>
      </header>
      <div
        className="mt-[30px] grid flex-1 content-center gap-x-[56px]"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {slide.bullets.map((b, i) => {
          const Icon = b.icon;
          return (
            <div
              key={b.title}
              className="flex items-start gap-[20px] border-t py-[20px]"
              style={{ borderColor: "var(--deck-line)" }}
            >
              {Icon ? (
                <span
                  className="grid h-[42px] w-[42px] flex-none place-items-center rounded-full"
                  style={{ background: "var(--deck-accent-soft)", color: "var(--deck-accent)" }}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </span>
              ) : (
                <span
                  className="deck-num pt-[2px] text-[14px] font-extrabold"
                  style={{ color: "var(--deck-accent)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              )}
              <div className="min-w-0">
                <div className="text-[19px] font-bold leading-snug" style={{ color: "var(--deck-ink)" }}>
                  {b.title}
                </div>
                {b.desc && (
                  <p className="deck-body mt-[6px]" style={{ fontSize: 15 }}>
                    {b.desc}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

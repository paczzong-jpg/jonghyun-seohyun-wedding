import { MoveDownRight, MoveRight, MoveUpRight } from "lucide-react";

import type { MetricsSlide } from "@/lib/deck/types";

const TREND_ICON = { up: MoveUpRight, down: MoveDownRight, flat: MoveRight } as const;

export function MetricsSlideView({ slide }: { slide: MetricsSlide }) {
  const count = slide.items.length;
  const cols = count <= 3 ? count : count === 4 ? 2 : 3;
  const valueSize = count <= 3 ? 76 : count === 4 ? 64 : 54;

  return (
    <div className="absolute inset-0 flex flex-col px-[88px] pt-[84px] pb-[88px]">
      <header className="flex items-end justify-between">
        <div style={{ maxWidth: 760 }}>
          {slide.kicker && <div className="deck-kicker">{slide.kicker}</div>}
          <h2 className="deck-slide-title mt-[14px] whitespace-pre-line">{slide.title}</h2>
        </div>
      </header>
      <div
        className="mt-[36px] grid flex-1 gap-[24px]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {slide.items.map((m) => {
          const Trend = m.trend ? TREND_ICON[m.trend] : null;
          return (
            <div key={m.label} className="deck-surface flex flex-col justify-between p-[30px]">
              <div className="deck-caption font-bold uppercase tracking-[0.14em]" style={{ fontSize: 12 }}>
                {m.label}
              </div>
              <div>
                <div
                  className="deck-display deck-num"
                  style={{ fontSize: valueSize, color: "var(--deck-ink)" }}
                >
                  {m.value}
                </div>
                {m.delta && (
                  <div className="mt-[10px] flex items-center gap-[7px]">
                    {Trend && (
                      <span
                        className="grid h-[22px] w-[22px] place-items-center rounded-full"
                        style={{ background: "var(--deck-accent-soft)", color: "var(--deck-accent)" }}
                      >
                        <Trend size={13} strokeWidth={2.6} />
                      </span>
                    )}
                    <span className="deck-num text-[14px] font-bold" style={{ color: "var(--deck-accent)" }}>
                      {m.delta}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

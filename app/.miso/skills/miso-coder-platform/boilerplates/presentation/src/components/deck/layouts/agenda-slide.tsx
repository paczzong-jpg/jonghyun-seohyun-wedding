import type { AgendaSlide } from "@/lib/deck/types";

export function AgendaSlideView({ slide }: { slide: AgendaSlide }) {
  const two = slide.items.length > 5;
  const cols = two
    ? [slide.items.slice(0, Math.ceil(slide.items.length / 2)), slide.items.slice(Math.ceil(slide.items.length / 2))]
    : [slide.items];

  return (
    <div className="absolute inset-0 flex gap-[72px] px-[88px] pt-[96px] pb-[88px]">
      <div style={{ width: 300, flex: "none" }}>
        <div className="deck-kicker">Agenda</div>
        <h2 className="deck-slide-title mt-[18px] whitespace-pre-line">{slide.title}</h2>
      </div>
      <div className="flex min-w-0 flex-1 gap-[56px]">
        {cols.map((col, c) => (
          <ol key={c} className="flex min-w-0 flex-1 flex-col justify-center">
            {col.map((item, i) => {
              const n = c * cols[0].length + i + 1;
              return (
                <li
                  key={item.label}
                  className="flex items-start gap-[20px] border-t py-[22px] last:border-b"
                  style={{ borderColor: "var(--deck-line)" }}
                >
                  <span
                    className="deck-num pt-[2px] text-[15px] font-extrabold"
                    style={{ color: "var(--deck-accent)" }}
                  >
                    {String(n).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[19px] font-bold" style={{ color: "var(--deck-ink)" }}>
                      {item.label}
                    </div>
                    {item.note && (
                      <div className="deck-caption mt-[4px]" style={{ fontSize: 13.5 }}>
                        {item.note}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        ))}
      </div>
    </div>
  );
}

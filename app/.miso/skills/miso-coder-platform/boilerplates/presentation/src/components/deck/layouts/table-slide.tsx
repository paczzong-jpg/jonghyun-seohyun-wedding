import type { TableSlide } from "@/lib/deck/types";

export function TableSlideView({ slide }: { slide: TableSlide }) {
  return (
    <div className="absolute inset-0 flex flex-col px-[88px] pt-[84px] pb-[88px]">
      <header style={{ maxWidth: 860 }}>
        {slide.kicker && <div className="deck-kicker">{slide.kicker}</div>}
        <h2 className="deck-slide-title mt-[14px] whitespace-pre-line">{slide.title}</h2>
      </header>
      <div className="mt-[32px] flex flex-1 items-start">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {slide.columns.map((col, c) => (
                <th
                  key={col}
                  className="border-b-2 px-[18px] py-[13px] text-left text-[12.5px] font-extrabold uppercase tracking-[0.1em]"
                  style={{
                    borderColor: "var(--deck-ink)",
                    color: c === slide.emphasisCol ? "var(--deck-accent)" : "var(--deck-muted)",
                    background: c === slide.emphasisCol ? "var(--deck-accent-soft)" : undefined,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slide.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="deck-num border-b px-[18px] py-[14px] text-[15px]"
                    style={{
                      borderColor: "var(--deck-line)",
                      color: "var(--deck-ink)",
                      fontWeight: c === 0 ? 700 : c === slide.emphasisCol ? 800 : 400,
                      background: c === slide.emphasisCol ? "var(--deck-accent-soft)" : undefined,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

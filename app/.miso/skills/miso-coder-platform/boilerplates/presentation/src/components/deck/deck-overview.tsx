import { useEffect, useRef, useState } from "react";

import { SlideRenderer } from "@/components/deck/slide-renderer";
import type { DeckTheme } from "@/lib/deck/themes";
import { CANVAS_H, CANVAS_W, type DeckConfig, type SlideSpec } from "@/lib/deck/types";

type DeckOverviewProps = {
  slides: SlideSpec[];
  config: DeckConfig;
  theme: DeckTheme;
  activeIndex: number;
  onSelect: (index: number) => void;
};

/** 전체 슬라이드 오버뷰 — 실제 슬라이드를 축소 렌더링한 그리드 */
export function DeckOverview({ slides, config, theme, activeIndex, onSelect }: DeckOverviewProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [thumbScale, setThumbScale] = useState(0.22);

  useEffect(() => {
    const measure = () => {
      const cell = gridRef.current?.querySelector<HTMLElement>(".deck-thumb");
      if (cell) setThumbScale(cell.clientWidth / CANVAS_W);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [slides.length]);

  return (
    <div className="deck-overview">
      <div ref={gridRef} className="deck-overview-grid">
        {slides.map((slide, i) => (
          <button
            key={i}
            type="button"
            className="deck-thumb"
            data-active={i === activeIndex}
            onClick={() => onSelect(i)}
            aria-label={`${i + 1}번 슬라이드로 이동`}
          >
            <div
              className="deck-thumb-canvas"
              style={{
                transform: `scale(${thumbScale})`,
                width: CANVAS_W,
                height: CANVAS_H,
                fontFamily: "var(--deck-font-body)",
                background: "var(--deck-bg)",
                color: "var(--deck-ink)",
                position: "relative",
              }}
            >
              <SlideRenderer
                slide={slide}
                index={i}
                total={slides.length}
                config={config}
                theme={theme}
              />
            </div>
            <span className="deck-thumb-index deck-num">{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

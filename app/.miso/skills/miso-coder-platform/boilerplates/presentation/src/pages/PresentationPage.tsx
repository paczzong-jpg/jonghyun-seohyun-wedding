import { useEffect, useState } from "react";

import { DeckControls } from "@/components/deck/deck-controls";
import { DeckOverview } from "@/components/deck/deck-overview";
import { SlideRenderer } from "@/components/deck/slide-renderer";
import { deckConfig, slides } from "@/lib/deck-content";
import { DECK_THEMES, themeCssVars } from "@/lib/deck/themes";
import { CANVAS_H, CANVAS_W } from "@/lib/deck/types";
import { useDeck, useDeckScale } from "@/lib/deck/use-deck";

import "@/styles/deck.css";

export function PresentationPage() {
  const theme = DECK_THEMES[deckConfig.theme];
  const { index, go, next, prev, overview, setOverview } = useDeck(slides.length);
  const scale = useDeckScale(CANVAS_W, CANVAS_H);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    document.title = deckConfig.title;
  }, []);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      // pptxgenjs 는 무겁기 때문에 다운로드 시점에만 로드한다
      const { exportDeckToPptx } = await import("@/lib/deck/export-pptx");
      await exportDeckToPptx(deckConfig, slides);
    } catch (error) {
      console.error("PPTX 내보내기 실패:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="deck-stage" style={themeCssVars(theme)}>
      <div className="deck-canvas" style={{ transform: `scale(${scale})` }}>
        <div
          className="deck-progress"
          style={{ width: `${((index + 1) / slides.length) * 100}%` }}
        />
        <div key={index} className="deck-slide deck-slide-enter">
          <SlideRenderer
            slide={slides[index]}
            index={index}
            total={slides.length}
            config={deckConfig}
            theme={theme}
          />
        </div>
      </div>

      <DeckControls
        index={index}
        total={slides.length}
        onPrev={prev}
        onNext={next}
        onOverview={() => setOverview(true)}
        onDownload={handleDownload}
        downloading={downloading}
      />

      {overview && (
        <DeckOverview
          slides={slides}
          config={deckConfig}
          theme={theme}
          activeIndex={index}
          onSelect={(i) => {
            go(i);
            setOverview(false);
          }}
        />
      )}
    </div>
  );
}

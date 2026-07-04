import { AgendaSlideView } from "@/components/deck/layouts/agenda-slide";
import { BulletsSlideView } from "@/components/deck/layouts/bullets-slide";
import { CardsSlideView } from "@/components/deck/layouts/cards-slide";
import { ChartSlideView } from "@/components/deck/layouts/chart-slide";
import { CompareSlideView } from "@/components/deck/layouts/compare-slide";
import { EndSlideView } from "@/components/deck/layouts/end-slide";
import { GallerySlideView } from "@/components/deck/layouts/gallery-slide";
import { MediaSlideView } from "@/components/deck/layouts/media-slide";
import { MetricsSlideView } from "@/components/deck/layouts/metrics-slide";
import { QuoteSlideView } from "@/components/deck/layouts/quote-slide";
import { SectionSlideView } from "@/components/deck/layouts/section-slide";
import { StatementSlideView } from "@/components/deck/layouts/statement-slide";
import { TableSlideView } from "@/components/deck/layouts/table-slide";
import { TeamSlideView } from "@/components/deck/layouts/team-slide";
import { TextImageSlideView } from "@/components/deck/layouts/text-image-slide";
import { TimelineSlideView } from "@/components/deck/layouts/timeline-slide";
import { TitleSlideView } from "@/components/deck/layouts/title-slide";
import { SlideFrame } from "@/components/deck/slide-frame";
import type { DeckTheme } from "@/lib/deck/themes";
import type { DeckConfig, SlideSpec } from "@/lib/deck/types";

/** sparse 레이아웃엔 코너 워시 장식을 켠다 */
const WASHED: SlideSpec["layout"][] = ["title", "section", "statement", "quote", "end"];
/** 풀블리드 레이아웃은 푸터를 그리지 않는다 */
const NO_FOOTER: SlideSpec["layout"][] = ["media"];

function SlideBody({ slide, theme }: { slide: SlideSpec; theme: DeckTheme }) {
  switch (slide.layout) {
    case "title":
      return <TitleSlideView slide={slide} />;
    case "agenda":
      return <AgendaSlideView slide={slide} />;
    case "section":
      return <SectionSlideView slide={slide} />;
    case "statement":
      return <StatementSlideView slide={slide} />;
    case "quote":
      return <QuoteSlideView slide={slide} />;
    case "bullets":
      return <BulletsSlideView slide={slide} />;
    case "text-image":
      return <TextImageSlideView slide={slide} />;
    case "media":
      return <MediaSlideView slide={slide} />;
    case "metrics":
      return <MetricsSlideView slide={slide} />;
    case "cards":
      return <CardsSlideView slide={slide} />;
    case "timeline":
      return <TimelineSlideView slide={slide} />;
    case "compare":
      return <CompareSlideView slide={slide} />;
    case "table":
      return <TableSlideView slide={slide} />;
    case "chart":
      return <ChartSlideView slide={slide} theme={theme} />;
    case "gallery":
      return <GallerySlideView slide={slide} />;
    case "team":
      return <TeamSlideView slide={slide} />;
    case "end":
      return <EndSlideView slide={slide} />;
  }
}

type SlideRendererProps = {
  slide: SlideSpec;
  index: number;
  total: number;
  config: DeckConfig;
  theme: DeckTheme;
};

export function SlideRenderer({ slide, index, total, config, theme }: SlideRendererProps) {
  const noFooter = NO_FOOTER.includes(slide.layout) || slide.layout === "title";
  return (
    <SlideFrame
      theme={theme}
      background={slide.background}
      wash={WASHED.includes(slide.layout)}
      footer={noFooter || !config.footer ? undefined : config.footer}
      pageLabel={
        noFooter || !config.pageNumbers
          ? undefined
          : `${String(index + 1).padStart(2, "0")} — ${String(total).padStart(2, "0")}`
      }
    >
      <SlideBody slide={slide} theme={theme} />
    </SlideFrame>
  );
}

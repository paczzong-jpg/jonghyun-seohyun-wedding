import { forwardRef } from "react";
import { resolvePalette } from "@/lib/marketing/palette";
import { getPlatform } from "@/lib/marketing/platforms";
import type { AssetCopy, BrandKit, CreativeStyle } from "@/lib/marketing/types";
import { useCanvasScale } from "@/lib/marketing/use-canvas-scale";
import { CenterBadge } from "./archetypes/center-badge";
import { GradientHero } from "./archetypes/gradient-hero";
import { OutlineTypo } from "./archetypes/outline-typo";
import { PatternCard } from "./archetypes/pattern-card";
import { PhotoBackdrop } from "./archetypes/photo-backdrop";
import type { ArchetypeProps } from "./archetypes/shared";
import { SplitPanel } from "./archetypes/split-panel";

// 크리에이티브 캔버스 — 플랫폼 원본 px 로 렌더하고 컨테이너에 scale-to-fit.
// PNG 내보내기는 ref 로 노출되는 내부(원본 좌표계) 노드를 캡처한다.

const ARCHETYPE_COMPONENTS: Record<
  CreativeStyle["archetype"],
  (props: ArchetypeProps) => React.ReactElement
> = {
  gradient: GradientHero,
  split: SplitPanel,
  badge: CenterBadge,
  outline: OutlineTypo,
  photo: PhotoBackdrop,
  pattern: PatternCard,
};

export type CreativeCanvasProps = {
  brand: BrandKit;
  platformId: string;
  copy: AssetCopy;
  style: CreativeStyle;
  className?: string;
};

export const CreativeCanvas = forwardRef<HTMLDivElement, CreativeCanvasProps>(
  function CreativeCanvas({ brand, platformId, copy, style, className }, exportRef) {
    const platform = getPlatform(platformId);
    const { containerRef, scale } = useCanvasScale(platform.width, platform.height);
    const palette = resolvePalette(brand, style.paletteIndex);
    const Archetype = ARCHETYPE_COMPONENTS[style.archetype] ?? GradientHero;
    const unit = Math.min(platform.width, platform.height) / 100;

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${platform.width} / ${platform.height}`,
          overflow: "hidden",
        }}
      >
        <div
          ref={exportRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: platform.width,
            height: platform.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            visibility: scale > 0 ? "visible" : "hidden",
          }}
        >
          <Archetype
            brand={brand}
            platform={platform}
            palette={palette}
            headline={copy.headline}
            body={copy.body}
            cta={copy.cta}
            showLogo={style.showLogo}
            bgImageUrl={style.bgImageUrl}
            textScale={style.textScale}
            paletteIndex={style.paletteIndex}
            unit={unit}
          />
        </div>
      </div>
    );
  },
);

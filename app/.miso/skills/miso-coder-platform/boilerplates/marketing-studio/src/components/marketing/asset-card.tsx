import { Link } from "react-router-dom";
import { getArchetype } from "@/lib/marketing/archetypes";
import { getPlatform } from "@/lib/marketing/platforms";
import type { BrandKit, MarketingAsset } from "@/lib/marketing/types";
import { CreativeCanvas } from "./creative-canvas";

// 에셋 = 인쇄 도판(plate) — 흰 매트 위에 캔버스, 아래에 조판 지시풍 모노 캡션.

type Props = {
  asset: MarketingAsset;
  brand: BrandKit;
  plateNo: number;
};

export function AssetCard({ asset, brand, plateNo }: Props) {
  const platform = getPlatform(asset.platformId);
  return (
    <Link to={`/asset/${asset.id}`} className="group block">
      <div className="ms-plate">
        {/* 포맷 비율이 달라도 그리드 행이 깨지지 않도록 정방형 프레임에 letterbox */}
        <div className="flex aspect-square items-center justify-center">
          <div style={{ width: `${Math.min(1, platform.width / platform.height) * 100}%` }}>
            <CreativeCanvas
              brand={brand}
              platformId={asset.platformId}
              copy={asset}
              style={asset.style}
              className="overflow-hidden rounded-[4px]"
            />
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-2 px-1">
        <p className="ms-mono min-w-0 truncate text-muted-foreground">
          <span className="text-primary">PL.{String(plateNo).padStart(2, "0")}</span>
          {" · "}
          {platform.label}
        </p>
        <p className="ms-mono shrink-0 text-muted-foreground/70 transition-colors group-hover:text-primary">
          {getArchetype(asset.style.archetype).label}
        </p>
      </div>
    </Link>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AssetCard } from "@/components/marketing/asset-card";
import { ConceptCard } from "@/components/marketing/concept-card";
import { CAMPAIGN_GOALS } from "@/lib/marketing/config";
import { generateAssets, type GenerateAssetsProgress } from "@/lib/marketing/copy-generator";
import { PLATFORMS } from "@/lib/marketing/platforms";
import { getBrand, getCampaign, listAssets } from "@/lib/marketing/store";
import type { BrandKit, Campaign, MarketingAsset } from "@/lib/marketing/types";

// 캠페인 상세 — 컨셉 선택 → 채널 선택 → 에셋 일괄 생성 → 도판 갤러리

export function CampaignPage() {
  const { campaignId = "" } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [brand, setBrand] = useState<BrandKit | null>(null);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [conceptIndex, setConceptIndex] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<GenerateAssetsProgress | null>(null);

  useEffect(() => {
    getCampaign(campaignId)
      .then(async (loaded) => {
        setCampaign(loaded);
        const [loadedBrand, loadedAssets] = await Promise.all([
          getBrand(loaded.brandId),
          listAssets(loaded.id),
        ]);
        setBrand(loadedBrand);
        setAssets(loadedAssets);
      })
      .catch(() => {
        toast.error("캠페인을 불러오지 못했습니다.");
        navigate("/");
      });
  }, [campaignId, navigate]);

  const concept = campaign?.concepts[conceptIndex];

  // 컨셉을 바꾸면 추천 채널을 기본 선택으로 리셋
  useEffect(() => {
    if (!concept) return;
    setSelectedPlatforms(
      new Set(
        concept.recommendedPlatforms.length > 0
          ? concept.recommendedPlatforms
          : PLATFORMS.slice(0, 4).map((p) => p.id),
      ),
    );
  }, [concept]);

  const assetsByConcept = useMemo(() => {
    const groups = new Map<number, MarketingAsset[]>();
    for (const asset of assets) {
      const list = groups.get(asset.conceptIndex) ?? [];
      list.push(asset);
      groups.set(asset.conceptIndex, list);
    }
    return groups;
  }, [assets]);

  // 도판 번호 — 컨셉 순서대로 연속 매김
  const plateNumbers = useMemo(() => {
    const numbers = new Map<string, number>();
    let counter = 0;
    for (let index = 0; index < (campaign?.concepts.length ?? 0); index += 1) {
      for (const asset of assetsByConcept.get(index) ?? []) {
        counter += 1;
        numbers.set(asset.id, counter);
      }
    }
    return numbers;
  }, [campaign, assetsByConcept]);

  if (!campaign || !brand) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const goalLabel = CAMPAIGN_GOALS.find((g) => g.id === campaign.goal)?.label ?? campaign.goal;

  const generate = async () => {
    if (!concept) return;
    const platformIds = PLATFORMS.map((p) => p.id).filter((id) => selectedPlatforms.has(id));
    if (platformIds.length === 0) {
      toast.error("생성할 채널을 하나 이상 선택하세요.");
      return;
    }
    setProgress({ done: 0, total: platformIds.length, currentLabel: "" });
    try {
      const created = await generateAssets({
        brand,
        campaignId: campaign.id,
        concept,
        conceptIndex,
        platformIds,
        onProgress: setProgress,
      });
      setAssets((prev) => [...prev, ...created]);
      toast.success(`에셋 ${created.length}개를 만들었습니다.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "에셋 생성에 실패했습니다.");
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <header className="ms-reveal mb-10">
        <Link
          to={`/brand/${brand.id}`}
          className="ms-mono inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> {brand.name}
        </Link>
        <h1 className="ms-display mt-2 break-keep text-4xl">{goalLabel}</h1>
        {campaign.direction ? (
          <p className="mt-2 max-w-xl break-keep text-sm text-muted-foreground">
            {campaign.direction}
          </p>
        ) : null}
      </header>

      <section className="ms-reveal ms-reveal-1">
        <div className="ms-rule">
          <span className="ms-rule-no">01</span>
          <span className="ms-rule-label">컨셉 선택</span>
          <span className="ms-rule-meta">{campaign.concepts.length} CONCEPTS</span>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {campaign.concepts.map((item, index) => (
            <ConceptCard
              key={index}
              concept={item}
              index={index}
              selected={index === conceptIndex}
              onSelect={() => setConceptIndex(index)}
            />
          ))}
        </div>
      </section>

      <section className="ms-reveal ms-reveal-2 mt-14">
        <div className="ms-rule">
          <span className="ms-rule-no">02</span>
          <span className="ms-rule-label">채널 선택 · 에셋 생성</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              type="button"
              aria-pressed={selectedPlatforms.has(platform.id)}
              onClick={() => {
                setSelectedPlatforms((prev) => {
                  const next = new Set(prev);
                  if (next.has(platform.id)) next.delete(platform.id);
                  else next.add(platform.id);
                  return next;
                });
              }}
              className="ms-pill"
            >
              {platform.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ms-cta mt-6"
          disabled={progress !== null}
          onClick={() => void generate()}
        >
          {progress !== null ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {progress.done}/{progress.total} 생성 중
              {progress.currentLabel ? ` — ${progress.currentLabel}` : "…"}
            </>
          ) : (
            <>
              컨셉 {conceptIndex + 1} · {selectedPlatforms.size}개 채널 에셋 생성
              <ArrowRight className="ms-cta-arrow size-4" />
            </>
          )}
        </button>
      </section>

      {campaign.concepts.map((item, index) => {
        const group = assetsByConcept.get(index) ?? [];
        if (group.length === 0) return null;
        return (
          <section key={index} className="mt-14">
            <div className="ms-rule">
              <span className="ms-rule-no">{String(index + 1).padStart(2, "0")}</span>
              <span className="ms-rule-label">{item.title}</span>
              <span className="ms-rule-meta">{group.length} PLATES</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {group.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  brand={brand}
                  plateNo={plateNumbers.get(asset.id) ?? 0}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

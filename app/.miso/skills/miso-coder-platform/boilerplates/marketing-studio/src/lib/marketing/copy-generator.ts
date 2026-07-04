import { assignArchetype } from "./archetypes";
import { describeBrand } from "./brand-analyzer";
import { LLM_TEMPERATURE, copyPrompt } from "./config";
import { asString, completeJson } from "./llm";
import { getPlatform } from "./platforms";
import { createAsset } from "./store";
import type { AssetCopy, BrandKit, CampaignConcept, MarketingAsset } from "./types";

// 컨셉 × 플랫폼 → LLM 카피 + 아키타입 자동 배정 → PB 에셋 생성

function describeConcept(concept: CampaignConcept): string {
  return `캠페인 컨셉
- 제목: ${concept.title}
- 테마: ${concept.theme}
- 훅: ${concept.hook}
- 핵심 메시지: ${concept.keyMessage}
- 기본 CTA: ${concept.cta}
- 톤 노트: ${concept.toneNotes}`;
}

export async function generateCopy(
  brand: BrandKit,
  concept: CampaignConcept,
  platformId: string,
): Promise<AssetCopy> {
  const platform = getPlatform(platformId);
  const prompt = copyPrompt({
    brandBlock: describeBrand(brand),
    conceptBlock: describeConcept(concept),
    platformLabel: platform.label,
    tone: platform.copy.tone,
    headlineMax: platform.copy.headlineMax,
    bodyMax: platform.copy.bodyMax,
    ctaMax: platform.copy.ctaMax,
    language: brand.language,
  });

  const raw = await completeJson<{ headline?: unknown; body?: unknown; cta?: unknown }>({
    prompt,
    temperature: LLM_TEMPERATURE.copy,
  });

  return {
    headline: asString(raw.headline, concept.hook),
    body: platform.copy.bodyMax === 0 ? "" : asString(raw.body),
    cta: platform.copy.ctaMax === 0 ? "" : asString(raw.cta, concept.cta),
  };
}

export type GenerateAssetsProgress = {
  done: number;
  total: number;
  currentLabel: string;
};

// 선택 플랫폼 전체에 대해 순차 생성 (LLM 호출은 플랫폼당 1회).
// 개별 실패는 훅 카피 폴백으로 흡수해 배치 전체가 죽지 않게 한다.
export async function generateAssets(input: {
  brand: BrandKit;
  campaignId: string;
  concept: CampaignConcept;
  conceptIndex: number;
  platformIds: string[];
  onProgress?: (progress: GenerateAssetsProgress) => void;
}): Promise<MarketingAsset[]> {
  const { brand, campaignId, concept, conceptIndex, platformIds, onProgress } = input;
  const created: MarketingAsset[] = [];
  // 브랜드 이미지 갤러리(og:image 포함)를 photo 아키타입 배경으로 로테이션 배정
  const imagePool = [...new Set([brand.ogImageUrl, ...brand.images].filter(Boolean))];
  const hasImage = imagePool.length > 0;

  for (let i = 0; i < platformIds.length; i += 1) {
    const platform = getPlatform(platformIds[i]);
    onProgress?.({ done: i, total: platformIds.length, currentLabel: platform.label });

    let copy: AssetCopy;
    try {
      copy = await generateCopy(brand, concept, platform.id);
    } catch {
      copy = {
        headline: concept.hook || concept.title,
        body: platform.copy.bodyMax === 0 ? "" : concept.keyMessage,
        cta: platform.copy.ctaMax === 0 ? "" : concept.cta,
      };
    }

    const archetype = assignArchetype(platform, conceptIndex, hasImage);
    const asset = await createAsset({
      campaignId,
      brandId: brand.id,
      conceptIndex,
      platformId: platform.id,
      headline: copy.headline,
      body: copy.body,
      cta: copy.cta,
      style: {
        archetype,
        paletteIndex: conceptIndex,
        showLogo: true,
        bgImageUrl:
          archetype === "photo" ? (imagePool[(conceptIndex + i) % imagePool.length] ?? "") : "",
        textScale: 1,
      },
    });
    created.push(asset);
  }

  onProgress?.({ done: platformIds.length, total: platformIds.length, currentLabel: "" });
  return created;
}

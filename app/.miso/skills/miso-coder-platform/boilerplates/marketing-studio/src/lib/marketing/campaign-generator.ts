import { describeBrand } from "./brand-analyzer";
import { CAMPAIGN_GOALS, LLM_TEMPERATURE, conceptsPrompt, suggestionsPrompt } from "./config";
import { asString, asStringArray, completeJson } from "./llm";
import { PLATFORMS } from "./platforms";
import type { BrandKit, CampaignConcept, CampaignGoalId } from "./types";

// DNA 기반 캠페인 아이디어 제안
export type CampaignSuggestion = {
  title: string;
  goal: CampaignGoalId;
  direction: string;
};

const GOAL_IDS = new Set<string>(CAMPAIGN_GOALS.map((g) => g.id));

export async function generateSuggestions(brand: BrandKit): Promise<CampaignSuggestion[]> {
  const raw = await completeJson<{ title?: unknown; goal?: unknown; direction?: unknown }[]>({
    prompt: suggestionsPrompt({
      brandBlock: describeBrand(brand),
      goalIds: CAMPAIGN_GOALS.map((g) => g.id),
      language: brand.language,
    }),
    temperature: LLM_TEMPERATURE.suggestions,
  });
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 3).map((item) => {
    const goal = asString(item.goal);
    return {
      title: asString(item.title),
      goal: (GOAL_IDS.has(goal) ? goal : "brand_awareness") as CampaignGoalId,
      direction: asString(item.direction),
    };
  });
}

// 브랜드 킷 + 목표 → 서로 다른 캠페인 컨셉 4개

type RawConcept = {
  title?: unknown;
  theme?: unknown;
  key_message?: unknown;
  hook?: unknown;
  cta?: unknown;
  tone_notes?: unknown;
  visual_direction?: unknown;
  recommended_platforms?: unknown;
};

const PLATFORM_IDS = new Set(PLATFORMS.map((p) => p.id));

export async function generateConcepts(
  brand: BrandKit,
  goal: CampaignGoalId,
  direction: string,
): Promise<CampaignConcept[]> {
  const goalLabel = CAMPAIGN_GOALS.find((g) => g.id === goal)?.label ?? goal;
  const prompt = conceptsPrompt({
    brandBlock: describeBrand(brand),
    goalLabel,
    direction,
    platformIds: PLATFORMS.map((p) => p.id),
    language: brand.language,
  });

  const raw = await completeJson<RawConcept[]>({
    prompt,
    temperature: LLM_TEMPERATURE.concepts,
  });
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("LLM 이 캠페인 컨셉을 반환하지 않았습니다. 다시 시도하세요.");
  }

  return raw.slice(0, 4).map((c) => ({
    title: asString(c.title),
    theme: asString(c.theme),
    keyMessage: asString(c.key_message),
    hook: asString(c.hook),
    cta: asString(c.cta),
    toneNotes: asString(c.tone_notes),
    visualDirection: asString(c.visual_direction),
    recommendedPlatforms: asStringArray(c.recommended_platforms).filter((id) =>
      PLATFORM_IDS.has(id),
    ),
  }));
}

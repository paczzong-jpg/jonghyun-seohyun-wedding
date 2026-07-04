// 마케팅 스튜디오 도메인 타입 — 브랜드 킷 / 캠페인 / 에셋의 단일 소스.
// PB 컬렉션 스키마(api/setup_marketing_collections.mjs)와 필드명을 맞춘다.

export type BrandKit = {
  id: string;
  url: string;
  name: string;
  industry: string;
  tagline: string;
  valueProposition: string;
  toneOfVoice: string[];
  personality: string[];
  targetAudience: string;
  keyMessages: string[];
  primaryColors: string[];
  secondaryColors: string[];
  fonts: string[];
  logoUrl: string;
  ogImageUrl: string;
  images: string[];
  imageryStyle: string;
  layoutStyle: string;
  language: string;
  created?: string;
  updated?: string;
};

export type BrandKitDraft = Omit<BrandKit, "id" | "created" | "updated">;

export type CampaignGoalId =
  | "product_launch"
  | "lead_generation"
  | "brand_awareness"
  | "engagement"
  | "thought_leadership"
  | "promotion";

export type CampaignConcept = {
  title: string;
  theme: string;
  keyMessage: string;
  hook: string;
  cta: string;
  toneNotes: string;
  visualDirection: string;
  recommendedPlatforms: string[];
};

export type Campaign = {
  id: string;
  brandId: string;
  goal: CampaignGoalId;
  direction: string;
  concepts: CampaignConcept[];
  created?: string;
};

export type ArchetypeId =
  | "gradient"
  | "split"
  | "badge"
  | "outline"
  | "photo"
  | "pattern";

export type TextScale = 0.85 | 1 | 1.15;

export type CreativeStyle = {
  archetype: ArchetypeId;
  paletteIndex: number;
  showLogo: boolean;
  bgImageUrl: string;
  textScale: TextScale;
};

export type MarketingAsset = {
  id: string;
  campaignId: string;
  brandId: string;
  conceptIndex: number;
  platformId: string;
  headline: string;
  body: string;
  cta: string;
  style: CreativeStyle;
  created?: string;
  updated?: string;
};

export type AssetCopy = Pick<MarketingAsset, "headline" | "body" | "cta">;

// api/marketing_scrape.pb.js 의 응답 형태
export type ScrapeResult = {
  url: string;
  title: string;
  description: string;
  siteName: string;
  lang: string;
  bodyText: string;
  ogImage: string;
  favicon: string;
  logoCandidates: string[];
  images: string[];
  colorCandidates: { value: string; count: number }[];
  fontCandidates: string[];
  ogImageData: { mime: string; base64: string } | null;
};

import pb from "@/lib/miso-sdk/runtime-client";
import type {
  BrandKit,
  BrandKitDraft,
  Campaign,
  CampaignConcept,
  CampaignGoalId,
  CreativeStyle,
  MarketingAsset,
} from "./types";

// PocketBase 영속 계층 — 컬렉션은 api/setup_marketing_collections.mjs 가 만든다.

const COLLECTIONS = {
  BRANDS: "marketing_brands",
  CAMPAIGNS: "marketing_campaigns",
  ASSETS: "marketing_assets",
} as const;

type PBRecord = Record<string, unknown> & {
  id: string;
  created?: string;
  updated?: string;
};

function readJson<T>(value: unknown, fallback: T): T {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

// ── Brand ─────────────────────────────────────────────────────

function toBrand(record: PBRecord): BrandKit {
  return {
    id: record.id,
    url: str(record.url),
    name: str(record.name),
    industry: str(record.industry),
    tagline: str(record.tagline),
    valueProposition: str(record.valueProposition),
    toneOfVoice: readJson<string[]>(record.toneOfVoice, []),
    personality: readJson<string[]>(record.personality, []),
    targetAudience: str(record.targetAudience),
    keyMessages: readJson<string[]>(record.keyMessages, []),
    primaryColors: readJson<string[]>(record.primaryColors, []),
    secondaryColors: readJson<string[]>(record.secondaryColors, []),
    fonts: readJson<string[]>(record.fonts, []),
    logoUrl: str(record.logoUrl),
    ogImageUrl: str(record.ogImageUrl),
    images: readJson<string[]>(record.images, []),
    imageryStyle: str(record.imageryStyle),
    layoutStyle: str(record.layoutStyle),
    language: str(record.language),
    created: record.created,
    updated: record.updated,
  };
}

function brandPayload(draft: BrandKitDraft): Record<string, unknown> {
  return { ...draft };
}

export async function listBrands(): Promise<BrandKit[]> {
  const records = await pb
    .collection(COLLECTIONS.BRANDS)
    .getFullList<PBRecord>({ sort: "-created" });
  return records.map(toBrand);
}

export async function getBrand(id: string): Promise<BrandKit> {
  const record = await pb.collection(COLLECTIONS.BRANDS).getOne<PBRecord>(id);
  return toBrand(record);
}

export async function createBrand(draft: BrandKitDraft): Promise<BrandKit> {
  const record = await pb
    .collection(COLLECTIONS.BRANDS)
    .create<PBRecord>(brandPayload(draft));
  return toBrand(record);
}

export async function updateBrand(
  id: string,
  patch: Partial<BrandKitDraft>,
): Promise<BrandKit> {
  const record = await pb
    .collection(COLLECTIONS.BRANDS)
    .update<PBRecord>(id, patch);
  return toBrand(record);
}

export async function deleteBrand(id: string): Promise<void> {
  const campaigns = await listCampaigns(id);
  for (const campaign of campaigns) {
    await deleteCampaign(campaign.id);
  }
  await pb.collection(COLLECTIONS.BRANDS).delete(id);
}

// ── Campaign ──────────────────────────────────────────────────

function toCampaign(record: PBRecord): Campaign {
  return {
    id: record.id,
    brandId: str(record.brandId),
    goal: str(record.goal) as CampaignGoalId,
    direction: str(record.direction),
    concepts: readJson<CampaignConcept[]>(record.concepts, []),
    created: record.created,
  };
}

export async function listCampaigns(brandId: string): Promise<Campaign[]> {
  const records = await pb
    .collection(COLLECTIONS.CAMPAIGNS)
    .getFullList<PBRecord>({
      filter: pb.filter("brandId = {:brandId}", { brandId }),
      sort: "-created",
    });
  return records.map(toCampaign);
}

export async function getCampaign(id: string): Promise<Campaign> {
  const record = await pb.collection(COLLECTIONS.CAMPAIGNS).getOne<PBRecord>(id);
  return toCampaign(record);
}

export async function createCampaign(input: {
  brandId: string;
  goal: CampaignGoalId;
  direction: string;
  concepts: CampaignConcept[];
}): Promise<Campaign> {
  const record = await pb.collection(COLLECTIONS.CAMPAIGNS).create<PBRecord>(input);
  return toCampaign(record);
}

export async function deleteCampaign(id: string): Promise<void> {
  const assets = await listAssets(id);
  for (const asset of assets) {
    await pb.collection(COLLECTIONS.ASSETS).delete(asset.id);
  }
  await pb.collection(COLLECTIONS.CAMPAIGNS).delete(id);
}

// ── Asset ─────────────────────────────────────────────────────

const DEFAULT_STYLE: CreativeStyle = {
  archetype: "gradient",
  paletteIndex: 0,
  showLogo: true,
  bgImageUrl: "",
  textScale: 1,
};

function toAsset(record: PBRecord): MarketingAsset {
  return {
    id: record.id,
    campaignId: str(record.campaignId),
    brandId: str(record.brandId),
    conceptIndex: typeof record.conceptIndex === "number" ? record.conceptIndex : 0,
    platformId: str(record.platformId),
    headline: str(record.headline),
    body: str(record.body),
    cta: str(record.cta),
    style: { ...DEFAULT_STYLE, ...readJson<Partial<CreativeStyle>>(record.style, {}) },
    created: record.created,
    updated: record.updated,
  };
}

export async function listAssets(campaignId: string): Promise<MarketingAsset[]> {
  const records = await pb.collection(COLLECTIONS.ASSETS).getFullList<PBRecord>({
    filter: pb.filter("campaignId = {:campaignId}", { campaignId }),
    sort: "created",
  });
  return records.map(toAsset);
}

export async function getAsset(id: string): Promise<MarketingAsset> {
  const record = await pb.collection(COLLECTIONS.ASSETS).getOne<PBRecord>(id);
  return toAsset(record);
}

export async function createAsset(
  input: Omit<MarketingAsset, "id" | "created" | "updated">,
): Promise<MarketingAsset> {
  const record = await pb.collection(COLLECTIONS.ASSETS).create<PBRecord>(input);
  return toAsset(record);
}

export async function updateAsset(
  id: string,
  patch: Partial<Pick<MarketingAsset, "headline" | "body" | "cta" | "style">>,
): Promise<MarketingAsset> {
  const record = await pb.collection(COLLECTIONS.ASSETS).update<PBRecord>(id, patch);
  return toAsset(record);
}

export async function deleteAsset(id: string): Promise<void> {
  await pb.collection(COLLECTIONS.ASSETS).delete(id);
}

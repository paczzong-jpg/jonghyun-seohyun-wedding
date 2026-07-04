import { assignArchetype } from "./archetypes";
import { getPlatform } from "./platforms";
import { createAsset, createBrand, createCampaign } from "./store";
import type { BrandKit, BrandKitDraft, Campaign, CampaignConcept } from "./types";

// LLM·외부 네트워크 없이 크리에이티브 엔진을 바로 확인하는 데모 워크스페이스.
// URL 분석 전에 앱의 결과물 퀄리티를 미리 볼 수 있게 한다. 데모 데이터는 자유롭게 삭제 가능.

const DEMO_BRAND: BrandKitDraft = {
  url: "https://example.com/haneul-coffee",
  name: "하늘커피 로스터스",
  industry: "스페셜티 커피 로스터리",
  tagline: "고도 1,200m 의 아침을 그대로",
  valueProposition: "산지 직거래 스페셜티 원두를 로스팅 후 48시간 안에 문 앞까지 배송합니다",
  toneOfVoice: ["따뜻한", "정직한", "감각적인"],
  personality: ["장인정신", "친근함", "신뢰"],
  targetAudience: "집에서 핸드드립을 즐기는 25~45세 커피 애호가",
  keyMessages: [
    "로스팅 후 48시간 내 배송",
    "산지 직거래 시즌 싱글 오리진",
    "구독하면 매달 새로운 산지를 경험",
  ],
  primaryColors: ["#1f4d3f", "#e8b04b"],
  secondaryColors: ["#f5efe4", "#78350f"],
  fonts: ["Pretendard", "Georgia"],
  logoUrl: "",
  ogImageUrl: "",
  images: [],
  imageryStyle: "editorial",
  layoutStyle: "modern",
  language: "ko",
};

const DEMO_CONCEPTS: CampaignConcept[] = [
  {
    title: "48시간의 신선함",
    theme: "로스팅 직후의 향을 시간 단위로 증명하는 신선도 캠페인",
    keyMessage: "커피의 향은 시간과의 싸움 — 하늘커피는 48시간 안에 도착합니다",
    hook: "어제 볶은 원두, 내일 아침 당신의 잔에",
    cta: "지금 주문하기",
    toneNotes: "확신에 찬 장인의 목소리, 숫자로 말하기",
    visualDirection: "딥 그린 배경 위 골드 포인트, 시간의 흐름을 암시하는 대각 구도",
    recommendedPlatforms: ["instagram_feed", "web_banner", "kakao_channel", "email_header"],
  },
  {
    title: "이달의 산지 여행",
    theme: "매달 바뀌는 싱글 오리진 구독을 여행 콘텐츠처럼 풀어내는 시리즈",
    keyMessage: "구독 한 번으로 매달 다른 산지의 아침을 마십니다",
    hook: "이번 달은 에티오피아 예가체프입니다",
    cta: "구독 시작하기",
    toneNotes: "여행 에세이 같은 감성, 그러나 짧고 선명하게",
    visualDirection: "크림 페이퍼 톤 + 산지명을 큰 타이포로, 여백 있는 에디토리얼",
    recommendedPlatforms: ["instagram_story", "naver_blog_thumbnail", "linkedin_post"],
  },
  {
    title: "핸드드립 입문 30일",
    theme: "초보자를 위한 핸드드립 가이드 콘텐츠로 신뢰와 참여를 만드는 캠페인",
    keyMessage: "장비보다 원두 — 좋은 원두면 누구나 맛있게 내립니다",
    hook: "핸드드립, 생각보다 어렵지 않습니다",
    cta: "가이드 받기",
    toneNotes: "다정한 선배의 톤, 전문용어는 풀어서",
    visualDirection: "밝은 배경에 단계감 있는 구성, 손글씨 느낌의 포인트",
    recommendedPlatforms: ["youtube_thumbnail", "instagram_feed", "facebook_ad"],
  },
  {
    title: "사무실의 아침을 바꾸다",
    theme: "B2B 정기납품 — 좋은 커피가 팀 문화가 되는 이야기",
    keyMessage: "복지는 거창하지 않아도 됩니다. 매일의 커피 한 잔부터",
    hook: "월요일 회의가 기다려지는 이유",
    cta: "납품 문의",
    toneNotes: "단정한 비즈니스 톤, 그러나 사람 냄새 나게",
    visualDirection: "네이비-그린 계열의 신뢰감, 정돈된 그리드",
    recommendedPlatforms: ["linkedin_post", "x_post", "email_header"],
  },
];

const DEMO_ASSET_SEEDS: {
  conceptIndex: number;
  platformId: string;
  headline: string;
  body: string;
  cta: string;
}[] = [
  {
    conceptIndex: 0,
    platformId: "instagram_feed",
    headline: "어제 볶은 원두가 내일 도착합니다",
    body: "로스팅 후 48시간, 향이 가장 깊은 순간에 문 앞으로.",
    cta: "지금 주문",
  },
  {
    conceptIndex: 1,
    platformId: "instagram_story",
    headline: "이번 달, 예가체프",
    body: "",
    cta: "구독하기",
  },
  {
    conceptIndex: 2,
    platformId: "youtube_thumbnail",
    headline: "핸드드립 30일 완성",
    body: "",
    cta: "",
  },
  {
    conceptIndex: 3,
    platformId: "linkedin_post",
    headline: "월요일 회의가 기다려지는 이유",
    body: "팀의 아침을 바꾸는 가장 쉬운 복지, 스페셜티 정기납품을 시작하세요.",
    cta: "납품 문의",
  },
];

export async function createDemoWorkspace(): Promise<{
  brand: BrandKit;
  campaign: Campaign;
}> {
  const brand = await createBrand(DEMO_BRAND);
  const campaign = await createCampaign({
    brandId: brand.id,
    goal: "brand_awareness",
    direction: "데모 캠페인 — 신선도와 구독 경험을 함께 보여주기",
    concepts: DEMO_CONCEPTS,
  });

  for (const seed of DEMO_ASSET_SEEDS) {
    const platform = getPlatform(seed.platformId);
    await createAsset({
      campaignId: campaign.id,
      brandId: brand.id,
      conceptIndex: seed.conceptIndex,
      platformId: seed.platformId,
      headline: seed.headline,
      body: seed.body,
      cta: seed.cta,
      style: {
        archetype: assignArchetype(platform, seed.conceptIndex, false),
        paletteIndex: seed.conceptIndex,
        showLogo: true,
        bgImageUrl: "",
        textScale: 1,
      },
    });
  }

  return { brand, campaign };
}

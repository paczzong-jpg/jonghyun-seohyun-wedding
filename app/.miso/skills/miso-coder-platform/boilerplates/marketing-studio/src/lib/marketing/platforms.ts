import type { ArchetypeId } from "./types";

// 플랫폼 스펙 — 크리에이티브 캔버스의 고정 px 좌표계이자 PNG 내보내기 해상도.
// copy 캡은 "한글 기준 글자수"로 LLM 프롬프트에 그대로 들어간다 (영문은 대략 2배 허용).
export type PlatformSpec = {
  id: string;
  channel: string;
  label: string;
  width: number;
  height: number;
  // 하단 안전 영역 비율 — 스토리 등 앱 UI가 겹치는 영역엔 콘텐츠를 두지 않는다.
  safeBottom: number;
  copy: {
    headlineMax: number;
    bodyMax: number;
    ctaMax: number;
    tone: string;
  };
  defaultArchetype: ArchetypeId;
};

export const PLATFORMS: PlatformSpec[] = [
  {
    id: "instagram_feed",
    channel: "Instagram",
    label: "Instagram 피드 (1080×1080)",
    width: 1080,
    height: 1080,
    safeBottom: 0,
    copy: {
      headlineMax: 24,
      bodyMax: 60,
      ctaMax: 8,
      tone: "캐주얼하고 스크롤을 멈추게 하는 한 방이 있는 톤",
    },
    defaultArchetype: "gradient",
  },
  {
    id: "instagram_story",
    channel: "Instagram",
    label: "Instagram 스토리 (1080×1920)",
    width: 1080,
    height: 1920,
    safeBottom: 0.18,
    copy: {
      headlineMax: 16,
      bodyMax: 0,
      ctaMax: 8,
      tone: "한 줄로 꽂히는 훅, 짧고 강하게",
    },
    defaultArchetype: "split",
  },
  {
    id: "linkedin_post",
    channel: "LinkedIn",
    label: "LinkedIn 피드 (1200×1200)",
    width: 1200,
    height: 1200,
    safeBottom: 0,
    copy: {
      headlineMax: 30,
      bodyMax: 80,
      ctaMax: 8,
      tone: "전문적이고 단정적인 비즈니스 톤, 해시태그 금지",
    },
    defaultArchetype: "badge",
  },
  {
    id: "facebook_ad",
    channel: "Facebook",
    label: "Facebook 피드 광고 (1080×1080)",
    width: 1080,
    height: 1080,
    safeBottom: 0,
    copy: {
      headlineMax: 20,
      bodyMax: 60,
      ctaMax: 8,
      tone: "혜택이 먼저 보이는 대화체, 직접적으로",
    },
    defaultArchetype: "pattern",
  },
  {
    id: "x_post",
    channel: "X",
    label: "X(트위터) 포스트 (1600×900)",
    width: 1600,
    height: 900,
    safeBottom: 0,
    copy: {
      headlineMax: 18,
      bodyMax: 70,
      ctaMax: 8,
      tone: "위트 있는 단문, 의견이 담긴 한 줄의 에너지",
    },
    defaultArchetype: "outline",
  },
  {
    id: "web_banner",
    channel: "웹",
    label: "웹 히어로 배너 (1920×960)",
    width: 1920,
    height: 960,
    safeBottom: 0,
    copy: {
      headlineMax: 18,
      bodyMax: 45,
      ctaMax: 8,
      tone: "자신감 있는 브랜드 사이트 목소리",
    },
    defaultArchetype: "gradient",
  },
  {
    id: "email_header",
    channel: "이메일",
    label: "이메일 헤더 (1200×400)",
    width: 1200,
    height: 400,
    safeBottom: 0,
    copy: {
      headlineMax: 22,
      bodyMax: 40,
      ctaMax: 8,
      tone: "따뜻하고 직접적인, 제목줄 같은 문장",
    },
    defaultArchetype: "split",
  },
  {
    id: "youtube_thumbnail",
    channel: "YouTube",
    label: "YouTube 썸네일 (1280×720)",
    width: 1280,
    height: 720,
    safeBottom: 0,
    copy: {
      headlineMax: 12,
      bodyMax: 0,
      ctaMax: 0,
      tone: "호기심을 폭발시키는 초강력 후킹, 과감하게",
    },
    defaultArchetype: "photo",
  },
  {
    id: "kakao_channel",
    channel: "카카오톡",
    label: "카카오톡 채널 포스트 (800×800)",
    width: 800,
    height: 800,
    safeBottom: 0,
    copy: {
      headlineMax: 20,
      bodyMax: 50,
      ctaMax: 8,
      tone: "친근한 채널 소식 톤, 고객에게 말 걸듯",
    },
    defaultArchetype: "badge",
  },
  {
    id: "naver_blog_thumbnail",
    channel: "네이버",
    label: "네이버 블로그 썸네일 (800×450)",
    width: 800,
    height: 450,
    safeBottom: 0,
    copy: {
      headlineMax: 22,
      bodyMax: 30,
      ctaMax: 0,
      tone: "정보성 콘텐츠 제목 톤, 검색 클릭을 부르는 문장",
    },
    defaultArchetype: "outline",
  },
];

export function getPlatform(id: string): PlatformSpec {
  const found = PLATFORMS.find((p) => p.id === id);
  return found ?? PLATFORMS[0];
}

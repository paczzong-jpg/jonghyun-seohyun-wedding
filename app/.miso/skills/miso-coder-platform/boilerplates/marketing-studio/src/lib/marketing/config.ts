import type { CampaignGoalId } from "./types";

// ★ 앱 커스터마이징 SSOT — 라벨·캠페인 목표·LLM 프롬프트는 이 파일에서만 수정한다.

export const APP_NAME = "브랜드 마케팅 스튜디오";
export const APP_TAGLINE =
  "웹사이트 URL 하나로 브랜드 DNA를 추출하고, 캠페인과 채널별 크리에이티브를 만듭니다";

// PB 훅 라우트 경로 — 브라우저 호출 시 반드시 getRuntimeBase() 와 조합한다.
// raw "/api/..." 는 dev(Vite SPA 폴백 HTML)·발행(/site/<code> 프리픽스) 양쪽에서 깨진다.
export const SCRAPE_ENDPOINT = "/api/marketing/scrape";
export const IMAGE_PROXY_ENDPOINT = "/api/marketing/image";

export const CAMPAIGN_GOALS: {
  id: CampaignGoalId;
  label: string;
  description: string;
}[] = [
  { id: "product_launch", label: "신제품 출시", description: "새 제품·기능을 알립니다" },
  { id: "lead_generation", label: "리드 확보", description: "잠재 고객의 연락처를 모읍니다" },
  { id: "brand_awareness", label: "브랜드 인지도", description: "새로운 고객층에게 도달합니다" },
  { id: "engagement", label: "참여 유도", description: "댓글·공유·반응을 이끌어냅니다" },
  { id: "thought_leadership", label: "전문성 구축", description: "업계 관점과 권위를 세웁니다" },
  { id: "promotion", label: "판매 촉진", description: "구매·가입·프로모션 전환을 만듭니다" },
];

export const LLM_TEMPERATURE = {
  brandDna: 0.3,
  suggestions: 0.8,
  concepts: 0.8,
  copy: 0.7,
};

// ── LLM 프롬프트 ──────────────────────────────────────────────
// 모든 프롬프트는 STRICT JSON 응답을 요구한다. 파싱은 llm.ts 의 extractJson 이 담당.

export function brandDnaPrompt(input: {
  title: string;
  description: string;
  siteName: string;
  bodyText: string;
  lang: string;
}): string {
  return `당신은 시니어 브랜드 전략가다. 아래 웹사이트 내용에서 브랜드 DNA를 추출해 STRICT JSON 으로만 답하라 (마크다운·설명 금지). 웹사이트의 주 언어(${input.lang || "site language"})로 값을 작성하라.

{
  "brand_name": "브랜드명",
  "industry": "업종 (짧게)",
  "tagline": "브랜드 태그라인 — 사이트에 있으면 그대로, 없으면 내용에 충실하게 한 줄",
  "value_proposition": "핵심 가치 제안 한 문장",
  "tone_of_voice": ["3~5개의 목소리 특성 단어"],
  "personality": ["3~5개의 브랜드 개성 단어"],
  "target_audience": "타깃 고객 한 문장",
  "key_messages": ["3~5개의 짧은 핵심 메시지"],
  "imagery_style": "professional | casual | illustrated | cinematic | minimalist | editorial 중 하나",
  "layout_style": "modern | classic | minimalist | bold | editorial 중 하나",
  "language": "사이트 주 언어 코드 (ko, en, ja …)"
}

사이트 제목: ${input.title}
사이트명: ${input.siteName}
메타 설명: ${input.description}
본문 (발췌):
${input.bodyText}`;
}

export const BRAND_VISION_PROMPT = `이 이미지는 위 웹사이트의 대표 이미지다. 이미지에서 읽히는 브랜드 인상을 위 JSON 의 tone_of_voice / personality / imagery_style / layout_style 판단에 반영하라.`;

// 브랜드 DNA 기반 캠페인 아이디어 제안 (Pomelli 의 "Suggestions based on Business DNA")
export function suggestionsPrompt(input: {
  brandBlock: string;
  goalIds: string[];
  language: string;
}): string {
  return `당신은 브랜드 마케팅 전략가다. 아래 브랜드가 지금 실행할 만한 캠페인 아이디어 3개를 제안하라. ${input.language === "ko" ? "한국어로" : "브랜드 언어로"} 작성하라.

STRICT JSON 배열로만 답하라 (마크다운·설명 금지). 정확히 3개:
[
  {
    "title": "캠페인 이름 (6단어 이내, 구체적으로)",
    "goal": "다음 중 하나: ${input.goalIds.join(", ")}",
    "direction": "이 캠페인이 무엇을 어떻게 말할지 1~2문장 — 이 브랜드에만 맞게"
  }
]

세 아이디어는 목표와 앵글이 서로 달라야 한다. 뻔한 제안 금지.

${input.brandBlock}`;
}

export function conceptsPrompt(input: {
  brandBlock: string;
  goalLabel: string;
  direction: string;
  platformIds: string[];
  language: string;
}): string {
  return `당신은 시니어 브랜드 전략가다. 아래 브랜드를 위해 목표 "${input.goalLabel}"에 맞는 서로 확실히 다른 마케팅 캠페인 컨셉 4개를 만들어라. ${input.language === "ko" ? "한국어로" : "브랜드 언어로"} 작성하라.

STRICT JSON 배열로만 답하라 (마크다운·설명 금지). 정확히 4개:
[
  {
    "title": "컨셉 이름 (6단어 이내, 임팩트 있게)",
    "theme": "전략적 앵글 한 문장",
    "key_message": "고객이 기억해야 할 것 한 문장",
    "hook": "리드 에셋의 첫 줄이 될 짧은 훅",
    "cta": "2~4단어 행동 유도 문구",
    "tone_notes": "이 컨셉을 쓸 때의 목소리 지침",
    "visual_direction": "팔레트·이미지·레이아웃 큐 1~2문장",
    "recommended_platforms": ["다음 중에서 3~5개: ${input.platformIds.join(", ")}"]
  }
]

컨셉끼리 앵글이 진짜로 달라야 한다. 뻔한 마케팅 문구가 아니라 이 브랜드에만 맞는 구체적인 컨셉을 써라.

${input.brandBlock}

목표: ${input.goalLabel}
${input.direction ? `사용자 방향: ${input.direction}` : ""}`;
}

export function copyPrompt(input: {
  brandBlock: string;
  conceptBlock: string;
  platformLabel: string;
  tone: string;
  headlineMax: number;
  bodyMax: number;
  ctaMax: number;
  language: string;
}): string {
  const rule = (label: string, max: number) =>
    max === 0
      ? `"${label}": ""  (이 플랫폼은 ${label} 를 쓰지 않는다 — 빈 문자열)`
      : `"${label}": "한글 기준 ${max}자 이내 (영문이면 ${max * 2}자 이내)"`;

  return `당신은 온브랜드 마케팅 카피라이터다. 아래 캠페인 컨셉을 "${input.platformLabel}" 채널용 카피로 변환하라. ${input.language === "ko" ? "한국어로" : "브랜드 언어로"} 작성하라.

STRICT JSON 으로만 답하라:
{
  ${rule("headline", input.headlineMax)},
  ${rule("body", input.bodyMax)},
  ${rule("cta", input.ctaMax)}
}

채널 톤: ${input.tone}
글자수 제한을 반드시 지켜라. 해시태그·이모지·마크다운 금지. 브랜드 목소리를 그대로 유지하라.

${input.brandBlock}

${input.conceptBlock}`;
}

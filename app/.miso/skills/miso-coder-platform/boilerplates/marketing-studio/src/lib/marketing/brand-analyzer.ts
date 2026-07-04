import { getRuntimeBase } from "@/lib/miso-sdk/site-client";
import { BRAND_VISION_PROMPT, LLM_TEMPERATURE, SCRAPE_ENDPOINT, brandDnaPrompt } from "./config";
import { asString, asStringArray, completeJson } from "./llm";
import { extractPalette, normalizeHex } from "./palette";
import type { BrandKitDraft, ScrapeResult } from "./types";

// URL → 스크레이프 훅 → LLM 분석 → 편집 가능한 브랜드 킷 초안.
// 원본 Pomelli 의 Playwright 스크린샷 + vision 조합 대신
// PB 훅의 HTML/CSS 수집 + og:image vision(모델이 지원할 때만)으로 대체한다.

export type AnalyzeProgress = "scraping" | "analyzing" | "done";

type DnaResponse = {
  brand_name?: unknown;
  industry?: unknown;
  tagline?: unknown;
  value_proposition?: unknown;
  tone_of_voice?: unknown;
  personality?: unknown;
  target_audience?: unknown;
  key_messages?: unknown;
  imagery_style?: unknown;
  layout_style?: unknown;
  language?: unknown;
};

export async function scrapeSite(url: string): Promise<ScrapeResult> {
  // PB 훅 라우트는 runtime base 경유 — dev /__runtime, 발행 /site/<code>/__runtime
  const response = await fetch(`${getRuntimeBase()}${SCRAPE_ENDPOINT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const payload = (await response.json().catch(() => ({}))) as
    | ScrapeResult
    | { error?: string };
  if (!response.ok) {
    const message = "error" in payload && payload.error ? payload.error : `HTTP ${response.status}`;
    throw new Error(`사이트 수집에 실패했습니다: ${message}`);
  }
  return payload as ScrapeResult;
}

function detectLanguage(scrape: ScrapeResult, llmLanguage: string): string {
  const fromLlm = llmLanguage.trim().toLowerCase().slice(0, 2);
  if (fromLlm) return fromLlm;
  const fromHtml = scrape.lang.trim().toLowerCase().slice(0, 2);
  if (fromHtml) return fromHtml;
  const sample = scrape.bodyText.slice(0, 2000);
  const hangul = (sample.match(/[가-힣]/g) ?? []).length;
  return hangul > sample.length * 0.05 ? "ko" : "en";
}

export async function analyzeBrand(
  url: string,
  onProgress?: (stage: AnalyzeProgress) => void,
): Promise<BrandKitDraft> {
  onProgress?.("scraping");
  const scrape = await scrapeSite(url);

  onProgress?.("analyzing");
  const prompt = brandDnaPrompt({
    title: scrape.title,
    description: scrape.description,
    siteName: scrape.siteName,
    bodyText: scrape.bodyText,
    lang: scrape.lang,
  });

  let dna: DnaResponse;
  if (scrape.ogImageData) {
    // vision 은 best-effort — 모델이 이미지를 거부하면 텍스트만으로 재시도한다.
    try {
      dna = await completeJson<DnaResponse>({
        prompt,
        temperature: LLM_TEMPERATURE.brandDna,
        image: scrape.ogImageData,
        imageNote: BRAND_VISION_PROMPT,
      });
    } catch {
      dna = await completeJson<DnaResponse>({
        prompt,
        temperature: LLM_TEMPERATURE.brandDna,
      });
    }
  } else {
    dna = await completeJson<DnaResponse>({
      prompt,
      temperature: LLM_TEMPERATURE.brandDna,
    });
  }

  const palette = extractPalette(scrape.colorCandidates);
  const fonts = scrape.fontCandidates
    .map((f) => f.trim())
    .filter((f) => f && !/^(inherit|initial|sans-serif|serif|monospace|system-ui)$/i.test(f))
    .slice(0, 6);

  return {
    url: scrape.url,
    name: asString(dna.brand_name, scrape.siteName || scrape.title || url),
    industry: asString(dna.industry),
    tagline: asString(dna.tagline),
    valueProposition: asString(dna.value_proposition),
    toneOfVoice: asStringArray(dna.tone_of_voice),
    personality: asStringArray(dna.personality),
    targetAudience: asString(dna.target_audience),
    keyMessages: asStringArray(dna.key_messages),
    primaryColors: palette.primary,
    secondaryColors: palette.secondary,
    fonts,
    logoUrl: scrape.logoCandidates[0] ?? scrape.favicon ?? "",
    ogImageUrl: scrape.ogImage,
    images: (scrape.images ?? []).filter((src) => /^https?:\/\//i.test(src)).slice(0, 12),
    imageryStyle: asString(dna.imagery_style, "professional"),
    layoutStyle: asString(dna.layout_style, "modern"),
    language: detectLanguage(scrape, asString(dna.language)),
  };
}

// 캠페인·카피 프롬프트가 공유하는 브랜드 요약 블록
export function describeBrand(brand: {
  name: string;
  industry: string;
  tagline: string;
  valueProposition: string;
  targetAudience: string;
  toneOfVoice: string[];
  personality: string[];
  keyMessages: string[];
  primaryColors: string[];
  imageryStyle: string;
  layoutStyle: string;
}): string {
  const colors = brand.primaryColors
    .map((c) => normalizeHex(c))
    .filter(Boolean)
    .join(", ");
  return `브랜드
- 이름: ${brand.name || "—"}
- 업종: ${brand.industry || "—"}
- 태그라인: ${brand.tagline || "—"}
- 가치 제안: ${brand.valueProposition || "—"}
- 타깃 고객: ${brand.targetAudience || "—"}
- 목소리: ${brand.toneOfVoice.join(", ") || "—"}
- 개성: ${brand.personality.join(", ") || "—"}
- 핵심 메시지: ${brand.keyMessages.join(" • ") || "—"}
- 주요 색상: ${colors || "—"}
- 이미지 스타일: ${brand.imageryStyle || "—"}
- 레이아웃 스타일: ${brand.layoutStyle || "—"}`;
}

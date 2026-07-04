// ────────────────────────────────────────────────
// ★ 앱 커스터마이징 교체 지점 — 브랜딩·모델·템플릿 프리셋은 여기서만 바꾼다.
// ────────────────────────────────────────────────

export const APP_NAME = "Scribe";
export const APP_TAGLINE = "브라우저에서 끝나는 프라이빗 AI 회의록";

/**
 * 전사(Whisper) 모델 — 다국어. 서버 전송 없이 브라우저에서 실행된다.
 * WebGPU 와 WASM 은 검증된 export 가 다르다:
 * - WebGPU: onnx-community (fp32 인코더 + q4 디코더 하이브리드)
 * - WASM: Xenova (whisper-web 검증 q8) — onnx-community 는 q4 임베딩 그래프가
 *   ort-web 세션 생성에서 깨진다 (TransposeDQWeightsForMatMulNBits 오류 실측)
 */
export const ASR_MODEL_ID_WEBGPU = "onnx-community/whisper-base";
export const ASR_MODEL_ID_WASM = "Xenova/whisper-base";
/** 화자 분리 모델 — un-gated MIT 미러만 사용할 것 (원본 pyannote는 gated). */
export const DIARIZATION_MODEL_ID = "onnx-community/pyannote-segmentation-3.0";

/** 녹음 중 라이브 전사 윈도우(초) — 이만큼 쌓이면 한 번씩 전사한다 */
export const LIVE_WINDOW_SEC = 25;
/** 화자 분리를 시도할 최대 오디오 길이(초) — 초과 시 자동 생략 */
export const MAX_DIARIZE_SEC = 90 * 60;
/** 라이브 전사에서 표시할 최근 라인 수 */
export const LIVE_TAIL_LINES = 80;

/** 전사 언어 선택지 — code는 Whisper 언어 코드 */
export const LANGUAGES = [
  { code: "auto", label: "자동 감지" },
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

/** 회의록 출력 언어 */
export const OUTPUT_LANGUAGES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
] as const;

export type OutputLanguageCode = (typeof OUTPUT_LANGUAGES)[number]["code"];

const TRANSCRIPT_LANGUAGE_CODES = new Set<LanguageCode>(LANGUAGES.map((language) => language.code));
const OUTPUT_LANGUAGE_CODES = new Set<OutputLanguageCode>(OUTPUT_LANGUAGES.map((language) => language.code));

function getBrowserLanguages(): string[] {
  if (typeof navigator === "undefined") return [];
  if (navigator.languages?.length) return [...navigator.languages];
  return navigator.language ? [navigator.language] : [];
}

function normalizeLocale(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/_/g, "-").split("-")[0] ?? "";
}

/** 브라우저 선호 언어를 Whisper 전사 언어 기본값으로 변환한다. */
export function resolveBrowserTranscriptLanguage(languages: readonly string[] = getBrowserLanguages()): LanguageCode {
  for (const language of languages) {
    const code = normalizeLocale(language);
    if (code && code !== "auto" && TRANSCRIPT_LANGUAGE_CODES.has(code as LanguageCode)) {
      return code as LanguageCode;
    }
  }
  return "auto";
}

/** 브라우저 선호 언어를 회의록 출력 언어 기본값으로 변환한다. */
export function resolveBrowserOutputLanguage(languages: readonly string[] = getBrowserLanguages()): OutputLanguageCode {
  for (const language of languages) {
    const code = normalizeLocale(language);
    if (OUTPUT_LANGUAGE_CODES.has(code as OutputLanguageCode)) {
      return code as OutputLanguageCode;
    }
  }
  return "ko";
}

/** 회의 전사 언어가 출력 언어로도 지원되면 우선 사용하고, 아니면 브라우저 언어를 따른다. */
export function resolveMeetingOutputLanguage(
  meetingLanguage: string | undefined,
  languages: readonly string[] = getBrowserLanguages(),
): OutputLanguageCode {
  const code = normalizeLocale(meetingLanguage);
  if (OUTPUT_LANGUAGE_CODES.has(code as OutputLanguageCode)) return code as OutputLanguageCode;
  return resolveBrowserOutputLanguage(languages);
}

export interface TemplateSectionPreset {
  title: string;
  guidance: string;
}

export interface TemplatePreset {
  name: string;
  description: string;
  sections: TemplateSectionPreset[];
}

/**
 * 기본 회의록 템플릿 프리셋 — 첫 실행 시 mn_templates 에 시드된다.
 * 섹션 guidance 는 LLM 에게 그대로 전달되는 작성 지침이다.
 */
export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    name: "표준 회의록",
    description: "개요·논의·결정·액션아이템을 갖춘 범용 회의록",
    sections: [
      { title: "회의 개요", guidance: "회의 목적과 전체 흐름을 2~3문장으로 요약" },
      { title: "핵심 논의", guidance: "주제별 소제목(###)으로 나누고 주요 발언과 근거를 정리. 중요한 대목은 [mm:ss] 타임스탬프 인용" },
      { title: "결정 사항", guidance: "합의/결정된 항목을 목록으로. 각 항목에 결정 근거를 한 줄씩" },
      { title: "액션 아이템", guidance: "체크박스 목록(- [ ])으로. 가능하면 담당자와 기한을 **굵게** 표기" },
    ],
  },
  {
    name: "액션 중심",
    description: "실행 항목과 후속 조치에 집중한 짧은 회의록",
    sections: [
      { title: "결정 사항", guidance: "결정된 것만 간결한 목록으로" },
      { title: "액션 아이템", guidance: "체크박스 목록(- [ ]). 담당자·기한 필수 표기, 없으면 (미정)" },
      { title: "다음 회의까지", guidance: "다음 회의 전 확인·준비할 사항" },
    ],
  },
  {
    name: "1:1 미팅",
    description: "매니저-팀원 1:1 대화 기록",
    sections: [
      { title: "근황과 컨디션", guidance: "업무·개인 컨텍스트의 주요 변화" },
      { title: "주요 대화", guidance: "논의 주제별로 핵심 내용과 서로의 관점을 정리" },
      { title: "피드백", guidance: "주고받은 피드백을 방향별로 구분" },
      { title: "팔로업", guidance: "체크박스 목록(- [ ])으로 다음 1:1까지의 약속" },
    ],
  },
  {
    name: "데일리 스탠드업",
    description: "어제 한 일 · 오늘 할 일 · 블로커",
    sections: [
      { title: "진행 상황", guidance: "참석자별로 공유된 진행 상황을 정리" },
      { title: "오늘 계획", guidance: "오늘 진행하기로 한 항목" },
      { title: "블로커", guidance: "막힌 부분과 도움이 필요한 사항. 없으면 '없음'" },
    ],
  },
  {
    name: "인터뷰 노트",
    description: "사용자 인터뷰·리서치 세션 기록",
    sections: [
      { title: "세션 개요", guidance: "인터뷰 대상·목적·상황을 요약" },
      { title: "주요 발견", guidance: "인사이트별 소제목(###)으로. 근거가 된 발언을 인용문(>)과 [mm:ss] 타임스탬프로 첨부" },
      { title: "인상적인 발언", guidance: "원문 그대로 인용할 가치가 있는 발언 3~5개를 인용문으로" },
      { title: "다음 단계", guidance: "검증할 가설이나 후속 리서치 항목" },
    ],
  },
];

/** 대시보드 회의 카드 커버 팔레트 */
export const MEETING_COLORS = [
  "#14604b",
  "#a05c22",
  "#4b5aa7",
  "#9d4467",
  "#58701f",
  "#6b4fa1",
];

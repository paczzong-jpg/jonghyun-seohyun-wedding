import type { LucideIcon } from "lucide-react";

// ────────────────────────────────────────────────
// Deck configuration
// ────────────────────────────────────────────────

export type DeckThemeId =
  // 다크
  | "aurora"
  | "noir"
  | "cobalt"
  | "midnight"
  | "crimson"
  | "plum"
  | "ember"
  | "steel"
  | "moss"
  | "royal"
  | "terminal"
  // 라이트
  | "editorial"
  | "slate"
  | "verdant"
  | "porcelain"
  | "latte"
  | "ocean"
  | "blush"
  | "sunrise"
  | "pop"
  | "newsprint"
  | "lavender";

export type DeckConfig = {
  /** 브라우저 탭 · PPTX 파일명에 사용 */
  title: string;
  /** 모든 슬라이드 하단 푸터 좌측 텍스트 (빈 문자열이면 숨김) */
  footer: string;
  /** 페이지 번호 표시 여부 */
  pageNumbers: boolean;
  /** 덱 전체 테마 */
  theme: DeckThemeId;
};

// ────────────────────────────────────────────────
// Shared slide fields
// ────────────────────────────────────────────────

/** 슬라이드 배경 변형 — 테마 토큰 안에서만 동작 */
export type SlideBackground = "default" | "soft" | "invert";

type SlideBase = {
  /** 발표자 노트 — PPTX 노트로도 내보내짐 */
  notes?: string;
  background?: SlideBackground;
};

// ────────────────────────────────────────────────
// Layout specs (sparse → dense)
// ────────────────────────────────────────────────

/** 표지 — 큰 타이틀, 발표자/날짜 */
export type TitleSlide = SlideBase & {
  layout: "title";
  kicker?: string;
  title: string;
  subtitle?: string;
  presenter?: string;
  date?: string;
};

/** 목차 — 번호 매긴 아젠다 */
export type AgendaSlide = SlideBase & {
  layout: "agenda";
  title: string;
  items: { label: string; note?: string }[];
};

/** 섹션 구분 — 큰 번호 + 섹션명 */
export type SectionSlide = SlideBase & {
  layout: "section";
  index: string; // "01"
  title: string;
  subtitle?: string;
};

/** 한 문장 강조 — 가장 sparse */
export type StatementSlide = SlideBase & {
  layout: "statement";
  text: string;
  /** text 안에서 강조 처리할 부분 문자열 (accent 색) */
  highlight?: string;
  attribution?: string;
};

/** 인용 — 발화자 정보 포함 */
export type QuoteSlide = SlideBase & {
  layout: "quote";
  quote: string;
  name: string;
  role?: string;
};

/** 제목 + 불릿 — 기본 콘텐츠 슬라이드 */
export type BulletsSlide = SlideBase & {
  layout: "bullets";
  kicker?: string;
  title: string;
  bullets: { title: string; desc?: string; icon?: LucideIcon }[];
  /** 불릿 배치 열 수 (기본 1) */
  columns?: 1 | 2;
};

/** 텍스트 + 이미지 분할 */
export type TextImageSlide = SlideBase & {
  layout: "text-image";
  kicker?: string;
  title: string;
  body?: string[];
  bullets?: string[];
  image: SlideImage;
  imageSide: "left" | "right";
};

/** 풀블리드 미디어 + 오버레이 캡션 */
export type MediaSlide = SlideBase & {
  layout: "media";
  image: SlideImage;
  title?: string;
  caption?: string;
};

/** KPI 지표 그리드 */
export type MetricsSlide = SlideBase & {
  layout: "metrics";
  kicker?: string;
  title: string;
  items: {
    value: string;
    label: string;
    delta?: string;
    trend?: "up" | "down" | "flat";
  }[];
};

/** 카드 그리드 — 기능/가치 소개 */
export type CardsSlide = SlideBase & {
  layout: "cards";
  kicker?: string;
  title: string;
  cards: { icon?: LucideIcon; title: string; desc: string; tag?: string }[];
};

/** 수평 타임라인/로드맵 */
export type TimelineSlide = SlideBase & {
  layout: "timeline";
  kicker?: string;
  title: string;
  steps: {
    label: string; // "1분기"
    title: string;
    desc?: string;
    status?: "done" | "now" | "next";
  }[];
};

/** 컬럼 비교 — 요금제/옵션/AS-IS·TO-BE */
export type CompareSlide = SlideBase & {
  layout: "compare";
  kicker?: string;
  title: string;
  columns: {
    title: string;
    tag?: string;
    points: string[];
    highlight?: boolean;
  }[];
};

/** 데이터 테이블 — dense */
export type TableSlide = SlideBase & {
  layout: "table";
  kicker?: string;
  title: string;
  columns: string[];
  rows: string[][];
  /** 강조할 데이터 컬럼 인덱스 */
  emphasisCol?: number;
};

export type ChartKind = "bar" | "line" | "area" | "donut";

/** 차트 + 요점 — HTML은 recharts, PPTX는 네이티브 차트로 내보냄 */
export type ChartSlide = SlideBase & {
  layout: "chart";
  kicker?: string;
  title: string;
  chart: {
    kind: ChartKind;
    /** 카테고리 라벨 (x축 또는 도넛 조각 이름) */
    labels: string[];
    series: { name: string; data: number[] }[];
    /** 값 표기 접미사 — "%", "억" 등 */
    unit?: string;
  };
  takeaways?: string[];
};

/** 이미지 갤러리 그리드 */
export type GallerySlide = SlideBase & {
  layout: "gallery";
  kicker?: string;
  title: string;
  images: SlideImage[];
};

/** 팀/인물 소개 그리드 */
export type TeamSlide = SlideBase & {
  layout: "team";
  kicker?: string;
  title: string;
  people: { name: string; role: string; photo?: string }[];
};

/** 마무리 — 감사 인사 + 연락처/CTA */
export type EndSlide = SlideBase & {
  layout: "end";
  title: string;
  message?: string;
  contact?: { label: string; value: string }[];
};

// ────────────────────────────────────────────────
// Common value objects
// ────────────────────────────────────────────────

export type SlideImage = {
  /** 이미지 URL (PocketBase 파일 URL, /public 자산, 외부 URL). 비우면 테마 추상 플레이스홀더가 그려짐 */
  src?: string;
  alt: string;
  caption?: string;
};

export type SlideSpec =
  | TitleSlide
  | AgendaSlide
  | SectionSlide
  | StatementSlide
  | QuoteSlide
  | BulletsSlide
  | TextImageSlide
  | MediaSlide
  | MetricsSlide
  | CardsSlide
  | TimelineSlide
  | CompareSlide
  | TableSlide
  | ChartSlide
  | GallerySlide
  | TeamSlide
  | EndSlide;

export type SlideLayout = SlideSpec["layout"];

// ────────────────────────────────────────────────
// Canvas constants — HTML 렌더와 PPTX 좌표계의 SSOT
// 1280×720px = 13.333×7.5in(96dpi) 16:9
// ────────────────────────────────────────────────

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

import type { CSSProperties } from "react";

import type { DeckThemeId } from "./types";

// ────────────────────────────────────────────────
// Theme = HTML 렌더(CSS 변수)와 PPTX 내보내기(hex)의 단일 소스.
// 색상은 반드시 #RRGGBB hex — pptxgenjs가 hex만 받는다.
// 새 테마 = 여기 항목 추가 + types.ts 의 DeckThemeId 유니온에 id 추가.
// ────────────────────────────────────────────────

export type DeckTheme = {
  id: DeckThemeId;
  name: string;
  mode: "light" | "dark";
  /** 기본 배경 */
  bg: string;
  /** 카드/패널 표면 */
  surface: string;
  /** 본문 텍스트 */
  ink: string;
  /** 보조 텍스트 */
  muted: string;
  /** 주 강조색 */
  accent: string;
  /** 보조 강조색 — 그라데이션·차트 페어 */
  accent2: string;
  /** 구분선 */
  line: string;
  /** 차트 시리즈 팔레트 */
  chart: string[];
  /** CSS 폰트 스택 */
  fontDisplay: string;
  fontBody: string;
  /** PPTX fontFace 이름 (설치되어 있으면 그대로, 없으면 PowerPoint가 대체) */
  pptxFontDisplay: string;
  pptxFontBody: string;
  /** 표면 라운딩(px) */
  radius: number;
};

const PRETENDARD =
  '"Pretendard Variable", Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';
const SERIF_KR =
  '"Noto Serif KR", "Nanum Myeongjo", Georgia, "Times New Roman", serif';

const SANS = {
  fontDisplay: PRETENDARD,
  fontBody: PRETENDARD,
  pptxFontDisplay: "Pretendard",
  pptxFontBody: "Pretendard",
};
const SERIF_DISPLAY = {
  fontDisplay: SERIF_KR,
  fontBody: PRETENDARD,
  pptxFontDisplay: "Noto Serif KR",
  pptxFontBody: "Pretendard",
};

export const DECK_THEMES: Record<DeckThemeId, DeckTheme> = {
  // ── 다크 ──────────────────────────────────

  /** 딥 네이비 + 바이올렛·민트 — 테크 키노트 */
  aurora: {
    id: "aurora",
    name: "Aurora",
    mode: "dark",
    bg: "#0A0E1F",
    surface: "#141A36",
    ink: "#F1F4FF",
    muted: "#8E96BD",
    accent: "#8B7CFF",
    accent2: "#41E0C0",
    line: "#252E56",
    chart: ["#8B7CFF", "#41E0C0", "#5EA2FF", "#F2A0FF", "#FFD166"],
    ...SANS,
    radius: 20,
  },
  /** 블랙·화이트 하이콘트라스트 + 애시드 옐로 — 볼드 미니멀 */
  noir: {
    id: "noir",
    name: "Noir",
    mode: "dark",
    bg: "#0B0B0C",
    surface: "#18181A",
    ink: "#F7F7F5",
    muted: "#8F8F94",
    accent: "#D8F04A",
    accent2: "#F7F7F5",
    line: "#2B2B2F",
    chart: ["#D8F04A", "#F7F7F5", "#9BA0FF", "#FF7A6B", "#57C7A8"],
    ...SANS,
    radius: 2,
  },
  /** 새터레이티드 코발트 — 대담한 원컬러 키노트 */
  cobalt: {
    id: "cobalt",
    name: "Cobalt",
    mode: "dark",
    bg: "#1A2AB8",
    surface: "#2A3BCC",
    ink: "#FFFFFF",
    muted: "#AAB4F5",
    accent: "#8FE0FF",
    accent2: "#FFD84D",
    line: "#3D4DDA",
    chart: ["#8FE0FF", "#FFD84D", "#FF9EDB", "#B7C0FF", "#7CF2C5"],
    ...SANS,
    radius: 16,
  },
  /** 청흑 + 일렉트릭 시안 — 나이트 오퍼레이션 */
  midnight: {
    id: "midnight",
    name: "Midnight",
    mode: "dark",
    bg: "#0E1B2C",
    surface: "#16283F",
    ink: "#EAF2FC",
    muted: "#7E93AE",
    accent: "#37C8FF",
    accent2: "#4C7DF0",
    line: "#23385A",
    chart: ["#37C8FF", "#4C7DF0", "#7CF2C5", "#F2A0FF", "#FFD166"],
    ...SANS,
    radius: 12,
  },
  /** 니어블랙 + 크림슨 — 시네마틱 임팩트 */
  crimson: {
    id: "crimson",
    name: "Crimson",
    mode: "dark",
    bg: "#0D0B0C",
    surface: "#1A1416",
    ink: "#F7F2F2",
    muted: "#9A8B8E",
    accent: "#E50914",
    accent2: "#FF6B5E",
    line: "#2D2326",
    chart: ["#E50914", "#FF6B5E", "#F2C4C0", "#8E8E93", "#FFD166"],
    ...SANS,
    radius: 8,
  },
  /** 딥 퍼플 + 오키드 — 몽환적 프로덕트 */
  plum: {
    id: "plum",
    name: "Plum",
    mode: "dark",
    bg: "#221430",
    surface: "#32204A",
    ink: "#F6EFFC",
    muted: "#A791C2",
    accent: "#C77DFF",
    accent2: "#FF9EDB",
    line: "#43305F",
    chart: ["#C77DFF", "#FF9EDB", "#7CB8FF", "#FFD166", "#7CF2C5"],
    ...SANS,
    radius: 18,
  },
  /** 웜 차콜 + 엠버 오렌지 — 열기 있는 스토리텔링 */
  ember: {
    id: "ember",
    name: "Ember",
    mode: "dark",
    bg: "#16110D",
    surface: "#241B14",
    ink: "#FAF3EC",
    muted: "#A08D7C",
    accent: "#FF7A29",
    accent2: "#FFB454",
    line: "#38291D",
    chart: ["#FF7A29", "#FFB454", "#D9A05B", "#8A9A5B", "#5B8A9A"],
    ...SANS,
    radius: 12,
  },
  /** 그래파이트 + 스틸 블루 — 시크한 다크 코퍼레이트 */
  steel: {
    id: "steel",
    name: "Steel",
    mode: "dark",
    bg: "#1B1F24",
    surface: "#262C33",
    ink: "#ECEFF3",
    muted: "#8C97A5",
    accent: "#5B9DFF",
    accent2: "#62D9C6",
    line: "#333B45",
    chart: ["#5B9DFF", "#62D9C6", "#B0BAC8", "#F2C14E", "#E36C6C"],
    ...SANS,
    radius: 10,
  },
  /** 딥 파인 + 라임 세이지 — 다크 내추럴 */
  moss: {
    id: "moss",
    name: "Moss",
    mode: "dark",
    bg: "#101B14",
    surface: "#1A2A20",
    ink: "#EEF6EF",
    muted: "#86A18E",
    accent: "#7BC96F",
    accent2: "#C9E265",
    line: "#27402F",
    chart: ["#7BC96F", "#C9E265", "#3E8E9E", "#E3B341", "#B48EAD"],
    ...SANS,
    radius: 12,
  },
  /** 잉크 바이올렛 + 골드 + 명조 — 럭스 프리미엄 */
  royal: {
    id: "royal",
    name: "Royal",
    mode: "dark",
    bg: "#14101E",
    surface: "#201A30",
    ink: "#F5F1E8",
    muted: "#A79DB8",
    accent: "#D4AF37",
    accent2: "#9F8FD0",
    line: "#2E2744",
    chart: ["#D4AF37", "#9F8FD0", "#B76E79", "#6E93B5", "#7FA663"],
    ...SERIF_DISPLAY,
    radius: 4,
  },
  /** 깃허브 다크 + 터미널 그린 — 개발자 브리핑 */
  terminal: {
    id: "terminal",
    name: "Terminal",
    mode: "dark",
    bg: "#0D1117",
    surface: "#161B22",
    ink: "#E6EDF3",
    muted: "#7D8590",
    accent: "#3FB950",
    accent2: "#58A6FF",
    line: "#21262D",
    chart: ["#3FB950", "#58A6FF", "#D29922", "#F778BA", "#8B949E"],
    ...SANS,
    radius: 8,
  },

  // ── 라이트 ────────────────────────────────

  /** 따뜻한 종이 질감 + 명조 헤드라인 + 버밀리언 — 매거진 */
  editorial: {
    id: "editorial",
    name: "Editorial",
    mode: "light",
    bg: "#FAF6ED",
    surface: "#FFFDF6",
    ink: "#201B12",
    muted: "#71685A",
    accent: "#BC3F22",
    accent2: "#31584D",
    line: "#E4DBC8",
    chart: ["#BC3F22", "#31584D", "#C99A2E", "#5B7A99", "#8A6FA8"],
    ...SERIF_DISPLAY,
    radius: 6,
  },
  /** 화이트 + 네이비·블루 — 클린 코퍼레이트 */
  slate: {
    id: "slate",
    name: "Slate",
    mode: "light",
    bg: "#F6F8FB",
    surface: "#FFFFFF",
    ink: "#0E1A2F",
    muted: "#5C6B84",
    accent: "#1D5BD6",
    accent2: "#0FA3B1",
    line: "#DEE5EF",
    chart: ["#1D5BD6", "#0FA3B1", "#6C8CD5", "#94A8C8", "#E3B341"],
    ...SANS,
    radius: 14,
  },
  /** 세이지 그린 + 딥 포레스트 — 차분한 내추럴 */
  verdant: {
    id: "verdant",
    name: "Verdant",
    mode: "light",
    bg: "#F3F6F0",
    surface: "#FFFFFF",
    ink: "#182420",
    muted: "#5E7166",
    accent: "#256E4A",
    accent2: "#7FA663",
    line: "#DCE5D9",
    chart: ["#256E4A", "#7FA663", "#3E8E9E", "#C9A227", "#8A6FA8"],
    ...SANS,
    radius: 16,
  },
  /** 웜 그레이 화이트 — 애플식 절제 미니멀 */
  porcelain: {
    id: "porcelain",
    name: "Porcelain",
    mode: "light",
    bg: "#F5F5F7",
    surface: "#FFFFFF",
    ink: "#1D1D1F",
    muted: "#6E6E73",
    accent: "#0071E3",
    accent2: "#30B0C7",
    line: "#E3E3E8",
    chart: ["#0071E3", "#30B0C7", "#8E8EF0", "#AF52DE", "#FF9F0A"],
    ...SANS,
    radius: 18,
  },
  /** 크림 + 에스프레소·카라멜 + 명조 — 카페 웜톤 */
  latte: {
    id: "latte",
    name: "Latte",
    mode: "light",
    bg: "#F4EDE3",
    surface: "#FDF8F1",
    ink: "#3B2E25",
    muted: "#8A7767",
    accent: "#A9662C",
    accent2: "#5F7A61",
    line: "#E2D5C4",
    chart: ["#A9662C", "#5F7A61", "#C99A2E", "#7E5A3C", "#4C6A92"],
    ...SERIF_DISPLAY,
    radius: 10,
  },
  /** 페일 블루 + 딥 틸 — 시원한 클린 */
  ocean: {
    id: "ocean",
    name: "Ocean",
    mode: "light",
    bg: "#F0F6F8",
    surface: "#FFFFFF",
    ink: "#0F2B33",
    muted: "#55707A",
    accent: "#0E7490",
    accent2: "#38BDF8",
    line: "#D8E6EB",
    chart: ["#0E7490", "#38BDF8", "#2DD4BF", "#F59E0B", "#8B5CF6"],
    ...SANS,
    radius: 14,
  },
  /** 웜 핑크 크림 + 로즈 — 소프트 브랜드 */
  blush: {
    id: "blush",
    name: "Blush",
    mode: "light",
    bg: "#FBF2F2",
    surface: "#FFFCFC",
    ink: "#33202A",
    muted: "#93707F",
    accent: "#D6336C",
    accent2: "#F783AC",
    line: "#F0DCDF",
    chart: ["#D6336C", "#F783AC", "#9775FA", "#4DABF7", "#FFA94D"],
    ...SANS,
    radius: 20,
  },
  /** 아이보리 + 코랄·앰버 — 에너제틱 스타트업 */
  sunrise: {
    id: "sunrise",
    name: "Sunrise",
    mode: "light",
    bg: "#FFF9F0",
    surface: "#FFFFFF",
    ink: "#2B2115",
    muted: "#8B7A64",
    accent: "#FF6B4A",
    accent2: "#FFB020",
    line: "#F2E5D2",
    chart: ["#FF6B4A", "#FFB020", "#2FA39A", "#7C6CF0", "#E05797"],
    ...SANS,
    radius: 16,
  },
  /** 화이트 + 비비드 마젠타·시안 — 플레이풀 이벤트 */
  pop: {
    id: "pop",
    name: "Pop",
    mode: "light",
    bg: "#FFFFFF",
    surface: "#FAFAFF",
    ink: "#17171F",
    muted: "#6B6B7A",
    accent: "#FF2E88",
    accent2: "#00C2FF",
    line: "#E8E8F0",
    chart: ["#FF2E88", "#00C2FF", "#FFC700", "#7C4DFF", "#00D084"],
    ...SANS,
    radius: 24,
  },
  /** 오프화이트 + 블랙 + 레드 포인트 — 스위스 타이포그래피 */
  newsprint: {
    id: "newsprint",
    name: "Newsprint",
    mode: "light",
    bg: "#FAFAF7",
    surface: "#FFFFFF",
    ink: "#111110",
    muted: "#5C5C57",
    accent: "#D6001C",
    accent2: "#111110",
    line: "#E0E0DA",
    chart: ["#D6001C", "#111110", "#7A7A72", "#3B6EA5", "#C99A2E"],
    ...SANS,
    radius: 0,
  },
  /** 소프트 라벤더 + 딥 바이올렛 — 차분한 파스텔 */
  lavender: {
    id: "lavender",
    name: "Lavender",
    mode: "light",
    bg: "#F4F1FB",
    surface: "#FDFCFF",
    ink: "#2A2438",
    muted: "#776F8E",
    accent: "#6D5AE6",
    accent2: "#A78BFA",
    line: "#E3DDF2",
    chart: ["#6D5AE6", "#A78BFA", "#F783AC", "#38BDF8", "#FFB020"],
    ...SANS,
    radius: 18,
  },
};

// ────────────────────────────────────────────────
// Color helpers — CSS 변수와 PPTX가 같은 결과를 쓰도록 hex 기반 계산
// ────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** a 위에 b를 t(0~1)만큼 얹은 불투명 혼합색 — soft 배경·표면 틴트 계산용 */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/** CSS 전용 알파 색상 */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 배경 변형별 실제 배경색 (PPTX에서도 동일 값 사용) */
export function slideBgColor(
  theme: DeckTheme,
  background: "default" | "soft" | "invert" | undefined,
): string {
  if (background === "soft") return mixHex(theme.bg, theme.accent, 0.06);
  if (background === "invert")
    return theme.mode === "dark" ? mixHex(theme.bg, theme.accent, 0.24) : theme.ink;
  return theme.bg;
}

/** invert 배경에서의 텍스트 색 */
export function slideInkColor(
  theme: DeckTheme,
  background: "default" | "soft" | "invert" | undefined,
): string {
  if (background === "invert") return theme.mode === "dark" ? theme.ink : theme.bg;
  return theme.ink;
}

/** 배경 변형이 적용된 슬라이드의 보조 텍스트 색 — HTML/PPTX 공용 */
export function slideMutedColor(
  theme: DeckTheme,
  background: "default" | "soft" | "invert" | undefined,
): string {
  if (background === "invert")
    return mixHex(slideBgColor(theme, background), slideInkColor(theme, background), 0.62);
  return theme.muted;
}

/** 배경 변형이 적용된 슬라이드의 구분선 색 — HTML/PPTX 공용 */
export function slideLineColor(
  theme: DeckTheme,
  background: "default" | "soft" | "invert" | undefined,
): string {
  if (background === "invert")
    return mixHex(slideBgColor(theme, background), slideInkColor(theme, background), 0.22);
  return theme.line;
}

/** 테마를 CSS 커스텀 프로퍼티로 변환 — 덱 캔버스 루트에 주입 */
export function themeCssVars(theme: DeckTheme): CSSProperties {
  return {
    "--deck-bg": theme.bg,
    "--deck-surface": theme.surface,
    "--deck-ink": theme.ink,
    "--deck-muted": theme.muted,
    "--deck-accent": theme.accent,
    "--deck-accent-2": theme.accent2,
    "--deck-line": theme.line,
    "--deck-accent-soft": withAlpha(theme.accent, theme.mode === "dark" ? 0.16 : 0.1),
    "--deck-accent2-soft": withAlpha(theme.accent2, theme.mode === "dark" ? 0.14 : 0.1),
    "--deck-surface-soft": mixHex(theme.bg, theme.surface, 0.55),
    "--deck-font-display": theme.fontDisplay,
    "--deck-font-body": theme.fontBody,
    "--deck-radius": `${theme.radius}px`,
  } as CSSProperties;
}

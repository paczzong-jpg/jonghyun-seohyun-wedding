import type { BrandKit } from "./types";

// 색 유틸 + 크리에이티브 팔레트 해석.
// 브랜드 hex 를 그대로 쓰되, 잉크(텍스트) 색은 항상 대비 기준으로 자동 선택해
// 어떤 브랜드 색 조합에서도 읽히는 크리에이티브를 보장한다.

export function normalizeHex(input: string): string | null {
  const v = input.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) {
    return (
      "#" +
      v
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
    );
  }
  const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return null;
  const toHex = (n: number) => Math.min(255, n).toString(16).padStart(2, "0");
  return "#" + toHex(+m[1]) + toHex(+m[2]) + toHex(+m[3]);
}

function channels(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function toHexColor(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")
  );
}

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function mix(hexA: string, hexB: string, ratio: number): string {
  const a = channels(hexA);
  const b = channels(hexB);
  return toHexColor(
    a[0] + (b[0] - a[0]) * ratio,
    a[1] + (b[1] - a[1]) * ratio,
    a[2] + (b[2] - a[2]) * ratio,
  );
}

export const darken = (hex: string, amount: number) => mix(hex, "#000000", amount);
export const lighten = (hex: string, amount: number) => mix(hex, "#ffffff", amount);

// 배경 위에서 확실히 읽히는 잉크 색 (기본은 니어블랙/니어화이트)
export function readableInk(bg: string): string {
  return contrastRatio(bg, "#16161a") >= contrastRatio(bg, "#fbfbf9")
    ? "#16161a"
    : "#fbfbf9";
}

// 후보 중 배경과의 대비가 기준 이상인 첫 색, 없으면 readableInk 폴백
function pickAccent(bg: string, candidates: string[], minRatio = 2.6): string {
  for (const c of candidates) {
    if (contrastRatio(bg, c) >= minRatio) return c;
  }
  return readableInk(bg);
}

function isNearGrey(hex: string): boolean {
  const [r, g, b] = channels(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 16;
}

// 스크레이프 색 후보(빈도 포함)에서 브랜드 팔레트를 뽑는다.
// 화이트/블랙 계열·근접 회색은 배경/본문색일 확률이 높아 제외한다.
export function extractPalette(candidates: { value: string; count: number }[]): {
  primary: string[];
  secondary: string[];
} {
  const counts = new Map<string, number>();
  for (const { value, count } of candidates) {
    const hex = normalizeHex(value);
    if (!hex) continue;
    const lum = luminance(hex);
    if (lum > 0.92 || lum < 0.015) continue;
    if (isNearGrey(hex) && (lum > 0.75 || lum < 0.06)) continue;
    counts.set(hex, (counts.get(hex) ?? 0) + Math.max(1, count));
  }
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);
  return { primary: sorted.slice(0, 3), secondary: sorted.slice(3, 8) };
}

// 캔버스가 소비하는 해석된 팔레트 — 아키타입은 이 5가지 역할 색만 사용한다.
export type CreativePalette = {
  bg: string; // 주 배경
  bgDeep: string; // 그라디언트 끝/보조 패널
  ink: string; // 본문 잉크 (bg 대비 보장)
  accent: string; // 강조 (bg 대비 보장)
  accentInk: string; // accent 위 잉크 (accent 대비 보장)
  paper: string; // 카드/캡슐 표면
  paperInk: string;
};

const FALLBACK_BRAND = "#5b5bd6";

function brandColors(brand: BrandKit): string[] {
  const all = [...brand.primaryColors, ...brand.secondaryColors]
    .map(normalizeHex)
    .filter((c): c is string => Boolean(c));
  return all.length > 0 ? [...new Set(all)] : [FALLBACK_BRAND];
}

function buildVariant(base: string, pool: string[], mode: number): CreativePalette {
  if (mode === 1) {
    // 페이퍼 배경 × 브랜드 잉크
    const bg = "#faf9f6";
    const accent = pickAccent(bg, [base, ...pool], 3);
    return {
      bg,
      bgDeep: mix(bg, base, 0.12),
      ink: "#1d1c1a",
      accent,
      accentInk: readableInk(accent),
      paper: "#ffffff",
      paperInk: "#1d1c1a",
    };
  }
  if (mode === 2) {
    // 딥 다크 배경 × 브랜드 액센트
    const bg = mix("#111114", base, 0.14);
    const accent = pickAccent(bg, [lighten(base, 0.25), base, ...pool], 3);
    return {
      bg,
      bgDeep: darken(bg, 0.4),
      ink: "#f5f4f1",
      accent,
      accentInk: readableInk(accent),
      paper: mix(bg, "#ffffff", 0.08),
      paperInk: "#f5f4f1",
    };
  }
  // 브랜드 색 배경 (기본)
  const bg = base;
  const ink = readableInk(bg);
  const accent = pickAccent(bg, [...pool.filter((c) => c !== base), lighten(base, 0.55), darken(base, 0.45)]);
  return {
    bg,
    bgDeep: darken(base, 0.35),
    ink,
    accent,
    accentInk: readableInk(accent),
    paper: ink === "#fbfbf9" ? lighten(base, 0.85) : darken(base, 0.78),
    paperInk: ink === "#fbfbf9" ? "#1d1c1a" : "#f5f4f1",
  };
}

// paletteIndex 회전: 브랜드색 배경 → 페이퍼 → 다크 → (다음 브랜드색 배경 …)
export function resolvePalette(brand: BrandKit, paletteIndex: number): CreativePalette {
  const pool = brandColors(brand);
  const mode = ((paletteIndex % 3) + 3) % 3;
  const base = pool[Math.floor(paletteIndex / 3) % pool.length];
  return buildVariant(base, pool, mode);
}

export const PALETTE_VARIANT_COUNT = 3;

export function paletteVariantCount(brand: BrandKit): number {
  return brandColors(brand).length * PALETTE_VARIANT_COUNT;
}

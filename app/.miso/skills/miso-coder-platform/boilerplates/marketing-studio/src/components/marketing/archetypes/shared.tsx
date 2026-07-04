import { useState } from "react";
import { proxiedImageUrl } from "@/lib/marketing/media";
import type { CreativePalette } from "@/lib/marketing/palette";
import type { PlatformSpec } from "@/lib/marketing/platforms";
import type { BrandKit } from "@/lib/marketing/types";

// 아키타입 공통 계약과 프리미티브.
// 모든 크기는 unit(=min(w,h)/100) 기반 px — 반응형 단위 금지 (PNG 내보내기와 1:1).

export type ArchetypeProps = {
  brand: BrandKit;
  platform: PlatformSpec;
  palette: CreativePalette;
  headline: string;
  body: string;
  cta: string;
  showLogo: boolean;
  bgImageUrl: string;
  textScale: number;
  paletteIndex: number;
  unit: number;
};

export function fontStack(brand: BrandKit): string {
  const brandFonts = brand.fonts.map((f) => (f.includes(" ") ? `"${f}"` : f));
  return [...brandFonts, '"Pretendard"', '"Apple SD Gothic Neo"', "system-ui", "sans-serif"].join(
    ", ",
  );
}

// 긴 카피가 캔버스를 뚫지 않도록 글자수 기준으로 폰트를 완만히 줄인다
export function fitFontSize(base: number, text: string, comfortable: number): number {
  if (text.length <= comfortable) return base;
  const ratio = Math.max(0.55, Math.sqrt(comfortable / text.length));
  return Math.round(base * ratio);
}

export const textBase = {
  margin: 0,
  wordBreak: "keep-all" as const,
  overflowWrap: "break-word" as const,
};

// 로고 이미지(프록시 경유) — 실패하면 브랜드명 워드마크로 폴백
export function BrandMark(props: {
  brand: BrandKit;
  palette: CreativePalette;
  unit: number;
  ink?: string;
}) {
  const { brand, palette, unit } = props;
  const ink = props.ink ?? palette.ink;
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(brand.logoUrl) && !broken;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: unit * 1.6,
        minHeight: unit * 4.5,
      }}
    >
      {showImage ? (
        <img
          src={proxiedImageUrl(brand.logoUrl)}
          alt={brand.name}
          onError={() => setBroken(true)}
          style={{
            height: unit * 4.5,
            maxWidth: unit * 26,
            objectFit: "contain",
            display: "block",
          }}
        />
      ) : (
        <>
          <span
            style={{
              width: unit * 2.4,
              height: unit * 2.4,
              borderRadius: "50%",
              background: palette.accent,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              ...textBase,
              fontSize: unit * 2.6,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: ink,
            }}
          >
            {brand.name}
          </span>
        </>
      )}
    </div>
  );
}

export function CtaPill(props: {
  cta: string;
  palette: CreativePalette;
  unit: number;
  scale?: number;
  variant?: "solid" | "outline";
}) {
  const { cta, palette, unit } = props;
  const scale = props.scale ?? 1;
  if (!cta) return null;
  const outline = props.variant === "outline";
  return (
    <span
      style={{
        ...textBase,
        display: "inline-block",
        padding: `${unit * 1.5 * scale}px ${unit * 3.6 * scale}px`,
        borderRadius: unit * 10,
        fontSize: unit * 2.7 * scale,
        fontWeight: 700,
        letterSpacing: "0.01em",
        background: outline ? "transparent" : palette.accent,
        color: outline ? palette.ink : palette.accentInk,
        border: outline ? `${Math.max(2, unit * 0.35)}px solid ${palette.ink}` : "none",
        whiteSpace: "nowrap",
      }}
    >
      {cta}
    </span>
  );
}

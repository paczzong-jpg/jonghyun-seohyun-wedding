import { BrandMark, CtaPill, fitFontSize, fontStack, textBase, type ArchetypeProps } from "./shared";

// gradient — 브랜드 색 대각 그라디언트 + 좌하단 텍스트 스택 (키노트 히어로 무드)

export function GradientHero(props: ArchetypeProps) {
  const { brand, platform, palette, headline, body, cta, showLogo, textScale, unit } = props;
  const wide = platform.width / platform.height >= 2;
  const boost = wide ? 1.4 : 1;
  const pad = unit * 8;
  const headlineSize = fitFontSize(unit * 8.2 * boost * textScale, headline, 18);

  return (
    <div
      style={{
        width: platform.width,
        height: platform.height,
        fontFamily: fontStack(brand),
        background: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.bgDeep} 100%)`,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: pad,
        paddingBottom: pad + platform.height * platform.safeBottom,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -platform.height * 0.25,
          right: -platform.width * 0.12,
          width: Math.max(platform.width, platform.height) * 0.55,
          height: Math.max(platform.width, platform.height) * 0.55,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${palette.accent}40 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -unit * 6,
          left: -unit * 6,
          width: unit * 34,
          height: unit * 34,
          borderRadius: "50%",
          border: `${Math.max(2, unit * 0.4)}px solid ${palette.accent}2e`,
        }}
      />

      <div style={{ position: "relative" }}>
        {showLogo ? <BrandMark brand={brand} palette={palette} unit={unit} /> : null}
      </div>

      <div style={{ position: "relative", maxWidth: wide ? "62%" : "88%" }}>
        {brand.tagline ? (
          <p
            style={{
              ...textBase,
              fontSize: unit * 2.5 * textScale,
              fontWeight: 600,
              letterSpacing: "0.12em",
              color: palette.accent,
              textTransform: "uppercase",
              marginBottom: unit * 2.4,
            }}
          >
            {brand.tagline}
          </p>
        ) : null}
        <h1
          style={{
            ...textBase,
            fontSize: headlineSize,
            fontWeight: 800,
            lineHeight: 1.14,
            color: palette.ink,
            marginBottom: body ? unit * 3 : unit * 4,
          }}
        >
          {headline}
        </h1>
        {body ? (
          <p
            style={{
              ...textBase,
              fontSize: unit * 3 * boost * 0.9 * textScale,
              lineHeight: 1.5,
              color: palette.ink,
              opacity: 0.82,
              marginBottom: unit * 4,
              maxWidth: "92%",
            }}
          >
            {body}
          </p>
        ) : (
          <div style={{ height: unit * 1.5 }} />
        )}
        <CtaPill cta={cta} palette={palette} unit={unit} scale={boost * textScale} />
      </div>
    </div>
  );
}

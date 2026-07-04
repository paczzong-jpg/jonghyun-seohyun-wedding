import { BrandMark, CtaPill, fitFontSize, fontStack, textBase, type ArchetypeProps } from "./shared";

// outline — 대형 아웃라인 헤드라인의 타이포그래피 중심 구도. 볼드한 선언형 메시지용.

export function OutlineTypo(props: ArchetypeProps) {
  const { brand, platform, palette, headline, body, cta, showLogo, textScale, unit } = props;
  const wide = platform.width / platform.height >= 2;
  const boost = wide ? 1.35 : 1;
  const pad = unit * 8;
  const headlineSize = fitFontSize(unit * 11 * boost * textScale, headline, 14);
  const strokeWidth = Math.max(2, headlineSize * 0.032);

  return (
    <div
      style={{
        width: platform.width,
        height: platform.height,
        fontFamily: fontStack(brand),
        background: palette.bg,
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
          top: 0,
          left: 0,
          width: "100%",
          height: Math.max(4, unit * 1),
          background: palette.accent,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {showLogo ? <BrandMark brand={brand} palette={palette} unit={unit} /> : <div />}
        <span
          style={{
            ...textBase,
            fontSize: unit * 2.1,
            fontWeight: 600,
            letterSpacing: "0.14em",
            color: palette.ink,
            opacity: 0.55,
            textTransform: "uppercase",
          }}
        >
          {brand.industry}
        </span>
      </div>

      <div style={{ position: "relative" }}>
        <h1
          style={{
            ...textBase,
            fontSize: headlineSize,
            fontWeight: 900,
            lineHeight: 1.06,
            letterSpacing: "-0.01em",
            color: "transparent",
            WebkitTextStroke: `${strokeWidth}px ${palette.ink}`,
            marginBottom: unit * 2.6,
          }}
        >
          {headline}
        </h1>
        <div
          style={{
            width: unit * 16,
            height: Math.max(4, unit * 0.9),
            background: palette.accent,
            marginBottom: body ? unit * 3 : 0,
          }}
        />
        {body ? (
          <p
            style={{
              ...textBase,
              fontSize: unit * 3 * boost * 0.9 * textScale,
              lineHeight: 1.5,
              fontWeight: 500,
              color: palette.ink,
              opacity: 0.85,
              maxWidth: wide ? "55%" : "84%",
            }}
          >
            {body}
          </p>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <span
          style={{
            ...textBase,
            fontSize: unit * 2,
            letterSpacing: "0.1em",
            color: palette.ink,
            opacity: 0.5,
          }}
        >
          {brand.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </span>
        <CtaPill cta={cta} palette={palette} unit={unit} scale={boost * textScale} />
      </div>
    </div>
  );
}

import { BrandMark, CtaPill, fitFontSize, fontStack, textBase, type ArchetypeProps } from "./shared";

// badge — 중앙 정렬 + 인셋 프레임 라인 + 캡슐 CTA. 공지·발표형 메시지에 맞는 정제된 구도.

export function CenterBadge(props: ArchetypeProps) {
  const { brand, platform, palette, headline, body, cta, showLogo, textScale, unit } = props;
  const wide = platform.width / platform.height >= 2;
  const boost = wide ? 1.3 : 1;
  const framePad = unit * 4;
  const headlineSize = fitFontSize(unit * 7.6 * boost * textScale, headline, 20);

  return (
    <div
      style={{
        width: platform.width,
        height: platform.height,
        fontFamily: fontStack(brand),
        background: palette.bg,
        position: "relative",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: framePad,
          border: `${Math.max(2, unit * 0.28)}px solid ${palette.ink}38`,
          borderRadius: unit * 1.2,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: framePad - unit * 0.9,
          left: "50%",
          transform: "translateX(-50%)",
          width: unit * 14,
          height: unit * 1.8,
          background: palette.bg,
        }}
      />

      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: unit * 3.2,
          padding: unit * 12,
          paddingBottom: unit * 12 + platform.height * platform.safeBottom,
          boxSizing: "border-box",
        }}
      >
        {showLogo ? <BrandMark brand={brand} palette={palette} unit={unit} /> : null}
        <div
          style={{
            width: unit * 8,
            height: Math.max(3, unit * 0.5),
            background: palette.accent,
            borderRadius: unit,
          }}
        />
        <h1
          style={{
            ...textBase,
            fontSize: headlineSize,
            fontWeight: 800,
            lineHeight: 1.18,
            color: palette.ink,
            maxWidth: "88%",
          }}
        >
          {headline}
        </h1>
        {body ? (
          <p
            style={{
              ...textBase,
              fontSize: unit * 2.9 * boost * 0.9 * textScale,
              lineHeight: 1.55,
              color: palette.ink,
              opacity: 0.78,
              maxWidth: "72%",
            }}
          >
            {body}
          </p>
        ) : null}
        <CtaPill cta={cta} palette={palette} unit={unit} scale={boost * textScale} />
      </div>
    </div>
  );
}

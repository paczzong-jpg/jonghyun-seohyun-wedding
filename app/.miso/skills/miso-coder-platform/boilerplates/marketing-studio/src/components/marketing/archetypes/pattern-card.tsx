import { BrandMark, CtaPill, fitFontSize, fontStack, textBase, type ArchetypeProps } from "./shared";

// pattern — 브랜드 색 기하 패턴 배경 + 중앙 카드. 프로모션·공지형 메시지에 맞는 경쾌한 구도.
// 패턴은 paletteIndex 로 도트/스트라이프/링 중 하나가 결정적으로 선택된다.

function patternDataUri(kind: number, color: string, unit: number): string {
  const c = encodeURIComponent(color);
  const s = Math.round(unit * 10);
  if (kind === 0) {
    // 도트
    const r = Math.max(2, Math.round(unit * 0.7));
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${s}'%3E%3Ccircle cx='${s / 4}' cy='${s / 4}' r='${r}' fill='${c}'/%3E%3Ccircle cx='${(s * 3) / 4}' cy='${(s * 3) / 4}' r='${r}' fill='${c}'/%3E%3C/svg%3E")`;
  }
  if (kind === 1) {
    // 대각 스트라이프
    const w = Math.max(3, Math.round(unit * 1));
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${s}'%3E%3Cpath d='M0 ${s}L${s} 0' stroke='${c}' stroke-width='${w}'/%3E%3C/svg%3E")`;
  }
  // 링
  const r2 = Math.round(s / 3);
  const sw = Math.max(2, Math.round(unit * 0.5));
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${s}'%3E%3Ccircle cx='${s / 2}' cy='${s / 2}' r='${r2}' fill='none' stroke='${c}' stroke-width='${sw}'/%3E%3C/svg%3E")`;
}

export function PatternCard(props: ArchetypeProps) {
  const { brand, platform, palette, headline, body, cta, showLogo, textScale, unit } = props;
  const wide = platform.width / platform.height >= 2;
  const boost = wide ? 1.25 : 1;
  const headlineSize = fitFontSize(unit * 6.6 * boost * textScale, headline, 20);
  const patternKind = ((props.paletteIndex % 3) + 3) % 3;

  return (
    <div
      style={{
        width: platform.width,
        height: platform.height,
        fontFamily: fontStack(brand),
        background: palette.bg,
        backgroundImage: patternDataUri(patternKind, `${palette.accent}3d`, unit),
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: unit * 7,
        paddingBottom: unit * 7 + platform.height * platform.safeBottom,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: palette.paper,
          color: palette.paperInk,
          borderRadius: unit * 2.4,
          boxShadow: `0 ${unit * 1.6}px ${unit * 5}px rgba(10,10,14,0.28)`,
          padding: `${unit * 6}px ${unit * 7}px`,
          maxWidth: wide ? "58%" : "82%",
          maxHeight: "88%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: unit * 2.8,
          boxSizing: "border-box",
        }}
      >
        {showLogo ? (
          <BrandMark brand={brand} palette={palette} unit={unit} ink={palette.paperInk} />
        ) : null}
        <h1
          style={{
            ...textBase,
            fontSize: headlineSize,
            fontWeight: 800,
            lineHeight: 1.18,
            color: palette.paperInk,
          }}
        >
          {headline}
        </h1>
        {body ? (
          <p
            style={{
              ...textBase,
              fontSize: unit * 2.8 * boost * 0.9 * textScale,
              lineHeight: 1.5,
              color: palette.paperInk,
              opacity: 0.75,
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

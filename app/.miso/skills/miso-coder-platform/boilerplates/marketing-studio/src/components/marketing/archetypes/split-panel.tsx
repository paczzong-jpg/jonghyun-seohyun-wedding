import { darken } from "@/lib/marketing/palette";
import { BrandMark, CtaPill, fitFontSize, fontStack, textBase, type ArchetypeProps } from "./shared";

// split — 텍스트 패널 × 브랜드 색 블록의 2분할. 가로형은 좌/우, 세로형은 상/하로 나뉜다.

export function SplitPanel(props: ArchetypeProps) {
  const { brand, platform, palette, headline, body, cta, showLogo, textScale, unit } = props;
  const vertical = platform.height / platform.width >= 1.3;
  const wide = platform.width / platform.height >= 2;
  const boost = wide ? 1.3 : 1;
  const pad = unit * 7;
  const headlineSize = fitFontSize(unit * 7 * boost * textScale, headline, 18);
  const monogram = (brand.name.trim()[0] ?? "B").toUpperCase();

  const accentPanel = (
    <div
      style={{
        flex: vertical ? "0 0 42%" : "0 0 40%",
        background: `linear-gradient(160deg, ${palette.accent} 0%, ${darken(palette.accent, 0.45)} 120%)`,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          ...textBase,
          fontSize: unit * (vertical ? 46 : 38),
          fontWeight: 800,
          color: palette.accentInk,
          opacity: 0.22,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {monogram}
      </span>
      <div
        style={{
          position: "absolute",
          inset: unit * 2.4,
          border: `${Math.max(2, unit * 0.3)}px solid ${palette.accentInk}2a`,
          borderRadius: unit * 1.6,
        }}
      />
    </div>
  );

  const textPanel = (
    <div
      style={{
        flex: "1 1 auto",
        background: palette.paper,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: pad,
        paddingBottom: vertical ? pad + platform.height * platform.safeBottom : pad,
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      {showLogo ? (
        <BrandMark brand={brand} palette={palette} unit={unit} ink={palette.paperInk} />
      ) : (
        <div />
      )}
      <div>
        <h1
          style={{
            ...textBase,
            fontSize: headlineSize,
            fontWeight: 800,
            lineHeight: 1.16,
            color: palette.paperInk,
            marginBottom: body ? unit * 2.6 : unit * 4,
          }}
        >
          {headline}
        </h1>
        {body ? (
          <p
            style={{
              ...textBase,
              fontSize: unit * 2.9 * boost * 0.9 * textScale,
              lineHeight: 1.5,
              color: palette.paperInk,
              opacity: 0.75,
              marginBottom: unit * 4,
            }}
          >
            {body}
          </p>
        ) : null}
        <CtaPill cta={cta} palette={palette} unit={unit} scale={boost * textScale} />
      </div>
      <p
        style={{
          ...textBase,
          fontSize: unit * 2,
          letterSpacing: "0.1em",
          color: palette.paperInk,
          opacity: 0.45,
        }}
      >
        {brand.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
      </p>
    </div>
  );

  return (
    <div
      style={{
        width: platform.width,
        height: platform.height,
        fontFamily: fontStack(brand),
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        overflow: "hidden",
      }}
    >
      {vertical ? accentPanel : textPanel}
      {vertical ? textPanel : accentPanel}
    </div>
  );
}

import { proxiedImageUrl } from "@/lib/marketing/media";
import { mix } from "@/lib/marketing/palette";
import { BrandMark, CtaPill, fitFontSize, fontStack, textBase, type ArchetypeProps } from "./shared";

// photo — 이미지 백드롭 + 하단 스크림 위 텍스트. 이미지가 없으면 딥 그라디언트 폴백.
// 스크림 위 잉크는 항상 화이트 계열로 고정해 어떤 사진에서도 가독성을 보장한다.

const SCRIM_INK = "#fbfbf9";

export function PhotoBackdrop(props: ArchetypeProps) {
  const { brand, platform, palette, headline, body, cta, showLogo, bgImageUrl, textScale, unit } =
    props;
  const wide = platform.width / platform.height >= 2;
  const boost = wide ? 1.35 : 1;
  const pad = unit * 8;
  const headlineSize = fitFontSize(unit * 8.6 * boost * textScale, headline, 16);
  const imageUrl = bgImageUrl || brand.ogImageUrl;

  const scrimPalette = {
    ...palette,
    ink: SCRIM_INK,
    accentInk: palette.accentInk,
  };

  return (
    <div
      style={{
        width: platform.width,
        height: platform.height,
        fontFamily: fontStack(brand),
        position: "relative",
        overflow: "hidden",
        // 폴백 배경은 팔레트 밝기와 무관하게 항상 어둡게 — 스크림 잉크(화이트) 가독성 보장
        background: `linear-gradient(150deg, ${mix(palette.accent, "#0d0d10", 0.55)} 0%, #101013 100%)`,
      }}
    >
      {imageUrl ? (
        <img
          src={proxiedImageUrl(imageUrl)}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            top: -platform.height * 0.2,
            right: -platform.width * 0.1,
            width: Math.max(platform.width, platform.height) * 0.6,
            height: Math.max(platform.width, platform.height) * 0.6,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${palette.accent}55 0%, transparent 68%)`,
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(8,8,10,0.32) 0%, rgba(8,8,10,0.05) 34%, rgba(8,8,10,0.82) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: pad,
          paddingBottom: pad + platform.height * platform.safeBottom,
          boxSizing: "border-box",
        }}
      >
        {showLogo ? (
          <BrandMark brand={brand} palette={scrimPalette} unit={unit} ink={SCRIM_INK} />
        ) : (
          <div />
        )}

        <div style={{ maxWidth: wide ? "60%" : "90%" }}>
          <h1
            style={{
              ...textBase,
              fontSize: headlineSize,
              fontWeight: 800,
              lineHeight: 1.12,
              color: SCRIM_INK,
              textShadow: "0 2px 24px rgba(0,0,0,0.35)",
              marginBottom: body ? unit * 2.6 : unit * 3.6,
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
                color: SCRIM_INK,
                opacity: 0.88,
                marginBottom: unit * 3.6,
                maxWidth: "92%",
              }}
            >
              {body}
            </p>
          ) : null}
          <CtaPill cta={cta} palette={scrimPalette} unit={unit} scale={boost * textScale} />
        </div>
      </div>
    </div>
  );
}

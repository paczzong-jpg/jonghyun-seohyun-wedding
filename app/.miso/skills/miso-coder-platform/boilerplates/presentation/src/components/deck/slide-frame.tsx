import type { CSSProperties, ReactNode } from "react";

import {
  slideBgColor,
  slideInkColor,
  slideLineColor,
  slideMutedColor,
  type DeckTheme,
} from "@/lib/deck/themes";
import type { SlideBackground } from "@/lib/deck/types";

type SlideFrameProps = {
  theme: DeckTheme;
  background?: SlideBackground;
  /** 코너 그라데이션 워시 — sparse 슬라이드(표지·섹션 등) 전용 */
  wash?: boolean;
  /** 좌측 푸터 텍스트. undefined 면 푸터 영역 자체를 그리지 않는다 */
  footer?: string;
  /** 우측 페이지 표기 ("04 — 18") */
  pageLabel?: string;
  children: ReactNode;
};

/**
 * 슬라이드 공통 프레임 — 배경 변형(default/soft/invert)에 맞춰
 * 텍스트·구분선 CSS 변수를 재주입해 자식 레이아웃이 그대로 동작하게 한다.
 * 같은 색 계산을 PPTX 내보내기(export-pptx.ts)도 사용한다.
 */
export function SlideFrame({
  theme,
  background,
  wash = false,
  footer,
  pageLabel,
  children,
}: SlideFrameProps) {
  const style: CSSProperties = { background: slideBgColor(theme, background) };
  if (background === "invert") {
    Object.assign(style, {
      "--deck-ink": slideInkColor(theme, background),
      "--deck-muted": slideMutedColor(theme, background),
      "--deck-line": slideLineColor(theme, background),
    });
  }

  const showFooter = footer !== undefined || pageLabel !== undefined;

  return (
    <div className="deck-slide" style={style}>
      {wash && <div className="deck-wash" />}
      {children}
      {showFooter && (
        <div className="deck-footer">
          <span>{footer ?? ""}</span>
          <span className="deck-num">{pageLabel ?? ""}</span>
        </div>
      )}
    </div>
  );
}

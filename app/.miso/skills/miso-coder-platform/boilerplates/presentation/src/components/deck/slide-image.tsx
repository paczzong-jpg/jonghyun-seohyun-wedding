import type { SlideImage } from "@/lib/deck/types";

type SlideImageBoxProps = {
  image: SlideImage;
  /** 컨테이너를 꽉 채울지 (풀블리드 미디어) */
  cover?: boolean;
  className?: string;
};

/**
 * 슬라이드 이미지 — src 가 없으면 테마 색으로 추상 플레이스홀더를 그린다.
 * 실제 이미지가 준비되면 deck-content.ts 의 src 만 채우면 된다.
 */
export function SlideImageBox({ image, cover = false, className }: SlideImageBoxProps) {
  if (image.src) {
    return (
      <img
        src={image.src}
        alt={image.alt}
        className={className}
        style={{
          width: "100%",
          height: "100%",
          objectFit: cover ? "cover" : "contain",
          display: "block",
        }}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={image.alt}
      className={className}
      style={{ width: "100%", height: "100%" }}
    >
      <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="deck-ph-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--deck-accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--deck-accent-2)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="var(--deck-surface-soft)" />
        <rect width="100%" height="100%" fill="url(#deck-ph-grad)" />
        <circle cx="78%" cy="26%" r="72" fill="var(--deck-accent)" opacity="0.35" />
        <circle cx="24%" cy="74%" r="110" fill="var(--deck-accent-2)" opacity="0.25" />
        <circle cx="55%" cy="55%" r="34" fill="var(--deck-ink)" opacity="0.12" />
      </svg>
    </div>
  );
}

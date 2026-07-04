import { SlideImageBox } from "@/components/deck/slide-image";
import type { MediaSlide } from "@/lib/deck/types";

export function MediaSlideView({ slide }: { slide: MediaSlide }) {
  const hasOverlay = Boolean(slide.title || slide.caption);

  return (
    <div className="absolute inset-0">
      <SlideImageBox image={slide.image} cover />
      {hasOverlay && (
        <>
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: 340,
              background: "linear-gradient(to top, rgba(0,0,0,0.72), transparent)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 px-[88px] pb-[64px]">
            {slide.title && (
              <h2
                className="deck-display whitespace-pre-line"
                style={{ fontSize: 52, color: "#FFFFFF" }}
              >
                {slide.title}
              </h2>
            )}
            {slide.caption && (
              <p
                className="mt-[14px] whitespace-pre-line text-[17px] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.82)", maxWidth: 720 }}
              >
                {slide.caption}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

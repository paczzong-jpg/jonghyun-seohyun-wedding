import { SlideImageBox } from "@/components/deck/slide-image";
import type { GallerySlide } from "@/lib/deck/types";

export function GallerySlideView({ slide }: { slide: GallerySlide }) {
  const count = slide.images.length;
  const cols = count <= 2 ? count : count === 4 ? 2 : 3;

  return (
    <div className="absolute inset-0 flex flex-col px-[88px] pt-[84px] pb-[88px]">
      <header style={{ maxWidth: 860 }}>
        {slide.kicker && <div className="deck-kicker">{slide.kicker}</div>}
        <h2 className="deck-slide-title mt-[14px] whitespace-pre-line">{slide.title}</h2>
      </header>
      <div
        className="mt-[32px] grid flex-1 gap-[20px]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {slide.images.map((img, i) => (
          <figure key={img.alt + i} className="flex min-h-0 flex-col">
            <div
              className="min-h-0 flex-1 overflow-hidden"
              style={{ borderRadius: "var(--deck-radius)", border: "1px solid var(--deck-line)" }}
            >
              <SlideImageBox image={img} cover />
            </div>
            {img.caption && (
              <figcaption className="deck-caption mt-[10px]" style={{ fontSize: 12.5 }}>
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}

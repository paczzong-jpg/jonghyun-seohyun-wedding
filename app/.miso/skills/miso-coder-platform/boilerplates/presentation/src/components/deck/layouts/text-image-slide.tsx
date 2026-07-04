import { SlideImageBox } from "@/components/deck/slide-image";
import type { TextImageSlide } from "@/lib/deck/types";

export function TextImageSlideView({ slide }: { slide: TextImageSlide }) {
  const imageFirst = slide.imageSide === "left";

  const text = (
    <div className="flex min-w-0 flex-1 flex-col justify-center">
      {slide.kicker && <div className="deck-kicker">{slide.kicker}</div>}
      <h2 className="deck-slide-title mt-[14px] whitespace-pre-line">{slide.title}</h2>
      {slide.body?.map((p) => (
        <p key={p.slice(0, 24)} className="deck-body mt-[18px]" style={{ maxWidth: 480 }}>
          {p}
        </p>
      ))}
      {slide.bullets && slide.bullets.length > 0 && (
        <ul className="mt-[26px] flex flex-col gap-[12px]">
          {slide.bullets.map((b) => (
            <li key={b} className="flex items-start gap-[12px]">
              <span
                className="mt-[9px] inline-block h-[6px] w-[6px] flex-none rounded-full"
                style={{ background: "var(--deck-accent)" }}
              />
              <span className="deck-body" style={{ color: "var(--deck-ink)", fontSize: 15.5 }}>
                {b}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const media = (
    <figure className="flex w-[520px] flex-none flex-col justify-center">
      <div
        className="overflow-hidden"
        style={{
          height: 440,
          borderRadius: "var(--deck-radius)",
          border: "1px solid var(--deck-line)",
        }}
      >
        <SlideImageBox image={slide.image} cover />
      </div>
      {slide.image.caption && (
        <figcaption className="deck-caption mt-[12px]">{slide.image.caption}</figcaption>
      )}
    </figure>
  );

  return (
    <div className="absolute inset-0 flex items-stretch gap-[72px] px-[88px] pt-[64px] pb-[88px]">
      {imageFirst ? media : text}
      {imageFirst ? text : media}
    </div>
  );
}

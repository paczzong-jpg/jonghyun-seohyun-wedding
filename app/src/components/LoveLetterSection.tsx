import { weddingData } from "@/data/weddingData";

export function LoveLetterSection() {
  return (
    <section className="w-full bg-white mt-0">
      <img
        className="w-full block"
        src={weddingData.images.loveLetter1}
        alt=""
      />
      <img
        className="w-full block"
        src={weddingData.images.loveLetter2}
        alt=""
      />
    </section>
  );
}

import { weddingData } from "@/data/weddingData";

export function CalendarSection() {
  return (
    <section className="w-full bg-[var(--color-pink)]">
      <img
        className="w-full block"
        src={weddingData.images.calendar}
        alt="청첩장"
      />
    </section>
  );
}

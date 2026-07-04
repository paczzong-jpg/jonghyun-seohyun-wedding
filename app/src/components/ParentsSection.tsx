import { weddingData } from "@/data/weddingData";

export function ParentsSection() {
  return (
    <section className="w-full bg-transparent text-center p-0 m-0">
      <img
        className="w-full block"
        src={weddingData.images.groomFamily}
        alt=""
      />
      <img
        className="w-full block"
        src={weddingData.images.brideFamily}
        alt=""
      />
    </section>
  );
}

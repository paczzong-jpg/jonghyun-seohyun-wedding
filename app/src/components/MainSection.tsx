import { weddingData } from "@/data/weddingData";

export function MainSection() {
  return (
    <section className="relative w-full overflow-hidden bg-black text-center leading-none">
      <div className="w-full leading-none">
        <img
          className="w-full block"
          src={weddingData.images.main1}
          alt="커버"
        />
      </div>

      <img
        className="w-full block mt-20"
        src={weddingData.images.saveTheDate}
        alt=""
      />

      <div className="mt-2.5 px-8 py-5 text-15 text-white leading-relaxed">
        <p>{weddingData.date}</p>
        <p>{weddingData.venue}</p>
        <p>{weddingData.address}</p>
      </div>

      <img
        className="w-full block mt-16 mb-16"
        src={weddingData.images.envelope}
        alt="웨딩"
      />

      <img
        className="w-4/5 mx-auto mb-12 block"
        src={weddingData.images.handwrite}
        alt=""
      />

      <div className="px-8 py-5 text-15 text-white leading-loose">
        <p>
          <strong>{weddingData.groom.label}</strong>
        </p>
        <p>{weddingData.groom.name}</p>
        <br />
        <p>
          <strong>{weddingData.bride.label}</strong>
        </p>
        <p>{weddingData.bride.name}</p>
      </div>

      <div className="h-12" />

      <img
        className="w-full block m-0 align-bottom"
        src={weddingData.images.main2}
        alt=""
      />
    </section>
  );
}

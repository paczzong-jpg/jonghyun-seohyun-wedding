import { weddingData } from "@/data/weddingData";

interface MapSectionProps {
  onCopyAddress: () => void;
}

export function MapSection({ onCopyAddress }: MapSectionProps) {
  return (
    <section className="w-full bg-white text-[var(--color-text)] pb-9">
      <div className="h-12" />
      <img
        className="block mx-auto h-13"
        src={weddingData.images.mapTitle}
        alt="오시는 길"
      />
      <div className="h-3" />

      <div className="w-full h-62.5 bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
        지도 (Naver Maps API 연동 필요)
      </div>

      <div className="h-4" />

      <div className="px-5 mb-4 flex items-center justify-between gap-3">
        <span className="flex-1 min-w-0">
          <p className="m-0 text-15 leading-relaxed">
            <strong>{weddingData.map.venueName}</strong>
          </p>
          <p className="m-0 mt-0.5 text-15 leading-relaxed break-keep">
            {weddingData.map.address}
          </p>
        </span>
        <button
          className="bg-[#f4879f] text-[var(--color-text)] border-none rounded-full text-13 px-5 py-2 cursor-pointer whitespace-nowrap shrink-0 self-center"
          onClick={onCopyAddress}
        >
          복사하기
        </button>
      </div>

      <hr className="mx-5 my-3 border-t border-black/8" />

      <div className="px-5 mb-5 text-15 text-[var(--color-text)] leading-relaxed">
        <p>
          <strong>{weddingData.map.transport.subway.title}</strong>
        </p>
        <p className="whitespace-pre-line">
          {weddingData.map.transport.subway.info}
        </p>
        <br />
        <p>
          <strong>{weddingData.map.transport.bus.title}</strong>
        </p>
        <p className="whitespace-pre-line">
          {weddingData.map.transport.bus.info}
        </p>
      </div>

      <div className="h-9" />
    </section>
  );
}

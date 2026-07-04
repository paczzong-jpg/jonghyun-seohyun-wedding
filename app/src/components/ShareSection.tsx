import { weddingData } from "@/data/weddingData";

interface ShareSectionProps {
  onCopyUrl: () => void;
}

export function ShareSection({ onCopyUrl }: ShareSectionProps) {
  return (
    <section className="w-full bg-[var(--color-cream)] text-[var(--color-text)] py-8 px-8 text-center">
      <div className="h-8" />
      <div>
        <button className="inline-block bg-[var(--color-yellow)] text-[var(--color-text)] border-none rounded-md text-14 px-8 py-3 cursor-pointer m-0">
          카카오톡 공유하기
        </button>
      </div>
      <div className="h-2.5" />
      <div>
        <button
          className="inline-block bg-[var(--color-text)] text-white border-none rounded-md text-14 px-6 py-3 cursor-pointer m-0"
          onClick={onCopyUrl}
        >
          청첩장 주소 복사하기
        </button>
      </div>
      <div className="h-8" />
      <p className="mt-8 text-11 text-gray-500">©weddingpeach</p>
      <div className="h-8" />
    </section>
  );
}

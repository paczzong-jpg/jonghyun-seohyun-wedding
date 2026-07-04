import { useEffect } from "react";
import { weddingData } from "@/data/weddingData";

interface LightboxProps {
  isOpen: boolean;
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function Lightbox({
  isOpen,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: LightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentImage = weddingData.images.gallery[currentIndex];

  return (
    <div
      className="fixed inset-0 bg-black/92 z-10000 flex items-center justify-center touch-none"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-5 text-white text-28 cursor-pointer bg-transparent border-none leading-none"
        onClick={onClose}
      >
        ✕
      </button>
      <button
        className="absolute top-1/2 -translate-y-1/2 left-1 text-white/70 text-32 cursor-pointer bg-transparent border-none p-2.5"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
      >
        ‹
      </button>
      <img
        className="max-w-[95vw] max-h-[90vh] object-contain pointer-events-none select-none touch-none"
        src={currentImage}
        alt=""
        onClick={(e) => e.stopPropagation()}
      />
      <button
        className="absolute top-1/2 -translate-y-1/2 right-1 text-white/70 text-32 cursor-pointer bg-transparent border-none p-2.5"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
      >
        ›
      </button>
    </div>
  );
}

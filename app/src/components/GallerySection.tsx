import { useState } from "react";
import { weddingData } from "@/data/weddingData";

interface GallerySectionProps {
  onImageClick: (index: number) => void;
}

export function GallerySection({ onImageClick }: GallerySectionProps) {
  const [showAll, setShowAll] = useState(false);

  const galleryImages = weddingData.images.gallery;
  const displayImages = showAll ? galleryImages : galleryImages.slice(0, 15);
  const hasMore = galleryImages.length > 15;

  return (
    <section className="w-full bg-white">
      <div className="grid grid-cols-3">
        {displayImages.map((img, index) => (
          <div
            key={index}
            className="aspect-[3/4] overflow-hidden cursor-pointer"
            onClick={() => onImageClick(index)}
          >
            <img
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              src={img}
              alt=""
            />
          </div>
        ))}
      </div>
      {hasMore && !showAll && (
        <div className="bg-white text-center py-4 pb-18">
          <button
            className="bg-[var(--color-text)] text-white border-none rounded-md text-14 px-12 py-2.5 cursor-pointer"
            onClick={() => setShowAll(true)}
          >
            더보기
          </button>
        </div>
      )}
    </section>
  );
}

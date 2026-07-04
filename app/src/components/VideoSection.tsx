import { useState } from "react";
import { weddingData } from "@/data/weddingData";

export function VideoSection() {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const embedUrl = `https://www.youtube.com/embed/${weddingData.video.youtubeId}?autoplay=1&rel=0&modestbranding=1&fs=0`;

  return (
    <section className="w-full bg-black">
      <div className="relative w-full my-8 max-w-[280px] mx-auto">
        {!isPlaying ? (
          <div
            className="relative w-full cursor-pointer leading-none aspect-[9/16] max-h-[333px] mx-auto overflow-hidden rounded-lg"
            onClick={handlePlay}
          >
            <img
              className="w-full h-full object-cover"
              src={weddingData.video.thumbnailUrl}
              alt="영상 썸네일"
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/65 text-white text-26 flex items-center justify-center pl-1 transition-colors hover:bg-red-600/85">
              ▶
            </div>
          </div>
        ) : (
          <div className="relative w-full pt-[177.78%] max-h-[333px] mx-auto overflow-hidden rounded-lg">
            <iframe
              className="absolute top-0 left-0 w-full h-full border-0"
              src={embedUrl}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>
    </section>
  );
}

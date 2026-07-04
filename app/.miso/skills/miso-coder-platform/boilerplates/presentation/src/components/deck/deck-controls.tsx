import { useEffect, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  Loader2,
  Maximize,
} from "lucide-react";

type DeckControlsProps = {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onOverview: () => void;
  onDownload: () => void;
  downloading: boolean;
};

export function DeckControls({
  index,
  total,
  onPrev,
  onNext,
  onOverview,
  onDownload,
  downloading,
}: DeckControlsProps) {
  // 마우스가 멈추면 컨트롤을 숨겨 슬라이드(푸터 페이지 표기)를 가리지 않는다
  const [idle, setIdle] = useState(true);
  useEffect(() => {
    let timer: number;
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), 2600);
    };
    window.addEventListener("mousemove", wake);
    window.addEventListener("touchstart", wake, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("touchstart", wake);
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  return (
    <nav className="deck-controls" data-idle={idle && !downloading} aria-label="슬라이드 컨트롤">
      <button type="button" onClick={onPrev} disabled={index === 0} aria-label="이전 슬라이드">
        <ChevronLeft size={17} />
      </button>
      <span className="deck-counter deck-num">
        {index + 1} / {total}
      </span>
      <button type="button" onClick={onNext} disabled={index === total - 1} aria-label="다음 슬라이드">
        <ChevronRight size={17} />
      </button>
      <button type="button" onClick={onOverview} aria-label="전체 슬라이드 보기 (O)">
        <LayoutGrid size={15} />
      </button>
      <button type="button" onClick={toggleFullscreen} aria-label="전체 화면 (F)">
        <Maximize size={15} />
      </button>
      <button
        type="button"
        onClick={onDownload}
        disabled={downloading}
        aria-label="PPTX 다운로드"
        title="PPTX 다운로드"
      >
        {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
      </button>
    </nav>
  );
}

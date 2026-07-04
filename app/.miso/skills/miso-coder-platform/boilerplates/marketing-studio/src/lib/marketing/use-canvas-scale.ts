import { useEffect, useRef, useState } from "react";

// 컨테이너 크기에 맞춰 고정 px 캔버스를 scale-to-fit 하는 훅

export function useCanvasScale(canvasWidth: number, canvasHeight: number) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      setScale(Math.min(rect.width / canvasWidth, rect.height / canvasHeight));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [canvasWidth, canvasHeight]);

  return { containerRef, scale };
}

import { useCallback, useEffect, useState } from "react";

function indexFromHash(total: number): number {
  const m = window.location.hash.match(/^#\/(\d+)$/);
  if (!m) return 0;
  const n = Number.parseInt(m[1], 10) - 1;
  return Math.min(Math.max(n, 0), total - 1);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

/**
 * 덱 내비게이션 상태 — 키보드/스와이프/해시(#/3) 동기화 + 오버뷰 토글.
 */
export function useDeck(total: number) {
  const [index, setIndex] = useState(() => indexFromHash(total));
  const [overview, setOverview] = useState(false);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), total - 1);
      setIndex(clamped);
      window.history.replaceState(null, "", `#/${clamped + 1}`);
    },
    [total],
  );

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // 브라우저 뒤로가기 등으로 해시가 바뀌면 따라간다
  useEffect(() => {
    const onHashChange = () => setIndex(indexFromHash(total));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [total]);

  // 키보드
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "PageDown":
          e.preventDefault();
          setOverview(false);
          go(index + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          setOverview(false);
          go(index - 1);
          break;
        case "Home":
          e.preventDefault();
          go(0);
          break;
        case "End":
          e.preventDefault();
          go(total - 1);
          break;
        case "o":
        case "O":
          setOverview((v) => !v);
          break;
        case "Escape":
          setOverview((v) => !v);
          break;
        case "f":
        case "F":
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, index, total]);

  // 터치 스와이프
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) go(index + 1);
      else go(index - 1);
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [go, index]);

  return { index, go, next, prev, overview, setOverview };
}

/** 뷰포트에 16:9 캔버스를 딱 맞추는 scale 값 */
export function useDeckScale(width: number, height: number) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () =>
      setScale(Math.min(window.innerWidth / width, window.innerHeight / height));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width, height]);
  return scale;
}

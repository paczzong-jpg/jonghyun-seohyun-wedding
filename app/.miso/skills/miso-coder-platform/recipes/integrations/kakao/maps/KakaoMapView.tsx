import { useEffect, useRef, useState } from "react";

type KakaoMap = unknown;

type KakaoMapsGlobal = {
  maps: {
    load: (callback: () => void) => void;
    LatLng: new (lat: number, lng: number) => unknown;
    Map: new (element: HTMLElement, options: { center: unknown; level: number }) => KakaoMap;
    Marker: new (options: { position: unknown; map: KakaoMap }) => unknown;
    InfoWindow: new (options: { content: string }) => { open: (map: KakaoMap, marker: unknown) => void };
  };
};

declare global {
  interface Window {
    kakao?: KakaoMapsGlobal;
  }
}

const KAKAO_MAP_SCRIPT_ID = "kakao-map-sdk";

function loadKakaoMapSdk(clientId: string): Promise<KakaoMapsGlobal> {
  if (window.kakao?.maps) {
    return new Promise((resolve) => window.kakao?.maps.load(() => resolve(window.kakao as KakaoMapsGlobal)));
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(KAKAO_MAP_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        if (!window.kakao?.maps) {
          reject(new Error("Kakao Maps SDK loaded without maps namespace"));
          return;
        }
        window.kakao.maps.load(() => resolve(window.kakao as KakaoMapsGlobal));
      });
      existing.addEventListener("error", () => reject(new Error("Failed to load Kakao Maps SDK")));
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_MAP_SCRIPT_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(clientId)}&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(new Error("Kakao Maps SDK loaded without maps namespace"));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao as KakaoMapsGlobal));
    };
    script.onerror = () => reject(new Error("Failed to load Kakao Maps SDK"));
    document.head.appendChild(script);
  });
}

export function KakaoMapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const clientId = import.meta.env.VITE_KAKAO_MAP_CLIENT_ID as string | undefined;
    if (!clientId) {
      setError("Missing VITE_KAKAO_MAP_CLIENT_ID");
      return;
    }

    loadKakaoMapSdk(clientId)
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        const center = new kakao.maps.LatLng(37.5665, 126.978);
        const map = new kakao.maps.Map(containerRef.current, { center, level: 3 });
        const marker = new kakao.maps.Marker({ position: center, map });
        new kakao.maps.InfoWindow({ content: "<strong>Seoul City Hall</strong>" }).open(map, marker);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load Kakao map");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Kakao map">
      <div ref={containerRef} className="min-h-[420px] w-full" />
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}

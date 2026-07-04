import { useEffect, useRef, useState } from "react";

type NaverMap = unknown;

type NaverMapsGlobal = {
  maps: {
    LatLng: new (lat: number, lng: number) => unknown;
    Map: new (
      element: HTMLElement,
      options: { center: unknown; zoom: number; scaleControl?: boolean; logoControl?: boolean },
    ) => NaverMap;
    Marker: new (options: { position: unknown; map: NaverMap }) => unknown;
    InfoWindow: new (options: { content: string }) => { open: (map: NaverMap, marker: unknown) => void };
  };
};

declare global {
  interface Window {
    naver?: NaverMapsGlobal;
  }
}

const NAVER_MAP_SCRIPT_ID = "naver-map-sdk";

function loadNaverMapSdk(clientId: string): Promise<NaverMapsGlobal> {
  if (window.naver?.maps) return Promise.resolve(window.naver);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(NAVER_MAP_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.naver?.maps) resolve(window.naver);
        else reject(new Error("Naver Maps SDK loaded without maps namespace"));
      });
      existing.addEventListener("error", () => reject(new Error("Failed to load Naver Maps SDK")));
      return;
    }

    const script = document.createElement("script");
    script.id = NAVER_MAP_SCRIPT_ID;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`;
    script.async = true;
    script.onload = () => {
      if (window.naver?.maps) resolve(window.naver);
      else reject(new Error("Naver Maps SDK loaded without maps namespace"));
    };
    script.onerror = () => reject(new Error("Failed to load Naver Maps SDK"));
    document.head.appendChild(script);
  });
}

export function NaverMapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;
    if (!clientId) {
      setError("Missing VITE_NAVER_MAP_CLIENT_ID");
      return;
    }

    loadNaverMapSdk(clientId)
      .then((naver) => {
        if (cancelled || !containerRef.current) return;
        const center = new naver.maps.LatLng(37.5665, 126.978);
        const map = new naver.maps.Map(containerRef.current, {
          center,
          zoom: 15,
          scaleControl: true,
          logoControl: true,
        });
        const marker = new naver.maps.Marker({ position: center, map });
        new naver.maps.InfoWindow({ content: "<strong>Seoul City Hall</strong>" }).open(map, marker);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load Naver map");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Naver map">
      <div ref={containerRef} className="min-h-[420px] w-full" />
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}

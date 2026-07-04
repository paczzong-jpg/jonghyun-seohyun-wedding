import { useEffect, useRef, useState } from "react";

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  remove: () => void;
};

type LeafletLayer = {
  addTo: (map: LeafletMap) => LeafletLayer;
  bindPopup?: (content: string) => LeafletLayer;
};

type LeafletGlobal = {
  map: (element: HTMLElement) => LeafletMap;
  tileLayer: (
    urlTemplate: string,
    options: { maxZoom: number; attribution: string },
  ) => LeafletLayer;
  marker: (center: [number, number]) => LeafletLayer;
};

declare global {
  interface Window {
    L?: LeafletGlobal;
  }
}

const LEAFLET_CSS_ID = "leaflet-css";
const LEAFLET_SCRIPT_ID = "leaflet-js";
const LEAFLET_VERSION = "1.9.4";

function ensureStylesheet() {
  if (document.getElementById(LEAFLET_CSS_ID)) return;
  const link = document.createElement("link");
  link.id = LEAFLET_CSS_ID;
  link.rel = "stylesheet";
  link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
  document.head.appendChild(link);
}

function loadLeaflet(): Promise<LeafletGlobal> {
  if (window.L) return Promise.resolve(window.L);
  ensureStylesheet();

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.L) resolve(window.L);
        else reject(new Error("Leaflet loaded without global L"));
      });
      existing.addEventListener("error", () => reject(new Error("Failed to load Leaflet")));
      return;
    }

    const script = document.createElement("script");
    script.id = LEAFLET_SCRIPT_ID;
    script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
    script.async = true;
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet loaded without global L"));
    };
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.head.appendChild(script);
  });
}

export function LeafletOsmMapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((leaflet) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const center: [number, number] = [37.5665, 126.978];
        const map = leaflet.map(containerRef.current).setView(center, 13);
        leaflet
          .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          })
          .addTo(map);
        leaflet.marker(center).addTo(map).bindPopup?.("Seoul City Hall");
        mapRef.current = map;
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load map");
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <section aria-label="OpenStreetMap map">
      <div ref={containerRef} className="min-h-[420px] w-full" />
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}

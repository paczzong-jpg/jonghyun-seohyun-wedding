# Leaflet OpenStreetMap Frontend Recipe

## When To Use

Use this when the user wants a no-account, browser-only map in a generated MISO website app.

Leaflet is a frontend JavaScript map library. OpenStreetMap is map data; the public `tile.openstreetmap.org` tile service is free for light use but is not an unlimited production CDN.

## Official Docs To Check

- Leaflet Quick Start Guide: https://leafletjs.com/examples/quick-start/
- OpenStreetMap tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- OpenStreetMap vector tile usage policy, if using OSMF vector tiles later: https://operations.osmfoundation.org/policies/vector/

## Default Architecture

Use `LeafletOsmMapView.tsx` for simple browser map rendering. It loads Leaflet CSS/JS from a stable CDN and uses the public OpenStreetMap tile endpoint with required attribution.

This recipe intentionally avoids adding an npm dependency. If the app already has `leaflet` installed, using package imports is also acceptable, but do not edit package manager policy or lockfiles just to show a basic map.

## Tile Policy

The public OSM tile service is acceptable for demos, prototypes, small internal pages, and low-traffic apps. For production apps with sustained traffic, offline use, prefetching, heavy dashboards, or automated map screenshots, switch to a commercial tile provider or self-hosted tiles.

Do not:

- Bulk download, prefetch, or cache large tile areas from `tile.openstreetmap.org`.
- Hide or remove attribution.
- Use OSM public tiles for guaranteed-SLA production traffic.

## Files

1. Copy `LeafletOsmMapView.tsx` into an app-owned component path.
2. Render `<LeafletOsmMapView />` where the map should appear.
3. No env variables, connector, PocketBase route, or provider console setup is needed.

## Verification

- Browser code loads Leaflet CSS/JS and `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
- The tile layer includes attribution containing OpenStreetMap.
- The map container has a stable height.
- No API key, secret, connector, or PocketBase route was added.
- If the app is production/high-traffic, document the tile provider decision instead of relying on public OSM tiles.

## Common Wrong Paths

- Creating a backend proxy for public OSM tiles.
- Removing attribution.
- Treating OpenStreetMap public tiles as unlimited production infrastructure.
- Adding `leaflet` to `package.json` without checking whether a CDN loader is enough.

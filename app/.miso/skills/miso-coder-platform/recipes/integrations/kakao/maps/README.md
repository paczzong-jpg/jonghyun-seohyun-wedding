# Kakao Maps Frontend Recipe

## When To Use

Use this when the user wants an interactive Kakao map embedded in a generated MISO website app.

This is a frontend map SDK recipe, not a MISO connector and not a backend Kakao Local API route. Use the Kakao Maps JavaScript SDK from Vite browser code with a browser-visible JavaScript key.

## Official Docs To Check

- Kakao Maps JavaScript API guide: https://apis.map.kakao.com/web/guide/
- Kakao Map API overview: https://developers.kakao.com/docs/en/kakaomap/common
- Kakao Local REST API guide, only if server-side geocoding/search is needed: https://developers.kakao.com/docs/en/local/dev-guide

## Env Request

Request the Kakao JavaScript key before coding against missing values:

```ts
{
  title: "Connect Kakao Maps",
  description: "Enter the Kakao Maps JavaScript key for browser map rendering.",
  variables: [
    { key: "VITE_KAKAO_MAP_CLIENT_ID", label: "Kakao JavaScript key", target: "frontend", secret: false, required: true }
  ]
}
```

Use `miso_env_vars_request`; do not ask the user to paste the key into chat. The env name intentionally uses `CLIENT_ID` because this value is browser-visible and sent to the Kakao script as `appkey`. Do not use `VITE_KAKAO_MAP_REST_API_KEY`, `VITE_KAKAO_MAP_APP_KEY`, or backend `KAKAO_REST_API_KEY` in the browser component.

## Kakao Developers Setup

1. Create or select a Kakao Developers application.
2. Open app keys and copy the JavaScript key.
3. In Platform > Web, register the MISO preview origin and published origin.
4. Enable any additional Kakao Map/Local products only when the feature needs them.
5. If the site is published under a custom domain, add that custom origin after the domain is known.

Use origins only:

```text
preview origin:
https://<miso-origin>

published origin:
https://<miso-origin>
```

Do not include `/service/coder/preview/<app_id>` or `/site/<site_code>` in the Web platform domain unless Kakao changes its domain matching requirement. The Maps JavaScript SDK uses registered domains, not OAuth redirect URIs.

## Files

1. Copy `KakaoMapView.tsx` into an app-owned component path.
2. Render `<KakaoMapView />` where the map should appear.
3. Do not add a PocketBase route for simple map rendering.

## Verification

- `VITE_KAKAO_MAP_CLIENT_ID` was collected with `miso_env_vars_request` as `target: "frontend", secret: false`.
- Browser code loads `https://dapi.kakao.com/v2/maps/sdk.js?appkey=...&autoload=false`.
- Browser code does not contain Kakao REST API keys or admin keys.
- The map container has a stable height.
- Preview and published origins are registered in Kakao Developers Platform > Web.

## Common Wrong Paths

- Treating Kakao Maps JavaScript rendering as a Kakao OAuth connector.
- Putting Kakao REST API key or admin key in `VITE_*`.
- Creating a PocketBase hook just to render the map SDK.
- Registering `/__external/...` or `browser-proxy` as a Kakao domain or redirect URL.

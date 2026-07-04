# Naver Maps Frontend Recipe

## When To Use

Use this when the user wants an interactive Naver map embedded in a generated MISO website app.

This is a frontend map SDK recipe, not a MISO connector and not a backend tool. Use the Naver Maps JavaScript SDK from Vite browser code with a browser-visible Client ID.

## Official Docs To Check

- Naver Cloud Web Dynamic Map API: https://guide.ncloud-docs.com/docs/en/maps-web-sdk
- Naver Maps JavaScript API Client ID guide: https://navermaps.github.io/maps.js.en/docs/tutorial-1-Getting-Client-ID.html
- Naver Maps JavaScript API getting started: https://navermaps.github.io/maps.js.en/docs/tutorial-2-Getting-Started.html

## Env Request

Request the Web Dynamic Map Client ID before coding against missing values:

```ts
{
  title: "Connect Naver Maps",
  description: "Enter the Naver Maps Web Dynamic Map Client ID for browser map rendering.",
  variables: [
    { key: "VITE_NAVER_MAP_CLIENT_ID", target: "frontend", secret: false, required: true }
  ]
}
```

Use `miso_env_vars_request`; do not ask the user to paste the Client ID into chat. `VITE_NAVER_MAP_CLIENT_ID` is browser-visible and must be protected by the Naver Cloud application domain settings.

## Naver Cloud Setup

1. In Naver Cloud Platform Console, create or select an application for Maps.
2. Enable Web Dynamic Map.
3. Copy the Client ID, not the REST API key or API Gateway secret.
4. Register the MISO preview origin and published origin in the application domain settings.
5. After publishing, verify the final `/site/<site_code>` host origin is allowed.
6. If the site is published under a custom domain, add that custom origin after the domain is known.

Use origins only:

```text
preview origin:
https://<miso-origin>

published origin:
https://<miso-origin>
```

Do not include `/service/coder/preview/<app_id>` or `/site/<site_code>` in an origin allowlist unless the provider console explicitly asks for a full path. Browser map SDK domain checks normally use scheme plus host plus optional port.

## Files

1. Copy `NaverMapView.tsx` into an app-owned component path.
2. Render `<NaverMapView />` where the map should appear.
3. Do not add a PocketBase route for simple map rendering.

## Verification

- `VITE_NAVER_MAP_CLIENT_ID` was collected with `miso_env_vars_request` as `target: "frontend", secret: false`.
- Browser code loads `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=...`.
- Browser code does not contain NCP API Gateway key ID, NCP API Gateway key, or REST geocoding credentials.
- The map container has a stable height.
- Preview and published origins are registered in Naver Cloud.

## Common Wrong Paths

- Using `ncp_api_key` or `ncp_api_key_id` in the browser map component.
- Creating a MISO connector for simple map display.
- Creating a PocketBase hook just to render the map SDK.
- Debugging 401/429 responses in app code before checking Naver Cloud application service/domain settings.

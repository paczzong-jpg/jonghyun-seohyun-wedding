# Binary Download Or File Parse Fails

## Symptoms

- Downloaded file will not open.
- Spreadsheet parser fails on fetched content.
- Hook returns JSON but frontend expects a file.
- Large payload causes slow or broken responses.
- PocketBase logs show response-header parse errors such as `malformed MIME header line: Content-Disposition`.

## Common Wrong Diagnosis

Encoding the binary body into JSON or trying to inspect spreadsheet bytes as text.

## First Checks

1. Confirm whether the source needs secret headers.
2. If yes, use PocketBase hook and return `e.blob`.
3. Confirm frontend uses `response.arrayBuffer()`.
4. Confirm parser receives bytes, not JSON text.
5. If the failure happens before body delivery and mentions response headers, compare the hook request against the source-specific request headers in the selected recipe or reference.

## Commands Or Files To Inspect

- `recipes/miso/files/README.md`
- `recipes/pocketbase/imports/spreadsheet/README.md`
- The source-specific recipe that selected the external file provider
- `api/*.pb.js`
- Frontend parser component
- PocketBase logs

## Commands Or Files Not To Use

- Text reads of binary spreadsheets.
- JSON wrapping for large binary bodies.
- Invented PocketBase response body helpers.

## Decision Tree

- Secret/header needed: use PB hook.
- Public file: browser fetch can get bytes directly.
- Parser says invalid format: verify content type and first response path.
- Response-header parse error before body delivery: keep `proxyFetch`, fix the source-specific request headers in the selected recipe, then retest the PB route.
- Payload too large: stream or store file instead of JSON.

## Fix Path

Return the upstream bytes with `e.blob`, then parse `ArrayBuffer` in the browser.

For external file downloads, do not rewrite the feature to direct `$http.send` or browser-only CORS workarounds. Keep the PB `proxyFetch` route and fix the selected source's request headers first.

## Verification

Confirm HTTP status, content type, byte length, and parser result separately.

## Return To Recipe

Return to the specific recipe that selected the source format or provider.

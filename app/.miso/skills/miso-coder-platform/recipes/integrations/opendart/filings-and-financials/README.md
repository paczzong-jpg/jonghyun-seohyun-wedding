# OpenDART Filings And Financials

Use this recipe to implement OpenDART disclosure search, company profile lookup, and financial statement screens in a MISO website app.

## Files

| File | Copy to | Purpose |
| --- | --- | --- |
| `opendart.pb.js` | `api/opendart.pb.js` | PocketBase route that calls OpenDART through `runtimeProxy.proxyFetch`. |
| `OpenDartDisclosurePanel.tsx` | `src/components/OpenDartDisclosurePanel.tsx` or a feature-local component | Example React UI that calls local runtime routes with `getRuntimeBase()`. |

## Endpoint Map

All browser calls use the local runtime base, for example `${getRuntimeBase()}/api/opendart/filings`. Never call OpenDART directly from React.

| Local route | Upstream OpenDART API | Required query |
| --- | --- | --- |
| `GET /api/opendart/filings` | `list.json` | none, but use at least `corpCode` or a date range for useful results |
| `GET /api/opendart/company` | `company.json` | `corpCode` |
| `GET /api/opendart/single-account` | `fnlttSinglAcnt.json` | `corpCode`, `bsnsYear`, `reprtCode` |
| `GET /api/opendart/full-financials` | `fnlttSinglAcntAll.json` | `corpCode`, `bsnsYear`, `reprtCode`, `fsDiv` |
| `GET /api/opendart/corp-codes.zip` | `corpCode.xml` | none |

## Query Rules

- `corpCode` must be an 8-digit OpenDART corp code, for example `00126380`.
- `stockCode` is not accepted by these routes. Download `corp-codes.zip`, find the matching `stock_code`, then use its `corp_code`.
- `bgnDe` and `endDe` must be `YYYYMMDD`.
- `pageNo` is clamped to at least 1.
- `page_count` has maximum 100, so this recipe clamps frontend `pageCount` to 100 before forwarding as `page_count`.
- `reprtCode` values: `11013` first quarter, `11012` half year, `11014` third quarter, `11011` annual report.
- `fsDiv` values for full financial statements: `OFS` separate financial statements, `CFS` consolidated financial statements.

## Implementation Steps

1. Read `recipes/integrations/opendart/README.md`.
2. If `OPENDART_API_KEY` is missing, request it with `miso_env_vars_request` as `target: "backend", secret: true`.
3. Copy `opendart.pb.js` into `api/opendart.pb.js`.
4. Copy `OpenDartDisclosurePanel.tsx` into the relevant `src/` feature folder, or copy only the fetch functions into the existing UI.
5. Wire the component into the page.
6. Verify read-only routes first: `company`, then `filings`, then `single-account`.
7. Download `corp-codes.zip` only when the feature needs ticker-to-corp-code lookup or a local corp-code selector.

## Response Handling

OpenDART JSON APIs usually return HTTP 200 even when the application status is not success. The route normalizes this as:

```ts
{
  ok: data.status === "000",
  status: data.status,
  message: data.message,
  data
}
```

Treat status `000` as success, `013` as a valid empty state, and `010`/`011`/`012`/`020`/`021` as configuration, permission, IP, quota, or request-shape problems.

## Do Not

- Do not expose `OPENDART_API_KEY` as `VITE_...`.
- Do not call OpenDART from React or from sandbox shell commands.
- Do not use `$http.send`; use `runtimeProxy.proxyFetch`.
- Do not hardcode a single company, filing URL, `rcept_no`, or `corpCode.xml` result into the app. Defaults are fine for a demo input, but users must be able to change `corpCode`, `bsnsYear`, and report type.
- Do not stringify the `corpCode.xml` Zip bytes in PocketBase. Return `e.blob` and parse bytes in the browser or a chunked import flow.

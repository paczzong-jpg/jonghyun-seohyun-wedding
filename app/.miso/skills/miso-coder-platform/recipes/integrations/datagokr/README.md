# data.go.kr File Data

Download "파일데이터" (CSV/XLSX/ZIP, no API key) from the Korean Public Data Portal and use it in a generated app.

Not for data.go.kr OpenAPI endpoints (key / utilization application required) — use `recipes/miso/external-api/pocketbase-hook/README.md`.

Validated example:

- File-data page: https://www.data.go.kr/data/15003467/fileData.do
- Metadata page: https://www.data.go.kr/catalog/15003467/fileData.json

## Boilerplate in this folder — start from these, don't hand-roll

| File | What it is | How to use |
| --- | --- | --- |
| `route.pb.js` | Backend download route. One GET: page → resolve current `fileDownload.do` URL by byte search → download → return bytes. | Copy to `api/<feature>-file.pb.js`, change the route suffix and `dataId`. |
| `upsert.pb.js` | Backend bulk-save route using `$app.runInTransaction`. | Copy to `api/<feature>.pb.js`, set the collection name + columns. Use this **instead of** `pb.createBatch()` / `/api/batch` for data imports. |
| `loaders.ts` | Frontend: `downloadDataGoKr()` + `sniffContainer()` + `loadCsv` / `loadXlsx` (returns **all sheets**; handles exceljs 1-based values & empty cells) / `loadZip`. | Copy into `src/lib/`. `loadXlsx` needs `exceljs`, `loadZip`/xlsx-detect need `fflate`. Header row & column mapping are per-dataset — decide in the caller (don't assume sheet 0 / header row 1). |
| `probe.pb.js` | Temporary external-source probe (status/size/first bytes via `proxyFetch`). | Copy to `api/_probe.pb.js` to explore a source, then delete. **Never `curl` an external domain from the sandbox shell** — no CA bundle, and it bypasses the proxy path the app uses. |

The row parsing / column mapping / UI is per-dataset — the boilerplate stops at "bytes → CSV text / sheet rows / zip entries". You write the parsing on top.

## Why sniff bytes, not the portal's format label

Measured across 32 datasets: the page's `encodingFormat` disagreed with the real download **~37% of the time**. Datasets labeled "CSV" are often a **ZIP** (several CSVs, or a CSV + an HWP codebook); link-out datasets return **HTML**. So branch on the actual first bytes (`loaders.ts` does this), never on the label or extension.

## Gotchas

PocketBase 0.31 / Goja runtime (full list in `references/pocketbase/`):

- Keep every helper, constant, and `require(...)` **inside** the handler. A top-level helper called from the handler throws `is not defined`; a stray top-level `return` throws `Illegal return statement` and crash-loops the runtime. No `import`/`export`/`async`/`await` in hooks.
- Don't stringify the whole ~150KB page (`String.fromCharCode` loop is O(n²) → timeout). Byte-search `fileDownload.do` (see `route.pb.js`).
- Send browser-like headers (UA / Accept / Accept-Language / Referer). `Accept`-only can break `$http.send` with `malformed MIME header line: Content-Disposition`.
- Do not paste or store a previously observed `fileDownload.do?atchFileId=...` URL. Resolve the current URL at request time from the `fileData.do` page.
- Do not add a browser-direct `downloadUrl` fallback. It is likely to fail on CORS and it bypasses the MISO proxy path. If `proxyFetch` fails, return a clear JSON error and fix the backend route/headers.
- **Bulk save**: the PocketBase batch API is enabled but intentionally bounded (`maxRequests=50`, `timeout=5s`, `maxBodySize=1MiB`) and may be disabled in some environments. Do not use it for data.go.kr imports. Use `upsert.pb.js` (`runInTransaction`) and frontend chunking instead.

Data:

- BOM-less Korean text (CSV content **and** zip entry filenames) is CP949/EUC-KR, not UTF-8.
- Files reach hundreds of MB; size-gate before loading everything in the browser.

## Validate as you build (don't write everything and hope)

To explore an external URL before coding, deploy `probe.pb.js` (`proxyFetch`) and read status/size/first bytes — never `curl` an external domain from the sandbox shell (no CA bundle → TLS fails; and it bypasses the proxy path the app actually uses, so results mislead).

1. After saving a hook, check logs for `SyntaxError` before testing behavior: `/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/logs`
2. Call the route once and branch on shape: `200`+bytes (ok) / `4xx-5xx`+`detail` (fix URL or headers).
3. Report only `status`, `size`, and the first 1–2 bytes (`50 4b` = ZIP/XLSX, `ef bb bf` = UTF-8 CSV, `3c` = HTML error). Never paste page HTML or file bytes — it floods context and tells you nothing the first bytes don't.

## Handoff

`diagnostics/binary-download-or-file-parse-fails.md` when download works but parsing fails. `diagnostics/external-api-auth-cors-or-proxy-fails.md` when the source is an OpenAPI endpoint or an upstream auth/CORS problem.

# PocketBase Files, Binary Responses, And Logs

## File Storage

Use PocketBase `file` fields for files stored with app records. Store metadata such as filename, size, and parse status in normal fields. Do not store large file contents in text fields.

## PocketBase JSVM Constraints (read before writing any route)

The runtime is PocketBase 0.31 on the Goja JS engine. Three constraints break naive hooks. Follow them or the route crashes on load or times out at request time.

1. **Handlers run in an isolated scope.** A `routerAdd(...)` handler cannot see file-scope `function`/`var`/`const`. Keep every helper, constant, and `require(...)` INSIDE the handler body. A top-level helper called from the handler fails at request time with `<name> is not defined`. (A misplaced top-level `return` makes the whole bundle fail to load with `Illegal return statement`, which crashes PocketBase on startup and restart-loops the pod.)
2. **Never stringify a large response body byte-by-byte.** A byte-wise `String.fromCharCode` append loop over a ~150KB page is O(n^2) in Goja and times out. Search the raw byte array for the marker you need, then convert only a small window (a few hundred bytes) around that offset.
3. **Decode text/JSON bytes as UTF-8.** A byte-wise `String.fromCharCode` loop treats each byte as a character and corrupts Korean filenames, Gmail subjects, Sheet values, Notion titles, and provider error messages. Use the UTF-8 decoder in `references/pocketbase/jsvm-hooks-and-routes.md` before parsing or saving text.
4. **Read request input with the typed helpers.** Use `e.request.url.query().get("x")` for query params and `e.requestInfo().body` for a parsed JSON body. Do not hand-roll `e.request.body.read()` byte loops.

## Binary Download Forwarding

When a server-side download needs secret headers, cookies, or platform proxying, use a PocketBase route. Keep helpers and `require(...)` inside the handler (see constraints above).

```js
routerAdd("GET", "/api/download-report", (e) => {
  var runtimeProxy = require(`${__hooks}/_runtime_proxy.js`);
  var res = runtimeProxy.proxyFetch({
    url: "https://api.example.com/report.xlsx",
    method: "GET",
    headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  });

  if (res.statusCode < 200 || res.statusCode >= 300) {
    return e.json(res.statusCode, { error: "Download failed" });
  }

  return e.blob(
    200,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    res.body,
  );
});
```

Frontend code then uses:

```ts
import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

const response = await fetch(`${getRuntimeBase()}/api/download-report`);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const buffer = await response.arrayBuffer();
```

Do not wrap large binary files in JSON. Do not invent a body helper that is not in PocketBase types.
Do not call PocketBase routes from browser code with raw `/api/...` paths; Vite only proxies `__runtime`, so raw `/api` can hit the SPA fallback and return HTML. Use `getRuntimeBase()` for browser calls to PocketBase routes.

## Logs

Use PocketBase logs for hook load and runtime failures:

- `/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/logs`
- `/internal/coder/apps/${RUNTIME_APP_ID}/logs?service=pocketbase`

## Verification

- Verify response status and content type.
- Verify frontend receives an `ArrayBuffer`.
- Verify parser errors separately from network or hook errors.

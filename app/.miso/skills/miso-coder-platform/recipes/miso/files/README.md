# File Upload, Download, And Binary

## When To Use

Use this for user files, PocketBase file fields, MISO app file inputs, external binary downloads, data.go.kr file-data downloads, and spreadsheet preview/import.

## Surface Decision

| Need | Surface |
| --- | --- |
| Store a file with app record | PocketBase file field |
| Attach file to MISO app | MISO upload or `remote_url`/`local_file` |
| User-selected spreadsheet preview | Browser `File` and `ArrayBuffer` |
| Authenticated external binary | PocketBase hook with `proxyFetch`, return `e.blob` |
| data.go.kr file data | `recipes/integrations/datagokr/README.md` |

## Authenticated Binary Route

```js
routerAdd("GET", "/api/report-file", (e) => {
  var runtimeProxy = require(`${__hooks}/_runtime_proxy.js`);
  var res = runtimeProxy.proxyFetch({
    url: "https://api.example.com/report.xlsx",
    method: "GET",
    headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  });

  if (res.statusCode < 200 || res.statusCode >= 300) {
    return e.json(res.statusCode, { error: "Download failed" });
  }

  return e.blob(200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", res.body);
});
```

Frontend:

```ts
import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

const response = await fetch(`${getRuntimeBase()}/api/report-file`);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const buffer = await response.arrayBuffer();
```

## Verification

- Hook returns binary response, not JSON wrapping bytes.
- Frontend uses `ArrayBuffer`.
- Parser errors are separated from download errors.

## Common Wrong Paths

- Text-reading binary uploads.
- Large binary in JSON.
- Storing whole file content in text fields.
- Using invented PocketBase response helpers.

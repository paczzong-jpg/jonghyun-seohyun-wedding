---
name: pocketbase-runtime
description: Use when generated website apps need PocketBase persistence, collection schemas, browser CRUD, api/*.pb.js server hooks, custom PB routes, cron jobs, proxyFetch, app env vars in hooks (_runtime_env.js), hook reloads, or runtime database debugging.
compatibility: opencode
metadata:
  source: .miso/skills/pocketbase-runtime/SKILL.md
---

# PocketBase Runtime

Before making PocketBase runtime changes, read this entire SKILL.md. Do not edit collection schemas, browser CRUD persistence, `api/*.pb.js` hooks, external PB hook HTTP, `proxyFetch` usage, hook reload behavior, or PB record APIs from memory.

## Current PocketBase APIs

MISO Coder currently runs PocketBase `PB_VERSION=0.31.0`.

Use the current JSVM API shape:

| Need | Use |
| --- | --- |
| Read by id | `$app.findRecordById(collection, id)` |
| Read by field value | `$app.findFirstRecordByData(collection, field, value)` |
| List/filter records | `$app.findRecordsByFilter(collection, filter, sort, limit, offset)` |
| Create a record | `new Record(collection)` plus `record.set(field, value)` |
| Save created or updated record | `$app.save(record)` |
| Multi-write transaction | `$app.runInTransaction((txApp) => { ... })` |

If an online example disagrees with this table, inspect `/pb_data/types.d.ts` or the PocketBase v0.31.0 generated JSVM types first.

## Choose the Right Surface

| Need | Use |
| --- | --- |
| Browser read/write records | `src/lib/miso-sdk/runtime-client.ts` PocketBase SDK |
| Collection create/update | Internal runtime API with `${SM_INTERNAL_URL}` and `${RUNTIME_APP_ID}` |
| Server validation, enrichment, custom API route, cron | `api/*.pb.js` PocketBase hooks |
| External HTTP from browser code | Normal `fetch`; use `external-api` skill |
| External HTTP from PB hooks | Handler-local require of `_runtime_proxy.js`; do not call `$http.send()` directly |
| App env vars in PB hooks | Handler-local require of `_runtime_env.js`; secret values resolve only via `proxyFetch` |
| TypeScript record types | `.miso/bin/pb-typegen` after schema changes |

## Collection Schema

Never create or update collections from browser code. Use the sandbox-local internal runtime path:

```bash
BASE="${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api"

curl -fsS "${BASE}/collections" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "todos",
    "type": "base",
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "fields": [
      { "name": "title", "type": "text", "required": true },
      { "name": "done", "type": "bool" },
      { "name": "created", "type": "autodate", "onCreate": true, "onUpdate": false },
      { "name": "updated", "type": "autodate", "onCreate": true, "onUpdate": true }
    ]
  }'
```

The full collection endpoint is `${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections`.

These variables are sandbox command context, not user-configurable PB hook env. Do not copy them into `api/*.pb.js` as evidence that PocketBase supports app env injection.

Rules must be explicit empty strings when public app access is intended. Do not omit them and do not use `null`.

After schema changes:

```bash
.miso/bin/pb-typegen
```

## Browser CRUD

Use the managed runtime client:

```ts
import pb from "@/lib/miso-sdk/runtime-client";

const records = await pb.collection("todos").getFullList({
  sort: "-created",
  $autoCancel: false,
});

await pb.collection("todos").create({ title: "Write hook guide", done: false });
```

Do not call `/api/collections` with non-GET methods from browser code. Schema mutations through preview are blocked.

## PB Hook Files

Write server-side logic in `api/*.pb.js`.

Rules:
- `api/` is mounted into the PocketBase runtime as `pb_hooks`.
- Use `.pb.js` files only. Files load by filename sort order.
- Goja is not Node.js and not the browser: no npm packages, no `import`/`export`, no `async`/`await`.
- Call `e.next()` in request hooks when the default operation should continue.
- Throw an error or skip `e.next()` only when intentionally blocking the operation.
- Keep custom helper functions inside the handler unless you have verified a local module pattern in this runtime.
- Do not edit `api/_runtime_proxy.js`; it is platform-managed and re-injected.
- If you need the runtime proxy helper, require it inside the handler with ``require(`${__hooks}/_runtime_proxy.js`)``.

Basic validation hook:

```js
// api/todos_validate.pb.js
onRecordCreateRequest((e) => {
  var title = String(e.record.get("title") || "").trim();
  if (!title) {
    throw new ValidationError("title_required", "title is required");
  }

  e.record.set("title", title);
  return e.next();
}, "todos");
```

Custom route:

```js
// api/todos_routes.pb.js
routerAdd("GET", "/api/todos/recent", (e) => {
  var records = $app.findRecordsByFilter("todos", "", "-created", 20, 0);
  return e.json(200, records.map((record) => record.publicExport()));
}, $apis.requireAuth());
```

## External HTTP From Hooks

Do not call `$http.send()` directly from generated hooks. It may work at the PocketBase layer, but it bypasses the Session Manager outbound proxy path and skips request-level platform mediation such as SSRF guarding and internal header stripping.

Use the platform-managed `proxyFetch` helper for all external HTTP from PB hooks. PocketBase serializes each hook handler into an isolated context, so top-level functions from another hook file are not visible inside your handler. Do not import `proxyFetch`, and do not call a bare global `proxyFetch()`. Require the CommonJS helper inside the handler.

PocketBase 0.31.0 `$http.send` request body type is `string|FormData`. `proxyFetch` preserves the same practical request shapes through the platform proxy: string bodies and `FormData` bodies, normal methods, headers, timeouts, response status, response headers, response cookies, parsed JSON, and response body bytes.

### External API Patterns

Always check `res.statusCode` before using the response.

GET JSON:

```js
var runtimeProxy = require(`${__hooks}/_runtime_proxy.js`);
var res = runtimeProxy.proxyFetch({
  url: "https://api.example.com/items?limit=10",
  method: "GET",
  headers: { "Accept": "application/json" },
  timeout: 30,
});

if (res.statusCode >= 400) {
  throw new Error("external API failed: " + res.statusCode);
}

var items = res.json && res.json.items ? res.json.items : [];
```

POST JSON:

```js
var runtimeProxy = require(`${__hooks}/_runtime_proxy.js`);
var res = runtimeProxy.proxyFetch({
  url: "https://api.example.com/jobs",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  body: JSON.stringify({ title: e.record.get("title") }),
  timeout: 30,
});

if (res.statusCode < 200 || res.statusCode >= 300) {
  throw new Error("job create failed: " + res.statusCode);
}
```

Multipart/FormData upload:

```js
var runtimeProxy = require(`${__hooks}/_runtime_proxy.js`);
var form = new FormData();
form.append("title", e.record.get("title"));
form.append("document", $filesystem.fileFromBytes([65, 66, 67], "sample.txt"));

var res = runtimeProxy.proxyFetch({
  url: "https://api.example.com/upload",
  method: "POST",
  body: form,
  timeout: 60,
});

if (res.statusCode >= 400) {
  throw new Error("upload failed: " + res.statusCode);
}
```

For an authenticated external API that requires a private key, read the key from `_runtime_env.js` (see Environment Variables and Secrets) and pass it through `proxyFetch`; a secret resolves to its real value only on the proxy hop. Do not invent a separate secret transport, placeholder credential, or `$os.getenv(...)` name.

### Binary downloads

Use `res.body` bytes for downloaded files. Do not read binary responses from `res.json`.

```js
var runtimeProxy = require(`${__hooks}/_runtime_proxy.js`);
var res = runtimeProxy.proxyFetch({
  url: "https://api.example.com/export",
  method: "GET",
  timeout: 60,
});

if (res.statusCode >= 400) {
  throw new Error("download failed: " + res.statusCode);
}

// res.body is a byte array returned by PocketBase through proxyFetch.
// Store it in a PB file field or forward it as a binary body; do not JSON.parse it.
```

## PocketBase Logs

Use both PocketBase log surfaces before guessing at hook failures.

PocketBase DB/request logs are available through the internal runtime data proxy. Use them for request failures, `$app.logger()` output, and custom route errors that reached PocketBase request handling:

```bash
curl -G -fsS "${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/logs" \
  --data-urlencode "sort=-created" \
  --data-urlencode "perPage=50" \
  --data-urlencode "filter=(level>=4 || data.status>=400)"
```

PocketBase process logs are available through the app log API with the PocketBase service filter. Use them for hook load failures, hook reload failures, syntax error output, and errors such as `module is not defined` that happen before a request reaches `/api/logs`:

```bash
curl -G -fsS "${SM_INTERNAL_URL}/internal/coder/apps/${RUNTIME_APP_ID}/logs" \
  --data-urlencode "service=pocketbase" \
  --data-urlencode "limit=200"
```

Equivalent endpoint: `/internal/coder/apps/${RUNTIME_APP_ID}/logs?service=pocketbase&limit=200`.

If a hook change appears not to load, check the process logs first. Do not restart Vite to diagnose PocketBase hook load or reload errors.

## Environment Variables and Secrets

App environment variables (the ones saved in the website builder) are available to PB hooks through a platform-managed module. Read them with a handler-local require:

```js
routerAdd("GET", "/api/weather", (e) => {
  var env = require(`${__hooks}/_runtime_env.js`);
  var apiBase = env.API_BASE;            // non-secret: the real value
  var weatherKey = env.OPENWEATHER_KEY;  // secret: an opaque placeholder

  var runtimeProxy = require(`${__hooks}/_runtime_proxy.js`);
  var res = runtimeProxy.proxyFetch({
    url: apiBase + "/now?key=" + weatherKey,
    method: "GET",
    timeout: 30,
  });
  if (res.statusCode >= 400) {
    throw new Error("weather API failed: " + res.statusCode);
  }
  return e.json(200, res.json);
}, $apis.requireAuth());
```

`_runtime_env.js` is platform-managed and re-injected. Do not edit or delete it, and do not hardcode values that belong in app env.

Secrets are not delivered as real values. A secret env var resolves to its real value only when you pass it through `proxyFetch` for an outbound HTTP call; the Session Manager substitutes the real value on the proxy hop. Anywhere else — logging it, storing it in a record, a non-proxied call — a secret is an opaque placeholder with no usable value. Do not depend on reading a usable secret outside `proxyFetch`.

Process env is platform-only: `$os.getenv(...)` returns fixed platform runtime values, not app env. Do not use `$os.getenv("VITE_API_KEY")`, `$os.getenv("OPENAI_API_KEY")`, or similar user-var lookups in generated PB hooks — read app env from `_runtime_env.js` instead. Browser `.env`/`VITE_` keys appear in `_runtime_env.js` with the `VITE_` prefix stripped (`VITE_API_BASE` → `env.API_BASE`).

Use this rule:
- Non-secret public config: read from `_runtime_env.js` (or a PocketBase config collection).
- Secret API keys: read from `_runtime_env.js` and use only via `proxyFetch`; never hardcode them in hook code.
- Do not invent a secret transport, placeholder token, managed credential name, or env var convention beyond `_runtime_env.js`.
- If a hook requires arbitrary PB container env vars, treat it as unsupported platform work. PB container process env injection is not user-controllable; read app config from `_runtime_env.js` instead.

## Record API Patterns

Find and update:

```js
onRecordUpdateRequest((e) => {
  var existing = $app.findRecordById("todos", e.record.id);
  var wasDone = existing.getBool("done");
  var willBeDone = e.record.getBool("done");

  if (!wasDone && willBeDone) {
    e.record.set("completedAt", new DateTime().string());
  }

  return e.next();
}, "todos");
```

Create a related record:

```js
onRecordAfterCreateSuccess((e) => {
  var collection = $app.findCollectionByNameOrId("activity_logs");
  var log = new Record(collection);
  log.set("message", "todo created");
  log.set("todo", e.record.id);
  $app.save(log);
}, "todos");
```

Use transactions for multiple writes, and inside the callback use `txApp`, not `$app`:

```js
$app.runInTransaction((txApp) => {
  var todo = txApp.findRecordById("todos", "RECORD_ID");
  todo.set("done", true);
  txApp.save(todo);

  var collection = txApp.findCollectionByNameOrId("activity_logs");
  var log = new Record(collection);
  log.set("message", "todo completed");
  txApp.save(log);
});
```

## Hook Reload

pb_hooks reload automatically when `api/*.pb.js` changes. Auto-reload is verified on PocketBase 0.31.0: saving a hook file changed a custom route response from v1 to v2 in the same launched PocketBase process. PocketBase logs `File ... changed, restarting...` because it internally reloads the server/router.

No PocketBase restart is required from the agent. Do not restart the Vite dev server for hook reload problems.

Verification loop:
1. Save `api/todos_validate.pb.js`.
2. If testing a custom route, call it through the internal runtime data proxy:
   ```bash
   curl -fsS "${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/todos/recent"
   ```
3. If the old behavior remains, make a no-op save to the same hook file and retry once.
4. If `proxyFetch is not defined`, do not add an import and do not call it as a global. Use ``require(`${__hooks}/_runtime_proxy.js`)`` inside the handler. If the module is missing, verify `api/_runtime_proxy.js` exists and let the runtime ensure path re-inject it on the next runtime request.
5. If the route still behaves incorrectly, look for hook syntax/runtime errors; do not solve a hook reload issue by restarting Vite.

## Common Mistakes

| Mistake | Correct |
| --- | --- |
| `import { proxyFetch } from "./_runtime_proxy.js"` | Handler-local CommonJS require of `_runtime_proxy.js` |
| Bare global `proxyFetch(...)` | `runtimeProxy.proxyFetch(...)` after the handler-local require |
| Editing `_runtime_proxy.js` | Leave it managed |
| `async (e) => { await ... }` in hooks | Synchronous Goja APIs only |
| Missing `e.next()` in request hooks | Return `e.next()` unless intentionally blocking |
| Reading `e.auth` in after-success DB hooks | Use `*Request` hooks when request auth context is needed |
| Browser `fetch("/api/collections", { method: "POST" })` | Internal runtime API curl with `${SM_INTERNAL_URL}` |
| Restarting Vite to reload hooks | Save `api/*.pb.js`; PB hook reload is separate |

# PocketBase JSVM Hooks And Routes

## Runtime Model

PocketBase hooks in generated website apps run in Goja JavaScript inside PocketBase. They are not Node.js and not browser JavaScript.

## Hard Constraints

- Files must be named `api/*.pb.js`.
- Use CommonJS patterns.
- Do not use `import` or `export`.
- Do not use `async` or `await`.
- Do not use npm packages.
- Do not edit `api/_runtime_proxy.js`.
- Do not edit platform-managed runtime env helpers.
- Keep every helper, constant, and `require(...)` INSIDE the route handler. Handlers run in an isolated scope, so a top-level `function foo()` called from a handler throws `foo is not defined` at request time. A stray top-level `return` throws `Illegal return statement` and crashes the runtime on load (restart loop). The file must be only `routerAdd(...)` call(s).
- Do not stringify a large response body byte-by-byte: `out += String.fromCharCode(...)` over a ~150KB page is O(n^2) in Goja and times out. Search the raw byte array for the marker you need, then convert only a small window around it.
- Do not decode UTF-8 text/JSON with a byte-wise `String.fromCharCode` append loop. That corrupts Korean and other non-ASCII fields from provider APIs. Use a UTF-8 byte decoder before `JSON.parse`, record storage, or returning provider error text.
- Read request input with `e.request.url.query().get("x")` (query) and `e.requestInfo().body` (parsed JSON body), not hand-rolled `e.request.body.read()` loops.
- The batch API is bounded by platform settings (`maxRequests=50`, `timeout=5s`, `maxBodySize=1MiB`). Use it only for small UI mutations. For imports, syncs, files, or large record sets, loop inside `$app.runInTransaction` in a custom route and chunk requests from the frontend.

## Custom Routes

Use `routerAdd(method, path, handler)` for app-specific backend endpoints.

```js
routerAdd("GET", "/api/status", (e) => {
  return e.json(200, { ok: true });
});
```

## Route Auth Middleware

Use only the PocketBase 0.31 JSVM `$apis` middleware that exists in this runtime:

| Need | Use |
| --- | --- |
| Guest-only route for unauthenticated visitors | `$apis.requireGuestOnly()` |
| Authenticated app-user route | `$apis.requireAuth()` |
| Superuser/admin route | `$apis.requireSuperuserAuth()` |

Do not use `$apis.requireGuestAuth()`. That API does not exist in PocketBase 0.31.0 and prevents the runtime from loading hooks.

If a route must accept both signed-in and unsigned visitors, omit the auth middleware and validate the request explicitly inside the handler.

## Request Data APIs

Use the PocketBase 0.31 request APIs:

| Need | API |
| --- | --- |
| First query param value | `e.request.url.query().get("name")` |
| Parsed request info/body | `e.requestInfo()` / `e.requestInfo().body` |
| Path param from `/api/items/{id}` | `e.request.pathValue("id")` |
| Repeated query params | `JSON.parse(toString(e.request.url.query()))` and read the array |

Do not use `$apis.requestInfo(e)` in PocketBase 0.31 hooks. That older pattern is not exposed in the current JSVM binding.

## External HTTP From Hooks

Use the platform proxy helper inside the handler:

```js
routerAdd("POST", "/api/notify", (e) => {
  var runtimeProxy = require(`${__hooks}/_runtime_proxy.js`);
  var result = runtimeProxy.proxyFetch({
    url: "https://api.example.com/notify",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  });
  return e.json(result.statusCode, { statusCode: result.statusCode });
});
```

`proxyFetch` is required because MISO enforces outbound proxy, SSRF, and credential-substitution policy there. Do not call `$http.send()` directly in generated app hooks.

## UTF-8 Response Decoding

`proxyFetch` may return text/JSON responses as `body` bytes. Decode those bytes as UTF-8. Keep this helper inside the route handler that uses it.

```js
function bytesToUtf8(bytes) {
  var out = "";
  for (var i = 0; i < bytes.length; ) {
    var c = bytes[i++] & 255;
    if (c < 128) {
      out += String.fromCharCode(c);
    } else if (c >= 192 && c < 224 && i < bytes.length) {
      var c2 = bytes[i++] & 255;
      out += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
    } else if (c >= 224 && c < 240 && i + 1 < bytes.length) {
      var c3 = bytes[i++] & 255;
      var c4 = bytes[i++] & 255;
      out += String.fromCharCode(((c & 15) << 12) | ((c3 & 63) << 6) | (c4 & 63));
    } else if (c >= 240 && c < 248 && i + 2 < bytes.length) {
      var c5 = bytes[i++] & 255;
      var c6 = bytes[i++] & 255;
      var c7 = bytes[i++] & 255;
      var point = ((c & 7) << 18) | ((c5 & 63) << 12) | ((c6 & 63) << 6) | (c7 & 63);
      point -= 65536;
      out += String.fromCharCode(55296 + (point >> 10), 56320 + (point & 1023));
    } else {
      out += String.fromCharCode(65533);
    }
  }
  return out;
}

function bodyToText(res) {
  if (typeof res.text === "string") return res.text;
  if (typeof res.body === "string") return res.body;
  return bytesToUtf8(res.body || []);
}
```

## Reload Behavior

Saving `api/*.pb.js` should trigger PocketBase hook reload. No Vite dev-server restart is required.

The platform watches the hook source, stages it into a local runtime snapshot, and starts the PocketBase child process with that snapshot. If hook loading crashes PocketBase, the runtime reports `pocketbase_hook_load_failed`, quarantines the failed snapshot, and restores the last known good hook snapshot or an empty hook snapshot so the pod does not stay in CrashLoopBackOff.

Agents running in the sandbox can inspect the runtime state under `/workspace/.pocketbase/prod/runtime_state/`. Start with `last_hook_error.json`, use `last_hook_error.log` for the recent PocketBase stack, and use `quarantine/*/pocketbase.log` when you need the exact failed snapshot log.

## Verification

- Check hook syntax first.
- Check PocketBase logs for hook load errors.
- Confirm the route path and HTTP method match the frontend call.

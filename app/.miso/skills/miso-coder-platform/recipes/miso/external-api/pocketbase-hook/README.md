# External API From PocketBase Hook

## When To Use

Use this when an external API needs a private key, signed headers, backend-only request shaping, or a follow-up PocketBase write.

## Surface Decision

- `api/*.pb.js` owns the external request.
- `_runtime_env.js` provides app env placeholders as a plain CommonJS object.
- `proxyFetch` performs the outbound request and credential substitution.
- Frontend calls the route or reads saved records.

## Files To Inspect

- `api/README.md`
- `references/pocketbase/jsvm-hooks-and-routes.md`
- `references/pocketbase/records-schema-and-typegen.md`

## Files To Edit

- `api/<feature>.pb.js`
- App-owned frontend component or hook
- Collection schema through internal runtime API if storage is needed

## Hook Pattern

```js
routerAdd("POST", "/api/external-sync", (e) => {
  var runtimeEnv = require(`${__hooks}/_runtime_env.js`);
  var runtimeProxy = require(`${__hooks}/_runtime_proxy.js`);

  var apiKey = runtimeEnv.EXTERNAL_API_KEY;
  if (!apiKey) {
    return e.json(500, { error: "missing EXTERNAL_API_KEY" });
  }

  var upstream = runtimeProxy.proxyFetch({
    url: "https://api.example.com/items",
    method: "GET",
    headers: { Authorization: "Bearer " + apiKey },
  });

  if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
    return e.json(upstream.statusCode, { error: "External API failed" });
  }

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

  var collection = $app.findCollectionByNameOrId("external_api_results");
  var record = new Record(collection);
  record.set("payload", bodyToText(upstream));
  $app.save(record);

  return e.json(200, { ok: true, id: record.id });
});
```

If runtime env shape is unclear, inspect `api/_runtime_env.js`; in the managed MISO runtime it is `module.exports = { ... }`, so read values as `runtimeEnv.MY_KEY`. The rule is stable: do not read app secrets with OS env APIs and do not expose them to browser code.

When the upstream body is JSON or text, decode bytes as UTF-8 before `JSON.parse` or record storage. A byte-wise `String.fromCharCode` loop treats each byte as a character and corrupts Korean text in titles, subjects, filenames, Sheet values, and provider error messages.

## Verification

- PB route loads without syntax errors.
- External error status is returned as JSON.
- Saved record contains selected result fields, not the secret.
- Frontend reads the saved record with the PocketBase browser SDK.

## Common Wrong Paths

- Calling the external secret API from browser code.
- Calling `$http.send()` directly.
- Editing `_runtime_proxy.js`.
- Storing the secret in PocketBase.

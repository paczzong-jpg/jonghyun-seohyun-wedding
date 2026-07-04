# PocketBase Records, Schema, And Typegen

MISO Coder currently runs PocketBase `PB_VERSION=0.31.0`. If an online example disagrees with the APIs below, inspect `/pb_data/types.d.ts` or the generated JSVM types first.

## Current Record APIs

| Need | Use |
| --- | --- |
| Read by id | `$app.findRecordById(collection, id)` |
| Read by field value | `$app.findFirstRecordByData(collection, field, value)` |
| List/filter records | `$app.findRecordsByFilter(collection, filter, sort, limit, offset)` |
| Create a record | `new Record(collection)` plus `record.set(field, value)` |
| Save created or updated record | `$app.save(record)` |
| Multi-write transaction | `$app.runInTransaction((txApp) => { ... })` |

Inside a transaction callback, use `txApp`, not `$app`, for reads and writes that belong to the transaction.

## Browser CRUD

Use the managed browser client:

```ts
import pb from "@/lib/miso-sdk/runtime-client";

const records = await pb.collection("todos").getList(1, 20);
const created = await pb.collection("todos").create({ title: "New todo", done: false });
await pb.collection("todos").update(created.id, { done: true });
await pb.collection("todos").delete(created.id);
```

For concurrent requests to the same collection, pass `$autoCancel: false`.

## Batch API And Bulk Writes

The PocketBase batch API is enabled by the MISO runtime, but it is intentionally small:

- `maxRequests`: 50
- `timeout`: 5 seconds
- `maxBodySize`: 1 MiB

Treat `pb.createBatch()` / `POST /api/batch` as a convenience for small UI mutations only, such as saving a few related records from one user action. Do **not** use it for spreadsheet imports, data.go.kr syncs, file uploads, large JSON bodies, or hundreds/thousands of rows. Batch runs in one read/write transaction; large batches can queue other queries, trip the timeout, or exhaust memory.

For bulk create/update/delete, write a custom route that loops inside `$app.runInTransaction` and chunk calls from the frontend:

```js
routerAdd("POST", "/api/<feature>/upsert", function (e) {
  var rows = (e.requestInfo().body || {}).rows || [];
  var coll = $app.findCollectionByNameOrId("<collection>");
  $app.runInTransaction(function (tx) {
    for (var i = 0; i < rows.length; i++) {
      var rec = new Record(coll); // or tx.findFirstRecordByData(...) to upsert in place
      rec.set("field", rows[i].field);
      tx.save(rec);
    }
  });
  return e.json(200, { saved: rows.length });
});
```

Chunk large payloads on the client (e.g. 200-500 rows/call depending on row size). If a `pb.createBatch()` call fails with `Batch requests are not allowed`, treat that as runtime policy drift or a disabled override and switch to the custom route path above instead of trying to change settings from app code. Goja hook rules apply: keep helpers inside the handler, no `import`/`export`/`async`/`await`.

## Schema Changes

Collection schemas are platform-managed. Generated browser app code must not call collection mutation endpoints. Use the sandbox internal runtime API through `$SM_INTERNAL_URL`.

```bash
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name":"todos",
    "type":"base",
    "listRule":"",
    "viewRule":"",
    "createRule":"",
    "updateRule":"",
    "deleteRule":"",
    "fields":[
      {"name":"title","type":"text","required":true},
      {"name":"done","type":"bool"},
      {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
      {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
    ]
  }'
```

Two things that bite if you skip them:

- **Always include `created`/`updated` autodate fields** (shown above). PocketBase 0.23+ does not add them automatically, so a list query with `sort: "-created"` fails with HTTP 400 (unknown field) — and the UI silently shows nothing.
- **A collection PATCH replaces `fields` wholesale.** Adding a field by sending only the new field deletes every existing field (records keep only that field). Define all fields at creation, or send the full existing `fields` plus the new one when updating.

## Public App Rules

For generated public website app access, set `listRule`, `viewRule`, `createRule`, `updateRule`, and `deleteRule` to explicit empty strings. Missing or `null` rules require elevated auth and commonly cause `Token required`.

## Type Generation

After schema changes, run:

```bash
.miso/bin/pb-typegen
```

Generated types live in `src/types/pb-types.ts`.

## Verification

- List collections through the internal runtime path.
- Confirm rules are empty strings when public access is intended.
- Import generated record types from `src/types/pb-types.ts`.

# PocketBase CRUD And Schema

## When To Use

Use this for app-owned data persistence in generated website apps.

## Required References

- `recipes/pocketbase/README.md`
- `references/pocketbase/records-schema-and-typegen.md`
- `diagnostics/pocketbase-route-or-record-write-fails.md`

## Schema First

Create or update collections through the internal runtime API, not browser code. Public generated app collections need explicit empty rule strings.

```bash
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" \
  -d '{"name":"items","type":"base","listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"","fields":[{"name":"title","type":"text","required":true},{"name":"created","type":"autodate","onCreate":true,"onUpdate":false},{"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}]}'
```

Include `created` and `updated` autodate fields for base collections. PocketBase 0.23+ does not create them automatically, and `sort: "-created"` fails with HTTP 400 if the field is missing.

When updating a collection, `PATCH .../collections/<id>` replaces the full `fields` array. Send existing fields plus the new field; sending only the new field deletes the rest of the schema.

Run typegen after schema changes:

```bash
.miso/bin/pb-typegen
```

## Browser CRUD

```ts
import pb from "@/lib/miso-sdk/runtime-client";

export async function createItem(title: string) {
  return pb.collection("items").create({ title });
}

export async function listItems() {
  return pb.collection("items").getFullList({ sort: "-created" });
}

export async function updateItem(id: string, done: boolean) {
  return pb.collection("items").update(id, { done });
}

export async function deleteItem(id: string) {
  await pb.collection("items").delete(id);
}
```

## Concurrent Requests

For same-collection concurrent reads:

```ts
const [a, b] = await Promise.all([
  pb.collection("items").getOne(firstId, { $autoCancel: false }),
  pb.collection("items").getOne(secondId, { $autoCancel: false }),
]);
```

## Batch And Bulk Writes

The PocketBase batch API is intentionally small (`maxRequests=50`, `timeout=5s`, `maxBodySize=1MiB`). Use it only for small UI mutations. For imports, syncs, files, or large record sets, write a custom route that loops inside `$app.runInTransaction` and chunk requests from the frontend.

Do not try to raise batch limits from app code.

## Verification

- Collection exists.
- API rules are explicit empty strings when public access is intended.
- `created` and `updated` autodate fields exist before sorting by them.
- Types are regenerated.
- UI handles loading, empty, and error states.

## Common Wrong Paths

- Calling collection mutation endpoints from browser code.
- Omitting public rules and then treating `Token required` as a frontend bug.
- Sending only the new field when patching a collection.
- Using batch API for large imports.

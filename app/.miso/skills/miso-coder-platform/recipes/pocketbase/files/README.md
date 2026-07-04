# PocketBase Files

## When To Use

Use this when the generated app stores user-uploaded files with app-owned PocketBase records.

Use `recipes/miso/files/README.md` instead when the feature is a cross-surface binary workflow, such as authenticated external downloads, MISO app file inputs, spreadsheet parsing, or data.go.kr file data.

## Required References

- `recipes/pocketbase/README.md`
- `references/pocketbase/files-binary-and-logs.md`
- `references/pocketbase/records-schema-and-typegen.md`

## Schema

Create a collection with a PocketBase `file` field. Store metadata in normal fields and binary content in the file field.

```json
{
  "name": "documents",
  "type": "base",
  "listRule": "",
  "viewRule": "",
  "createRule": "",
  "updateRule": "",
  "deleteRule": "",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "attachment", "type": "file", "required": true, "maxSelect": 1 },
    { "name": "created", "type": "autodate", "onCreate": true, "onUpdate": false },
    { "name": "updated", "type": "autodate", "onCreate": true, "onUpdate": true }
  ]
}
```

## Browser Upload And URL

Use the managed PocketBase runtime client. For file fields, send `FormData`.

```ts
import pb from "@/lib/miso-sdk/runtime-client";

const form = new FormData();
form.append("title", title);
form.append("attachment", file);

const record = await pb.collection("documents").create(form);
const url = pb.files.getURL(record, record.attachment);
```

## Verification

- The collection has a `file` field for binary content.
- Browser code sends `FormData`.
- File URLs come from `pb.files.getURL(record, fileName)`.
- Large file contents are not copied into text fields or JSON payloads.

## Common Wrong Paths

- Reading binary files as text.
- Using `btoa`, base64 JSON, or text fields for large files.
- Calling raw `/api/files/...` paths instead of the PocketBase SDK.
- Using MISO app `/__api/files/upload` when the requirement is PocketBase file storage.

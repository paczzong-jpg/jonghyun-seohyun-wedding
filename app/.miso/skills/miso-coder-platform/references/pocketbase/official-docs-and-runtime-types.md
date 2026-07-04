# PocketBase Official Docs And Runtime Types

## Confirmed Version And Docs

- Runtime skill evidence: `PB_VERSION=0.31.0`.
- Official overview: https://pocketbase.io/docs/js-overview/
- Official routing: https://pocketbase.io/docs/js-routing/
- RequestEvent reference: https://pocketbase.io/jsvm/interfaces/core.RequestEvent.html
- HTTP request docs: https://pocketbase.io/docs/js-sending-http-requests/
- File helper reference: https://pocketbase.io/jsvm/functions/_filesystem.fileFromBytes.html

Always prefer the active runtime type file when available, usually `/pb_data/types.d.ts`. Official docs explain PocketBase behavior; MISO references explain the allowed sandbox surface.

## Current Record APIs

| Operation | API |
| --- | --- |
| Read by id | `$app.findRecordById(collection, id)` |
| List/filter records | `$app.findRecordsByFilter(collection, filter, sort, limit, offset)` |
| Save created or updated record | `$app.save(record)` |
| Multi-write transaction | `$app.runInTransaction((txApp) => { ... })` |

## RequestEvent Responses

Use `e.json(...)` for JSON responses and `e.blob(...)` for binary responses. Binary responses should forward bytes from the upstream response body.

## Unsupported Or Wrong Surfaces

- Do not use old DAO examples.
- Do not invent runtime globals.
- Do not use Node imports or npm packages inside hooks.
- Do not treat browser PocketBase SDK APIs as hook APIs.

## Verification

- Check `types.d.ts` if a method signature is unclear.
- Check PocketBase process logs when a hook fails to load.
- Check official docs only after confirming MISO sandbox constraints.

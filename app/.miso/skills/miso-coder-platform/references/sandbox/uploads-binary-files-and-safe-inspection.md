# Uploads, Binary Files, And Safe Inspection

## Denied Direct Reads

Generated app agents must not open uploaded documents, spreadsheets, images, media, or archives with text tools. The read policy denies PDF, DOCX, XLSX, images, audio, video, and archive formats.

## Correct Handling

| Need | Correct surface |
| --- | --- |
| User selected spreadsheet | Browser `File` and `ArrayBuffer` |
| External authenticated spreadsheet | PocketBase route returns binary response, frontend parses bytes |
| Image/file for MISO app | MISO file upload or `remote_url`/`local_file` |
| File persisted with app data | PocketBase file field |
| Human-readable summary of uploaded document | Isolated document/vision analysis, then use summary text |

## Wrong Paths

- Do not paste binary data into chat context.
- Do not convert large binary files into JSON payloads.
- Do not store entire file contents in PocketBase text fields.
- Do not modify `.miso/uploads` directly unless a platform recipe explicitly says so.

## Verification

- Confirm the app receives `ArrayBuffer`, `Blob`, `File`, or a file id depending on the path.
- Confirm parsing happens in the browser or a supported service, not through text-file reads.

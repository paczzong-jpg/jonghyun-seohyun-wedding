# Spreadsheet Import To Records

## When To Use

Use this when a user uploads or downloads spreadsheet data and wants rows displayed or saved to PocketBase.

For Korean Public Data Portal file downloads, read `recipes/integrations/datagokr/README.md` first. Those pages may label the data as CSV while the actual HTTP response is a ZIP container with CP949/EUC-KR CSV content.

## User-Uploaded Spreadsheet

Use the browser `File` object:

```ts
async function readSpreadsheetFile(file: File) {
  const buffer = await file.arrayBuffer();
  return buffer;
}
```

Parse in the browser with an approved dependency already present or permitted by package policy.

## External Authenticated Spreadsheet

1. Write a PocketBase route that downloads bytes through `proxyFetch`.
2. Return bytes with `e.blob`.
3. In frontend, call `response.arrayBuffer()`.
4. Parse and validate rows.
5. Write records with PocketBase browser SDK or a server route if validation must be server-side.

## Row Validation

Validate required columns before writing:

```ts
type ImportedRow = { name: string; amount: number };

function normalizeRow(row: Record<string, unknown>): ImportedRow {
  const name = String(row.name ?? "").trim();
  const amount = Number(row.amount);
  if (!name || !Number.isFinite(amount)) {
    throw new Error("Invalid spreadsheet row");
  }
  return { name, amount };
}
```

## Verification

- No binary file is opened with text tools.
- Parsed rows are validated before persistence.
- PocketBase schema has fields for normalized data, not the raw file body.

## Diagnostic Handoff

Use `diagnostics/binary-download-or-file-parse-fails.md`.

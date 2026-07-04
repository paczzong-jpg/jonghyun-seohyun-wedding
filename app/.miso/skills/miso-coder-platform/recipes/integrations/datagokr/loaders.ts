// data.go.kr file-data loaders — copy into src/lib/ (or import the parts you need).
//
// The container is decided by the first bytes, NOT the portal's format label or extension
// (measured: the label disagreed with the real file ~37% of the time; "CSV" is often a ZIP).
//
// deps: loadXlsx needs `exceljs`; loadZip and the XLSX detector need `fflate`.

import { getRuntimeBase } from "@/lib/miso-sdk/site-client";
import ExcelJS from "exceljs";
import { unzipSync } from "fflate";

/**
 * Download from your backend route (api/<feature>-file.pb.js).
 * `routePath` example: "/api/data-go-kr/trails-file"
 */
export async function downloadDataGoKr(routePath: string): Promise<Uint8Array> {
  const res = await fetch(`${getRuntimeBase()}${routePath}`);
  const ct = res.headers.get("content-type") || "";
  if (!res.ok || ct.includes("application/json")) {
    let message = `download failed: ${res.status}`;
    try {
      const info = await res.json();
      message = info?.reason || info?.detail || info?.error || message;
    } catch {
      // Non-JSON error bodies fall back to the HTTP status.
    }
    throw new Error(message);
  }
  return new Uint8Array(await res.arrayBuffer());
}

export type Container = "csv" | "xlsx" | "zip" | "html-error";

/** First-byte sniff. Caller picks the matching loader. */
export function sniffContainer(b: Uint8Array): Container {
  if (b[0] === 0x3c) return "html-error"; // '<' → HTML page came back, not data
  if (b[0] === 0x50 && b[1] === 0x4b) return isXlsx(b) ? "xlsx" : "zip"; // PK → XLSX or plain ZIP
  return "csv"; // text; encoding handled in loadCsv
}

/** XLSX is a PK/ZIP container too — distinguish it from a plain ZIP by its entries. */
export function isXlsx(b: Uint8Array): boolean {
  try {
    const names = Object.keys(unzipSync(b));
    return names.includes("[Content_Types].xml") && names.some((n) => n.startsWith("xl/"));
  } catch {
    return false;
  }
}

/** CSV bytes → text. BOM → UTF-8, otherwise CP949/EUC-KR (data.go.kr's default for Korean). */
export function loadCsv(b: Uint8Array): string {
  const hasBom = b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
  // browsers map the "euc-kr" label to the full CP949/MS949 set, which is what data.go.kr emits
  return new TextDecoder(hasBom ? "utf-8" : "euc-kr").decode(b);
}

/**
 * XLSX bytes → every sheet's rows. ExcelJS reads the original ArrayBuffer directly.
 * Gotchas handled here (verified against real data.go.kr files):
 *  - `row.values` is 1-based (index 0 is empty) → iterate from 1.
 *  - sparse/empty cells leave holes → coerce null/undefined to "".
 *  - empty rows are kept (`includeEmpty`) so the header-row position stays stable.
 * The header-row index, which sheet holds data, and column mapping vary per dataset —
 * decide those in the caller (don't assume sheet 0 or header row 1).
 */
export type Sheet = { name: string; rows: string[][] };
export async function loadXlsx(b: Uint8Array): Promise<Sheet[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(b as unknown as ArrayBuffer);
  return wb.worksheets.map((ws) => {
    const rows: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      const vals = row.values as unknown[]; // 1-based; [0] is empty
      const out: string[] = [];
      for (let c = 1; c < vals.length; c++) out.push(vals[c] == null ? "" : String(vals[c]));
      rows.push(out);
    });
    return { name: ws.name, rows };
  });
}

/**
 * ZIP bytes → entries. data.go.kr ZIPs usually hold one or more CSVs (sometimes plus an HWP
 * codebook). Sniff each entry again — most are CSV, decode with loadCsv. Entry filenames may
 * be CP949 too, so match by extension rather than by readable name.
 */
export function loadZip(b: Uint8Array): { name: string; bytes: Uint8Array }[] {
  const entries = unzipSync(b);
  return Object.keys(entries).map((name) => ({ name, bytes: entries[name] }));
}

// Example wiring (delete — shows how the pieces compose):
// const bytes = await downloadDataGoKr("/api/data-go-kr/trails-file");
// switch (sniffContainer(bytes)) {
//   case "csv":   parseCsv(loadCsv(bytes)); break;
//   case "xlsx": { const sheets = await loadXlsx(bytes); /* pick the data sheet + header row */ break; }
//   case "zip": {
//     const csv = loadZip(bytes).find((f) => /\.csv$/i.test(f.name));
//     if (csv) parseCsv(loadCsv(csv.bytes));
//     break;
//   }
//   case "html-error": throw new Error("dataset is a link-out, not a file download");
// }

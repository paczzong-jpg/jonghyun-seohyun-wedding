/**
 * bi-ingest — 파일·클립보드 → ParsedGrid (GOAL §6.2의 로드 경로, WASM 없이)
 *
 * CSV/TSV/XLSX/JSON을 지원한다. xlsx 라이브러리는 동적 import로만 로드해
 * 초기 번들에서 제외한다(GOAL §13.2 코드 스플리팅).
 */

import type { ParsedGrid } from "./bi-profile";
import { MAX_UPLOAD_ROWS } from "./bi-types";

export interface ParsedSource {
  fileName: string;
  /** XLSX 다중 시트일 때만 2개 이상 */
  sheetNames: string[];
  activeSheet: string;
  grid: ParsedGrid;
  /** 상한 초과로 잘린 행 수 */
  truncatedRows: number;
}

async function loadXlsx() {
  return import("xlsx");
}

function gridFromMatrix(matrix: unknown[][]): { grid: ParsedGrid; truncatedRows: number } {
  const nonEmpty = matrix.filter((row) =>
    row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""),
  );
  if (nonEmpty.length < 2) {
    throw new Error("헤더 행과 1개 이상의 데이터 행이 필요합니다.");
  }
  const headers = nonEmpty[0].map((c) => String(c ?? ""));
  const body = nonEmpty.slice(1);
  const truncatedRows = Math.max(0, body.length - MAX_UPLOAD_ROWS);
  return {
    grid: { headers, rows: body.slice(0, MAX_UPLOAD_ROWS) },
    truncatedRows,
  };
}

async function matrixFromWorkbook(
  workbook: import("xlsx").WorkBook,
  sheetName: string,
): Promise<unknown[][]> {
  const xlsx = await loadXlsx();
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`시트 "${sheetName}"를 찾을 수 없습니다.`);
  return xlsx.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  }) as unknown[][];
}

function parseJsonRows(text: string): unknown[][] {
  const parsed: unknown = JSON.parse(text);
  const arr = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null
      ? Object.values(parsed).find(Array.isArray)
      : undefined;
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error("JSON에서 객체 배열을 찾지 못했습니다.");
  }
  const keys: string[] = [];
  for (const item of arr.slice(0, 200)) {
    if (typeof item === "object" && item !== null) {
      for (const k of Object.keys(item)) if (!keys.includes(k)) keys.push(k);
    }
  }
  const rows = (arr as Record<string, unknown>[]).map((item) =>
    keys.map((k) => {
      const v = item?.[k];
      if (v !== null && typeof v === "object") return JSON.stringify(v);
      return v;
    }),
  );
  return [keys, ...rows];
}

export async function parseFile(file: File): Promise<ParsedSource> {
  const name = file.name;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "json") {
    const { grid, truncatedRows } = gridFromMatrix(parseJsonRows(await file.text()));
    return { fileName: name, sheetNames: [], activeSheet: "", grid, truncatedRows };
  }

  const xlsx = await loadXlsx();
  const workbook =
    ext === "csv" || ext === "tsv" || ext === "txt"
      ? xlsx.read(await file.text(), { type: "string", cellDates: true, dense: true })
      : xlsx.read(await file.arrayBuffer(), { type: "array", cellDates: true, dense: true });

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) throw new Error("워크시트를 찾지 못했습니다.");
  const activeSheet = sheetNames[0];
  const { grid, truncatedRows } = gridFromMatrix(await matrixFromWorkbook(workbook, activeSheet));
  return {
    fileName: name,
    sheetNames: sheetNames.length > 1 ? sheetNames : [],
    activeSheet,
    grid,
    truncatedRows,
    // 다중 시트 재선택을 위해 워크북 보관
    ...(sheetNames.length > 1 ? { workbook } : {}),
  } as ParsedSource & { workbook?: import("xlsx").WorkBook };
}

export async function pickSheet(source: ParsedSource, sheetName: string): Promise<ParsedSource> {
  const workbook = (source as ParsedSource & { workbook?: import("xlsx").WorkBook }).workbook;
  if (!workbook) return source;
  const { grid, truncatedRows } = gridFromMatrix(await matrixFromWorkbook(workbook, sheetName));
  return { ...source, activeSheet: sheetName, grid, truncatedRows };
}

/** 클립보드 텍스트 → 그리드 (TSV 우선, 아니면 CSV 추정) */
export async function parsePastedText(text: string): Promise<ParsedSource> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("붙여넣은 내용이 비어 있습니다.");
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const { grid, truncatedRows } = gridFromMatrix(parseJsonRows(trimmed));
      return { fileName: "붙여넣은 데이터", sheetNames: [], activeSheet: "", grid, truncatedRows };
    } catch {
      // JSON 실패 → 구분자 파싱으로 폴백
    }
  }
  const xlsx = await loadXlsx();
  const firstLine = trimmed.slice(0, trimmed.indexOf("\n") === -1 ? undefined : trimmed.indexOf("\n"));
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  const workbook = xlsx.read(trimmed, { type: "string", cellDates: true, dense: true, FS: delimiter });
  const sheet = workbook.SheetNames[0];
  const matrix = xlsx.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheet], {
    header: 1,
    defval: null,
    blankrows: false,
  }) as unknown[][];
  const { grid, truncatedRows } = gridFromMatrix(matrix);
  return { fileName: "붙여넣은 데이터", sheetNames: [], activeSheet: "", grid, truncatedRows };
}

export const ACCEPTED_EXTENSIONS = [".csv", ".tsv", ".txt", ".xlsx", ".xls", ".json"];

export function isAcceptedFile(file: File): boolean {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  return ACCEPTED_EXTENSIONS.includes(ext);
}

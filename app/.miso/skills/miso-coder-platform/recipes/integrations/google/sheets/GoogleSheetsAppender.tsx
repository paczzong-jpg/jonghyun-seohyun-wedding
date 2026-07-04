import { FormEvent, useState } from "react";

import { getGoogleAccessToken, GOOGLE_SHEETS_SCOPE } from "@/lib/googleAccessToken";
import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

type SheetsValuesResult = {
  ok?: boolean;
  range?: string;
  values?: unknown[][];
  spreadsheetId?: string;
  updates?: unknown;
  updatedCells?: number;
  error?: string;
  details?: unknown;
};

function parseCsvRow(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function GoogleSheetsAppender() {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [readRange, setReadRange] = useState("Sheet1!A1:D10");
  const [appendRange, setAppendRange] = useState("Sheet1!A:D");
  const [updateRange, setUpdateRange] = useState("Sheet1!A2:D2");
  const [rowCsv, setRowCsv] = useState("");
  const [updateCsv, setUpdateCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SheetsValuesResult | null>(null);

  async function readValues() {
    if (loading || !spreadsheetId.trim() || !readRange.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const accessToken = await getGoogleAccessToken(GOOGLE_SHEETS_SCOPE);
      const response = await fetch(`${getRuntimeBase()}/api/google/sheets/values/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          spreadsheetId,
          range: readRange,
        }),
      });
      const payload = (await response.json()) as SheetsValuesResult;
      setResult(response.ok ? payload : { error: payload.error || "Sheets read failed", details: payload.details });
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Sheets read failed" });
    } finally {
      setLoading(false);
    }
  }

  async function appendRow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const row = parseCsvRow(rowCsv);
    if (loading || !spreadsheetId.trim() || !appendRange.trim() || row.length === 0) return;
    setLoading(true);
    setResult(null);

    try {
      const accessToken = await getGoogleAccessToken(GOOGLE_SHEETS_SCOPE);
      const response = await fetch(`${getRuntimeBase()}/api/google/sheets/values/append`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          spreadsheetId,
          range: appendRange,
          values: [row],
          valueInputOption: "USER_ENTERED",
        }),
      });
      const payload = (await response.json()) as SheetsValuesResult;
      if (!response.ok) {
        setResult({ error: payload.error || "Sheets append failed", details: payload.details });
        return;
      }
      setResult(payload);
      setRowCsv("");
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Sheets append failed" });
    } finally {
      setLoading(false);
    }
  }

  async function updateRow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const row = parseCsvRow(updateCsv);
    if (loading || !spreadsheetId.trim() || !updateRange.trim() || row.length === 0) return;
    setLoading(true);
    setResult(null);

    try {
      const accessToken = await getGoogleAccessToken(GOOGLE_SHEETS_SCOPE);
      const response = await fetch(`${getRuntimeBase()}/api/google/sheets/values/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          spreadsheetId,
          range: updateRange,
          values: [row],
          valueInputOption: "USER_ENTERED",
        }),
      });
      const payload = (await response.json()) as SheetsValuesResult;
      setResult(response.ok ? payload : { error: payload.error || "Sheets update failed", details: payload.details });
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Sheets update failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <label>
        Spreadsheet ID
        <input value={spreadsheetId} onChange={(event) => setSpreadsheetId(event.target.value)} required />
      </label>

      <div>
        <label>
          Read range
          <input value={readRange} onChange={(event) => setReadRange(event.target.value)} required />
        </label>
        <button type="button" onClick={readValues} disabled={loading || !spreadsheetId.trim() || !readRange.trim()}>
          {loading ? "Loading..." : "Read range"}
        </button>
      </div>

      <form onSubmit={appendRow}>
        <label>
          Append range
          <input value={appendRange} onChange={(event) => setAppendRange(event.target.value)} required />
        </label>
        <label>
          Row values
          <input value={rowCsv} onChange={(event) => setRowCsv(event.target.value)} placeholder="name, email, memo" />
        </label>
        <button type="submit" disabled={loading || !spreadsheetId.trim() || parseCsvRow(rowCsv).length === 0}>
          {loading ? "Appending..." : "Append row"}
        </button>
      </form>

      <form onSubmit={updateRow}>
        <label>
          Update range
          <input value={updateRange} onChange={(event) => setUpdateRange(event.target.value)} required />
        </label>
        <label>
          Replacement row
          <input
            value={updateCsv}
            onChange={(event) => setUpdateCsv(event.target.value)}
            placeholder="new name, new email, new memo"
          />
        </label>
        <button type="submit" disabled={loading || !spreadsheetId.trim() || parseCsvRow(updateCsv).length === 0}>
          {loading ? "Updating..." : "Update range"}
        </button>
      </form>

      {result?.error ? <p role="alert">{result.error}</p> : null}
      {result?.values ? <pre>{JSON.stringify(result.values, null, 2)}</pre> : null}
      {result?.updates ? <pre>{JSON.stringify(result.updates, null, 2)}</pre> : null}
      {typeof result?.updatedCells === "number" ? <p>Updated {result.updatedCells} cells</p> : null}
    </section>
  );
}

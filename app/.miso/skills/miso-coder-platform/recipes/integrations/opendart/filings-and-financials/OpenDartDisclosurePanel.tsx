import { useState } from "react";

import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

type LoadState = "idle" | "loading" | "loaded" | "error";

type OpenDartEnvelope<T> = {
  ok?: boolean;
  status?: string;
  message?: string;
  error?: string;
  data?: T;
};

type Filing = {
  corp_code?: string;
  corp_name?: string;
  stock_code?: string;
  report_nm?: string;
  rcept_no?: string;
  rcept_dt?: string;
  corp_cls?: string;
};

type AccountRow = {
  account_nm?: string;
  fs_nm?: string;
  sj_nm?: string;
  thstrm_amount?: string;
  frmtrm_amount?: string;
  currency?: string;
};

function todayCompact() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function yearAgoCompact() {
  var d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function readJson<T>(response: Response): Promise<OpenDartEnvelope<T>> {
  try {
    return (await response.json()) as OpenDartEnvelope<T>;
  } catch {
    return { ok: false, error: `Unexpected response: ${response.status}` };
  }
}

export function OpenDartDisclosurePanel() {
  const [corpCode, setCorpCode] = useState("00126380");
  const [bgnDe, setBgnDe] = useState(yearAgoCompact());
  const [endDe, setEndDe] = useState(todayCompact());
  const [bsnsYear, setBsnsYear] = useState(String(new Date().getFullYear() - 1));
  const [reprtCode, setReprtCode] = useState("11011");
  const [status, setStatus] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [filings, setFilings] = useState<Filing[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);

  async function loadFilings() {
    setStatus("loading");
    setMessage("");
    setAccounts([]);

    const params = new URLSearchParams({
      corpCode: corpCode.trim(),
      bgnDe: bgnDe.trim(),
      endDe: endDe.trim(),
      pageCount: "20",
    });
    const response = await fetch(`${getRuntimeBase()}/api/opendart/filings` + `?${params.toString()}`);
    const data = await readJson<{ list?: Filing[] }>(response);

    if (!response.ok || (!data.ok && data.status !== "013")) {
      setStatus("error");
      setMessage(data.message || data.error || "OpenDART filing search failed");
      return;
    }

    setFilings(data.data?.list || []);
    setStatus("loaded");
    setMessage(data.status === "013" ? "No filings found" : data.message || "Loaded filings");
  }

  async function loadSingleAccount() {
    setStatus("loading");
    setMessage("");
    setFilings([]);

    const params = new URLSearchParams({
      corpCode: corpCode.trim(),
      bsnsYear: bsnsYear.trim(),
      reprtCode,
    });
    const response = await fetch(`${getRuntimeBase()}/api/opendart/single-account` + `?${params.toString()}`);
    const data = await readJson<{ list?: AccountRow[] }>(response);

    if (!response.ok || (!data.ok && data.status !== "013")) {
      setStatus("error");
      setMessage(data.message || data.error || "OpenDART financial statement lookup failed");
      return;
    }

    setAccounts(data.data?.list || []);
    setStatus("loaded");
    setMessage(data.status === "013" ? "No financial rows found" : data.message || "Loaded financial rows");
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <label className="block text-sm font-medium">
          Corp code
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 font-mono"
            inputMode="numeric"
            maxLength={8}
            value={corpCode}
            onChange={(event) => setCorpCode(event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Start date
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 font-mono"
            inputMode="numeric"
            maxLength={8}
            value={bgnDe}
            onChange={(event) => setBgnDe(event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          End date
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 font-mono"
            inputMode="numeric"
            maxLength={8}
            value={endDe}
            onChange={(event) => setEndDe(event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Business year
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 font-mono"
            inputMode="numeric"
            maxLength={4}
            value={bsnsYear}
            onChange={(event) => setBsnsYear(event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Report
          <select
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={reprtCode}
            onChange={(event) => setReprtCode(event.target.value)}
          >
            <option value="11011">Annual report</option>
            <option value="11013">Q1 report</option>
            <option value="11012">Half-year report</option>
            <option value="11014">Q3 report</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={status === "loading" || corpCode.trim().length !== 8}
          onClick={loadFilings}
          type="button"
        >
          {status === "loading" ? "Loading" : "Load filings"}
        </button>
        <button
          className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={status === "loading" || corpCode.trim().length !== 8 || bsnsYear.trim().length !== 4}
          onClick={loadSingleAccount}
          type="button"
        >
          Load financial rows
        </button>
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      {filings.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Report</th>
                <th className="px-3 py-2">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {filings.map((item) => (
                <tr className="border-t" key={item.rcept_no || `${item.corp_code}-${item.report_nm}`}>
                  <td className="px-3 py-2 font-mono">{item.rcept_dt}</td>
                  <td className="px-3 py-2">{item.corp_name}</td>
                  <td className="px-3 py-2">{item.report_nm}</td>
                  <td className="px-3 py-2 font-mono">{item.rcept_no}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {accounts.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Statement</th>
                <th className="px-3 py-2">Current</th>
                <th className="px-3 py-2">Previous</th>
              </tr>
            </thead>
            <tbody>
              {accounts.slice(0, 30).map((row, index) => (
                <tr className="border-t" key={`${row.account_nm}-${index}`}>
                  <td className="px-3 py-2">{row.account_nm}</td>
                  <td className="px-3 py-2">{row.fs_nm || row.sj_nm}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.thstrm_amount}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.frmtrm_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

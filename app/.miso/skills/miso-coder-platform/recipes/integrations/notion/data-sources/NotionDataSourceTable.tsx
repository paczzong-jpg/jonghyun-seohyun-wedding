import { useEffect, useState } from "react";

import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

type NotionPage = {
  id: string;
  url?: string;
  properties?: Record<string, unknown>;
};

function titleFromProperties(properties: Record<string, unknown> | undefined) {
  if (!properties) return "Untitled";
  for (const value of Object.values(properties)) {
    const prop = value as { type?: string; title?: Array<{ plain_text?: string }> };
    if (prop?.type === "title" && Array.isArray(prop.title)) {
      return prop.title.map((item) => item.plain_text || "").join("").trim() || "Untitled";
    }
  }
  return "Untitled";
}

export function NotionDataSourceTable() {
  const [items, setItems] = useState<NotionPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      const response = await fetch(`${getRuntimeBase()}/api/notion/data-sources/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageSize: 20 }),
      });
      const payload = await response.json().catch(() => ({}));
      if (cancelled) return;

      if (!response.ok || !payload.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Notion query failed");
        setLoading(false);
        return;
      }

      setItems(Array.isArray(payload.data?.results) ? payload.data.results : []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-sm text-slate-600">Loading Notion data</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Page</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className="border-t" key={item.id}>
              <td className="px-3 py-2">{titleFromProperties(item.properties)}</td>
              <td className="px-3 py-2">
                {item.url ? (
                  <a className="text-blue-600 underline" href={item.url} rel="noreferrer" target="_blank">
                    Open
                  </a>
                ) : (
                  item.id
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

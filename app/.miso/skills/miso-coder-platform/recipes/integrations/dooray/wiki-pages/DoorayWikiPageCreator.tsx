import { FormEvent, useState } from "react";

import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

type DoorayWikiResult = {
  ok?: boolean;
  id?: string;
  data?: unknown;
  error?: string;
  details?: unknown;
};

export function DoorayWikiPageCreator() {
  const [wikiId, setWikiId] = useState("");
  const [parentPageId, setParentPageId] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DoorayWikiResult | null>(null);

  async function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !wikiId.trim() || !parentPageId.trim() || !subject.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${getRuntimeBase()}/api/dooray/wiki/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wikiId,
          parentPageId,
          subject,
          content,
        }),
      });
      const payload = (await response.json()) as DoorayWikiResult;
      if (!response.ok || !payload.ok) {
        setResult({ error: payload.error || "Dooray wiki page creation failed", details: payload.details });
        return;
      }
      setResult(payload);
      setSubject("");
      setContent("");
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Dooray wiki page creation failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={createPage}>
      <label className="block text-sm font-medium">
        Wiki ID
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={wikiId}
          onChange={(event) => setWikiId(event.target.value)}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Parent page ID
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={parentPageId}
          onChange={(event) => setParentPageId(event.target.value)}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Subject
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Body
        <textarea
          className="mt-1 min-h-28 w-full rounded-md border px-3 py-2"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      <button
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={loading || !wikiId.trim() || !parentPageId.trim() || !subject.trim()}
        type="submit"
      >
        {loading ? "Creating" : "Create Dooray wiki page"}
      </button>
      {result?.error ? <p className="text-sm text-red-600">{result.error}</p> : null}
      {result?.id ? <p className="text-sm text-slate-600">Created page {result.id}</p> : null}
    </form>
  );
}

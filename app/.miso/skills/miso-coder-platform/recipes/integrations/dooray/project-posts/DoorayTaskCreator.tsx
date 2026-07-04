import { FormEvent, useState } from "react";

import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

type DoorayTaskResult = {
  ok?: boolean;
  id?: string;
  number?: number;
  data?: unknown;
  error?: string;
  details?: unknown;
};

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function DoorayTaskCreator() {
  const [projectId, setProjectId] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [toCsv, setToCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DoorayTaskResult | null>(null);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !projectId.trim() || !subject.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${getRuntimeBase()}/api/dooray/project/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          subject,
          content,
          to: parseCsv(toCsv),
          priority: "normal",
        }),
      });
      const payload = (await response.json()) as DoorayTaskResult;
      if (!response.ok || !payload.ok) {
        setResult({ error: payload.error || "Dooray task creation failed", details: payload.details });
        return;
      }
      setResult(payload);
      setSubject("");
      setContent("");
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Dooray task creation failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={createTask}>
      <label className="block text-sm font-medium">
        Project ID
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
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
      <label className="block text-sm font-medium">
        Assignee member IDs
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={toCsv}
          onChange={(event) => setToCsv(event.target.value)}
          placeholder="member-id-1, member-id-2"
        />
      </label>
      <button
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={loading || !projectId.trim() || !subject.trim()}
        type="submit"
      >
        {loading ? "Creating" : "Create Dooray task"}
      </button>
      {result?.error ? <p className="text-sm text-red-600">{result.error}</p> : null}
      {result?.id ? <p className="text-sm text-slate-600">Created task {result.id}</p> : null}
    </form>
  );
}

import { useState } from "react";

import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

type SaveState = "idle" | "saving" | "saved" | "error";

export function NotionPageCreator() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  async function createPage() {
    setStatus("saving");
    setMessage("");

    const response = await fetch(`${getRuntimeBase()}/api/notion/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      setStatus("error");
      setMessage(typeof data.error === "string" ? data.error : "Notion request failed");
      return;
    }

    setStatus("saved");
    setMessage(data.url ? `Saved: ${data.url}` : "Saved to Notion");
  }

  return (
    <section className="space-y-3">
      <label className="block text-sm font-medium">
        Title
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Content
        <textarea
          className="mt-1 min-h-28 w-full rounded-md border px-3 py-2"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      <button
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={!title.trim() || status === "saving"}
        onClick={createPage}
        type="button"
      >
        {status === "saving" ? "Saving" : "Save to Notion"}
      </button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}

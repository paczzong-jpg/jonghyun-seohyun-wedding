import { useState } from "react";

import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

export function SlackBotMessageSender() {
  const [channel, setChannel] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    setStatus("");
    const response = await fetch(`${getRuntimeBase()}/api/slack/bot-message/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, text }),
    });
    const payload = await response.json().catch(() => ({}));
    setSending(false);
    setStatus(response.ok && payload.ok ? `Sent ${payload.ts || ""}`.trim() : payload.error || "Slack send failed");
  }

  return (
    <section className="space-y-3">
      <input
        className="w-full rounded-md border px-3 py-2 text-sm"
        onChange={(event) => setChannel(event.target.value)}
        placeholder="Slack channel ID"
        value={channel}
      />
      <textarea
        className="min-h-24 w-full rounded-md border px-3 py-2 text-sm"
        onChange={(event) => setText(event.target.value)}
        value={text}
      />
      <button
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={!text.trim() || sending}
        onClick={send}
        type="button"
      >
        {sending ? "Sending" : "Send Slack Message"}
      </button>
      {status ? <p className="text-sm text-slate-600">{status}</p> : null}
    </section>
  );
}

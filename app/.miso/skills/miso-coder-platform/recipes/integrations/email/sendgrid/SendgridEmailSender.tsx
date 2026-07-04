import { useState } from "react";

import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

export function SendgridEmailSender() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    setStatus("");
    const response = await fetch(`${getRuntimeBase()}/api/email/sendgrid/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, text }),
    });
    const payload = await response.json().catch(() => ({}));
    setSending(false);
    setStatus(response.ok && payload.ok ? "Accepted by SendGrid" : payload.error || "Email failed");
  }

  return (
    <section className="space-y-3">
      <input className="w-full rounded-md border px-3 py-2 text-sm" onChange={(e) => setTo(e.target.value)} placeholder="To" value={to} />
      <input className="w-full rounded-md border px-3 py-2 text-sm" onChange={(e) => setSubject(e.target.value)} placeholder="Subject" value={subject} />
      <textarea className="min-h-24 w-full rounded-md border px-3 py-2 text-sm" onChange={(e) => setText(e.target.value)} value={text} />
      <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={!to || !subject || !text || sending} onClick={send} type="button">
        {sending ? "Sending" : "Send Email"}
      </button>
      {status ? <p className="text-sm text-slate-600">{status}</p> : null}
    </section>
  );
}

import { FormEvent, useState } from "react";

import { getGoogleAccessToken, GOOGLE_GMAIL_SEND_SCOPE } from "@/lib/googleAccessToken";
import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

type SendResult = {
  ok?: boolean;
  id?: string;
  threadId?: string;
  error?: string;
  details?: unknown;
};

export function GoogleGmailSender() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  async function sendMail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || !to.trim() || !subject.trim() || !bodyText.trim()) return;

    setSending(true);
    setResult(null);

    try {
      const accessToken = await getGoogleAccessToken(GOOGLE_GMAIL_SEND_SCOPE);
      const response = await fetch(`${getRuntimeBase()}/api/google/gmail/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          to,
          subject,
          bodyText,
        }),
      });

      const payload = (await response.json()) as SendResult;
      if (!response.ok) {
        setResult({ error: payload.error || "Gmail send failed", details: payload.details });
        return;
      }

      setResult(payload);
      setSubject("");
      setBodyText("");
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Gmail send failed" });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={sendMail}>
      <label>
        To
        <input value={to} onChange={(event) => setTo(event.target.value)} type="email" required />
      </label>
      <label>
        Subject
        <input value={subject} onChange={(event) => setSubject(event.target.value)} required />
      </label>
      <label>
        Message
        <textarea value={bodyText} onChange={(event) => setBodyText(event.target.value)} required />
      </label>
      <button type="submit" disabled={sending || !to.trim() || !subject.trim() || !bodyText.trim()}>
        {sending ? "Sending..." : "Send with Gmail"}
      </button>
      {result?.error ? <p role="alert">{result.error}</p> : null}
      {result?.ok ? <p>Sent message {result.id}</p> : null}
    </form>
  );
}

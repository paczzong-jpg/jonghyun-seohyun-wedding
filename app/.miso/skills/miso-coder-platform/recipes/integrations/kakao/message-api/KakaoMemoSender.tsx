import { useState } from "react";

import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

type KakaoMemoSenderProps = {
  accessToken: string;
};

export function KakaoMemoSender({ accessToken }: KakaoMemoSenderProps) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    setStatus("");
    const templateObject = {
      object_type: "text",
      text,
      link: {
        web_url: window.location.origin,
        mobile_web_url: window.location.origin,
      },
    };
    const response = await fetch(`${getRuntimeBase()}/api/kakao/message/send-me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, templateObject }),
    });
    const payload = await response.json().catch(() => ({}));
    setSending(false);
    setStatus(response.ok && payload.ok ? "Sent" : payload.error || "Kakao request failed");
  }

  return (
    <section className="space-y-3">
      <textarea
        className="min-h-24 w-full rounded-md border px-3 py-2 text-sm"
        onChange={(event) => setText(event.target.value)}
        value={text}
      />
      <button
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={!accessToken || !text.trim() || sending}
        onClick={send}
        type="button"
      >
        {sending ? "Sending" : "Send Kakao Memo"}
      </button>
      {status ? <p className="text-sm text-slate-600">{status}</p> : null}
    </section>
  );
}

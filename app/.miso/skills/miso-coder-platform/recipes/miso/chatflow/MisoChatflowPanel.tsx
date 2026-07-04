// Copy to src/components/miso/MisoChatflowPanel.tsx.
import { type FormEvent, useEffect, useRef, useState } from "react";

import { useMisoChatStream } from "@/lib/miso-sdk/miso-hooks";

type Turn = {
  role: "user" | "assistant";
  content: string;
};

interface MisoChatflowPanelProps {
  appId: string;
  inputs?: Record<string, unknown>;
}

export function MisoChatflowPanel({
  appId,
  inputs = {},
}: MisoChatflowPanelProps) {
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const { send, answer, conversationId, isStreaming, error, abort } =
    useMisoChatStream(appId);
  const committedAnswerRef = useRef("");

  useEffect(() => {
    if (isStreaming || !answer || committedAnswerRef.current === answer) return;
    setTurns((prev) => [...prev, { role: "assistant", content: answer }]);
    committedAnswerRef.current = answer;
  }, [answer, isStreaming]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isStreaming) return;

    setTurns((prev) => [...prev, { role: "user", content: message }]);
    committedAnswerRef.current = "";
    send(message, {
      conversationId: conversationId ?? undefined,
      inputs,
    });
    setDraft("");
  }

  return (
    <section aria-label="MISO chat">
      <ol>
        {turns.map((turn, index) => (
          <li key={`${turn.role}-${index}`}>
            <strong>{turn.role}</strong>
            <p>{turn.content}</p>
          </li>
        ))}
        {isStreaming && answer ? (
          <li>
            <strong>assistant</strong>
            <p>{answer}</p>
          </li>
        ) : null}
      </ol>
      {error ? <p role="alert">{error}</p> : null}
      <form onSubmit={submit}>
        <textarea
          aria-label="Message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" disabled={isStreaming || !draft.trim()}>
          Send
        </button>
        {isStreaming ? (
          <button type="button" onClick={abort}>
            Stop
          </button>
        ) : null}
      </form>
    </section>
  );
}

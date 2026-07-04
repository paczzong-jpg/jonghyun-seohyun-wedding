// Copy to src/components/miso/MisoAgentPanel.tsx.
import { type FormEvent, useState } from "react";

import { useMisoAgentStream } from "@/lib/miso-sdk/miso-hooks";

interface MisoAgentPanelProps {
  appId: string;
}

export function MisoAgentPanel({ appId }: MisoAgentPanelProps) {
  const [task, setTask] = useState("");
  const { send, answer, isStreaming, error, abort } =
    useMisoAgentStream(appId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTask = task.trim();
    if (!nextTask || isStreaming) return;
    send(nextTask);
    setTask("");
  }

  return (
    <section aria-label="MISO agent">
      <form onSubmit={submit}>
        <textarea
          aria-label="Agent task"
          value={task}
          onChange={(event) => setTask(event.target.value)}
        />
        <button type="submit" disabled={isStreaming || !task.trim()}>
          Run agent
        </button>
        {isStreaming ? (
          <button type="button" onClick={abort}>
            Stop
          </button>
        ) : null}
      </form>
      {isStreaming ? <p role="status">Agent is running...</p> : null}
      {answer ? <pre>{answer}</pre> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}

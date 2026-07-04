// Copy to src/components/miso/MisoWorkflowRunner.tsx.
import { type FormEvent, useState } from "react";

import { useMisoWorkflow } from "@/lib/miso-sdk/miso-hooks";

interface MisoWorkflowRunnerProps {
  workflowId: string;
}

export function MisoWorkflowRunner({ workflowId }: MisoWorkflowRunnerProps) {
  const [question, setQuestion] = useState("");
  const { run, data, isLoading, error } = useMisoWorkflow(workflowId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion || isLoading) return;
    await run({ question: nextQuestion });
  }

  return (
    <section aria-label="MISO workflow">
      <form onSubmit={submit}>
        <input
          aria-label="Workflow question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button type="submit" disabled={isLoading || !question.trim()}>
          Run workflow
        </button>
      </form>
      {isLoading ? <p role="status">Running workflow...</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {data ? (
        <pre>{JSON.stringify(data.data.outputs, null, 2)}</pre>
      ) : null}
    </section>
  );
}

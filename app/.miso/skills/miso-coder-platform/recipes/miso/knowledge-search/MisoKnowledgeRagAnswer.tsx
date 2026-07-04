// Copy to src/components/miso/MisoKnowledgeRagAnswer.tsx.
import { type FormEvent, useEffect, useState } from "react";

import { useMisoKnowledge } from "@/lib/miso-sdk/miso-hooks";
import {
  getMisoLLMConfig,
  useMisoLLM,
  type DirectLlmTargetModel,
} from "@/lib/miso-sdk/miso-llm";

interface MisoKnowledgeRagAnswerProps {
  datasetId: string;
}

export function MisoKnowledgeRagAnswer({
  datasetId,
}: MisoKnowledgeRagAnswerProps) {
  const [question, setQuestion] = useState("");
  const [targetModel, setTargetModel] = useState<DirectLlmTargetModel | null>(
    null,
  );
  const [configError, setConfigError] = useState<string | null>(null);
  const knowledge = useMisoKnowledge(datasetId);
  const llm = useMisoLLM();

  useEffect(() => {
    let cancelled = false;

    getMisoLLMConfig()
      .then((config) => {
        if (cancelled) return;
        const first = config.selected_models[0];
        if (!first) {
          setConfigError("No MISO LLM model is connected.");
          return;
        }
        setTargetModel({
          registeredProviderId: first.registered_provider_id,
          modelId: first.model_id,
        });
        setConfigError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setConfigError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion || !targetModel || knowledge.isLoading || llm.isLoading) {
      return;
    }

    const searchResult = await knowledge.search(nextQuestion, { topK: 5 });
    const snippets = searchResult.records
      .map((record, index) => `[${index + 1}] ${record.segment.content}`)
      .join("\n\n");

    await llm.send(
      `Answer the question using only the snippets below.\n\n${snippets}\n\nQuestion: ${nextQuestion}`,
      { targetModel },
    );
  }

  return (
    <section aria-label="MISO knowledge RAG answer">
      <form onSubmit={submit}>
        <textarea
          aria-label="Question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button
          type="submit"
          disabled={
            !targetModel || knowledge.isLoading || llm.isLoading || !question.trim()
          }
        >
          Answer
        </button>
      </form>
      {configError ? <p role="alert">{configError}</p> : null}
      {knowledge.error ? <p role="alert">{knowledge.error}</p> : null}
      {llm.error ? <p role="alert">{llm.error}</p> : null}
      {llm.data?.answer ? <pre>{llm.data.answer}</pre> : null}
    </section>
  );
}

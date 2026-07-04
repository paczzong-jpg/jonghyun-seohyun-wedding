// Copy to src/components/miso/MisoDirectLlmAsk.tsx.
import { type FormEvent, useEffect, useState } from "react";

import {
  getMisoLLMConfig,
  useMisoLLM,
  type DirectLlmTargetModel,
} from "@/lib/miso-sdk/miso-llm";

export function MisoDirectLlmAsk() {
  const [prompt, setPrompt] = useState("");
  const [targetModel, setTargetModel] = useState<DirectLlmTargetModel | null>(
    null,
  );
  const [configError, setConfigError] = useState<string | null>(null);
  const { send, data, isLoading, error } = useMisoLLM();

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
    const nextPrompt = prompt.trim();
    if (!nextPrompt || !targetModel || isLoading) return;
    await send(nextPrompt, { targetModel });
  }

  return (
    <section aria-label="MISO direct LLM">
      <form onSubmit={submit}>
        <textarea
          aria-label="Prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <button
          type="submit"
          disabled={isLoading || !targetModel || !prompt.trim()}
        >
          Ask
        </button>
      </form>
      {configError ? <p role="alert">{configError}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {data?.answer ? <pre>{data.answer}</pre> : null}
    </section>
  );
}

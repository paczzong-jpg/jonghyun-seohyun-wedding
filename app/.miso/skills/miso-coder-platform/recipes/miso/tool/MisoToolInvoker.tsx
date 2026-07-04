// Copy to src/components/miso/MisoToolInvoker.tsx.
import { type FormEvent, useState } from "react";

import { useMisoTool } from "@/lib/miso-sdk/miso-hooks";

type MisoToolProviderType = "builtin" | "api" | "workflow" | "mcp";

interface MisoToolInvokerProps {
  providerType: MisoToolProviderType;
  providerId: string;
  toolName: string;
  appId?: string;
  defaultParameters?: Record<string, unknown>;
}

export function MisoToolInvoker({
  providerType,
  providerId,
  toolName,
  appId,
  defaultParameters = {},
}: MisoToolInvokerProps) {
  const [parametersJson, setParametersJson] = useState(
    JSON.stringify(defaultParameters, null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const { invoke, data, isLoading, error } = useMisoTool(
    providerType,
    providerId,
    toolName,
    appId,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParseError(null);

    let parameters: Record<string, unknown>;
    try {
      parameters = JSON.parse(parametersJson) as Record<string, unknown>;
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
      return;
    }

    await invoke(parameters);
  }

  return (
    <section aria-label="MISO tool invocation">
      <form onSubmit={submit}>
        <textarea
          aria-label="Tool parameters JSON"
          value={parametersJson}
          onChange={(event) => setParametersJson(event.target.value)}
        />
        <button type="submit" disabled={isLoading}>
          Invoke tool
        </button>
      </form>
      {parseError ? <p role="alert">{parseError}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {data?.metadata.error ? (
        <p role="alert">Tool failed: {data.result}</p>
      ) : null}
      {data && !data.metadata.error ? <pre>{data.result}</pre> : null}
    </section>
  );
}

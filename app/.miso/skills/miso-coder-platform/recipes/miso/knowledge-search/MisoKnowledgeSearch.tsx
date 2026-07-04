// Copy to src/components/miso/MisoKnowledgeSearch.tsx.
import { type FormEvent, useState } from "react";

import { useMisoKnowledge } from "@/lib/miso-sdk/miso-hooks";

interface MisoKnowledgeSearchProps {
  datasetId: string;
}

export function MisoKnowledgeSearch({ datasetId }: MisoKnowledgeSearchProps) {
  const [query, setQuery] = useState("");
  const { search, results, isLoading, error } = useMisoKnowledge(datasetId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query.trim();
    if (!nextQuery || isLoading) return;
    await search(nextQuery, { topK: 5, scoreThreshold: 0.2 });
  }

  return (
    <section aria-label="MISO knowledge search">
      <form onSubmit={submit}>
        <input
          aria-label="Knowledge query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" disabled={isLoading || !query.trim()}>
          Search
        </button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      {results && results.records.length === 0 ? (
        <p role="status">No matching records.</p>
      ) : null}
      <ol>
        {results?.records.map((record, index) => (
          <li key={`${record.score}-${index}`}>
            <strong>{record.score.toFixed(3)}</strong>
            <p>{record.segment.content}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

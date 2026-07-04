# Knowledge Search And RAG

## When To Use

Use this for connected MISO datasets, knowledge search UI, or retrieval-augmented answers.

## Files To Inspect

- `.miso/specs/api-integration/*.md`
- `src/lib/miso-sdk/miso-hooks.ts`
- `references/miso/knowledge-search.md`
- `recipes/miso/llm/README.md` if generating an answer from retrieved chunks
- `MisoKnowledgeSearch.tsx` or `MisoKnowledgeRagAnswer.tsx` from this folder

## Search Pattern

Copy `MisoKnowledgeSearch.tsx` when the app needs a standalone search UI.

```tsx
import { useMisoKnowledge } from "@/lib/miso-sdk/miso-hooks";

export function KnowledgeSearch({ datasetId }: { datasetId: string }) {
  const { search, data, isLoading, error } = useMisoKnowledge(datasetId);

  async function run(query: string) {
    await search(query);
  }

  return null;
}
```

The `datasetId` is the hook argument and comes from `.miso/specs/api-integration/knowledge-{datasetId}.md`. Do not read it from `VITE_*`, local storage, app id, or LLM config.

`search()` returns score-sorted `records`; an empty `records` array is a normal no-result state.

## RAG Pattern

Copy `MisoKnowledgeRagAnswer.tsx` when the app should search first and then generate an answer with Direct LLM.

1. Search dataset.
2. Extract relevant snippets.
3. Build a prompt with snippets and the user question.
4. Send through MISO app or direct LLM helper.
5. Show citations or source labels when available.

## Verification

- Dataset id is real and comes from specs/context.
- Empty search results have a distinct UI state.
- Direct LLM target model is resolved before generation.
- Multiple datasets use multiple hook instances and merge results in app code.

## Common Wrong Paths

- Inventing dataset env variables.
- Adding raw backend auth headers.
- Treating empty results as network errors.
- Passing a dataset id where an app id is expected.

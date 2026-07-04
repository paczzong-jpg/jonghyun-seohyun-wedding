# MISO Knowledge Search

SDK source under `src/lib/miso-sdk/` wins over this reference.

## Connection Contract

When a dataset is connected to the Coder session, the platform issues the dataset token, stores it in the Session Manager token map, and generates `.miso/specs/api-integration/knowledge-{datasetId}.md`. App code only calls the hook. It does not configure auth headers or env vars.

## Hook

Use `useMisoKnowledge(datasetId)` from the managed SDK for connected dataset search.

Dataset IDs come from `.miso/specs/api-integration/*.md` or connected app context. Do not invent dataset ids or environment variable names.

The dataset id is the hook argument. It is not `VITE_MISO_KNOWLEDGE_ID`, `VITE_MISO_APP_ID`, local storage, or LLM config.

## Search Flow

1. Resolve the dataset id from specs or runtime-provided context.
2. Call the knowledge hook with a user query.
3. Render results with loading, empty, and error states.
4. If building RAG, pass the retrieved snippets into a MISO app call or direct LLM helper.

```ts
const { search, results, isLoading, error } = useMisoKnowledge(datasetId);
const response = await search("question", { topK: 5, scoreThreshold: 0.5 });
```

Response shape:

```json
{
  "query": { "content": "question" },
  "records": [
    {
      "segment": { "content": "matched chunk" },
      "score": 0.87
    }
  ]
}
```

`records` is score-sorted. An empty array is a valid no-result state, not a transport failure.

## Auth

The SDK/proxy handles token injection. Generated browser code should not add platform auth headers manually.

## Multiple Datasets

Use one hook instance per dataset and merge result arrays in app code if a UI searches multiple datasets. Do not combine dataset ids into one hook argument, and do not pass a dataset id where an app id is expected.

## Verification

- Empty result is not necessarily an error.
- Permission failures should be diagnosed through SDK error state and app/dataset configuration.
- Check response shape against `src/lib/miso-sdk/miso-hooks.ts`.
- Confirm dataset ids come from generated knowledge specs.

## Common Wrong Paths

| Wrong path | Result |
| --- | --- |
| `fetch("/ext/v1/datasets/...")` | Missing managed token behavior |
| Reading dataset id from `VITE_*` | Undefined or wrong id |
| Passing dataset id as app id | Wrong SDK route/semantic mismatch |
| Treating empty `records` as error | False failure UI |

# MISO Workflow

SDK source under `src/lib/miso-sdk/` wins over every example here. App-specific ids and input names come from `.miso/specs/api-integration/app-*.md`; if the static spec looks stale or empty, call `useMisoAppParams(appId)` and trust the runtime response.

## App Type

Use this reference for MISO `workflow` apps that run structured inputs and return structured outputs.

| app_type | Use | Streaming hook | Blocking hook | Response |
| --- | --- | --- | --- | --- |
| `workflow` | Workflow run | `useMisoWorkflowStream` | `useMisoWorkflow` | `data.outputs` |

## Output Shape

Blocking workflow results live under `data.outputs`.

```ts
const { run, data } = useMisoWorkflow(workflowId);
await run({ question: "Summarize this request" });
console.log(data?.data.outputs);
```

Do not read workflow results from the chat `answer` buffer.

## Streaming Workflow Events

Use `useMisoWorkflowStream(appId)` only when the UI needs node lifecycle events or incremental text. Register workflow handlers only for workflow-backed UIs.

```ts
send({
  inputs: { question },
  handlers: {
    onNodeStarted: (event) => {},
    onNodeFinished: (event) => {},
    onWorkflowFinished: (event) => {},
  },
});
```

## Input Value Shapes

Concrete input keys differ by workflow. Read the generated app spec or runtime app params; never guess the variable name.

| Input type | Value shape |
| --- | --- |
| `text-input`, `paragraph` | `string` |
| `number` | `number` |
| `select` | one option string |
| `file` | `{ type, transfer_method, url, upload_file_id }` |
| `file-list` | `Array<{ type, transfer_method, url, upload_file_id }>` |

## Auth And Routing

- SM proxy injects platform authorization for `/__api/*`.
- Do not hand-build platform auth headers in generated app code.
- Multi-app workspaces need the correct workflow app id.

## Verification

- Read the workflow app spec for app id and input names.
- Use runtime app params when the static spec looks stale.
- Confirm blocking results are read from `result.data.outputs`.
- Confirm streaming handlers are used only when the UI explicitly needs workflow events.

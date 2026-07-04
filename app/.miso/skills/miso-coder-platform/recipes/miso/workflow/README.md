# MISO Workflow

Use this recipe for MISO `workflow` apps that run structured inputs and return structured workflow outputs.

## Files To Inspect

- `.miso/specs/api-integration/app-*.md`
- `src/lib/miso-sdk/miso-hooks.ts`
- `references/miso/workflow.md`
- `MisoWorkflowRunner.tsx` from this folder

## Implementation

Copy `MisoWorkflowRunner.tsx` to an app-owned component path when the app should run a workflow and render `data.outputs`.

Use `useMisoWorkflow(appId)` for blocking workflow runs. Use `useMisoWorkflowStream(appId)` only when the UI needs node lifecycle events or incremental text.

## Verification

- Workflow app id and input keys come from the generated app spec.
- Blocking results are read from `result.data.outputs`.
- Streaming handlers are used only for workflow-backed UIs.

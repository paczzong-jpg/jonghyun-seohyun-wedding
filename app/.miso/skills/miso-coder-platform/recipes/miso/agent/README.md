# MISO Agent

Use this recipe for MISO `agent` apps. Agent apps use the same chat endpoint contract, but the recipe is separate because the user intent and UI state are different from chatflow.

## Files To Inspect

- `.miso/specs/api-integration/app-*.md`
- `src/lib/miso-sdk/miso-hooks.ts`
- `references/miso/agent.md`
- `MisoAgentPanel.tsx` from this folder

## Implementation

Copy `MisoAgentPanel.tsx` to an app-owned component path when the app should expose a task runner for a connected MISO Agent app.

Use `useMisoAgentStream(appId)` for streaming agent output. The SDK normalizes user-visible text into `answer`.

## Verification

- Agent app id comes from the generated app spec.
- UI does not expect stable tool traces from the default hook.
- Long-running state and stop behavior are visible.

# MISO Agent

SDK source under `src/lib/miso-sdk/` wins over every example here. App-specific ids, input names, and file variables come from `.miso/specs/api-integration/app-*.md`; if the static spec looks stale or empty, call `useMisoAppParams(appId)` and trust the runtime response.

## App Type

Use this reference for MISO `agent` apps. Agent apps use the same chat endpoint contract as chat apps, but they represent task-running UI and can emit agent-specific stream events.

| app_type | Use | Streaming hook | Blocking hook | Response |
| --- | --- | --- | --- | --- |
| `agent` | Tool-using agent | `useMisoChatStream` or `useMisoAgentStream` | `useMisoChat` or `useMisoAgent` | `answer` |

`useMisoAgentStream` and `useMisoAgent` are aliases for the chat hooks. They use the same endpoint and response contract.

## Agent Stream Events

Agent apps can emit mixed stream events. The SDK keeps the final user-visible answer in `answer`.

| Event | SDK behavior | UI rule |
| --- | --- | --- |
| `agent_message`, `message`, `text_chunk` | Appended to `answer` | Render `answer` |
| `message_replace` | Replaces `answer` | Render `answer` |
| `message_end` | Ends the current stream | Commit the completed turn |
| `agent_thought` | Ignored by the default hook | Do not expect tool traces in `answer` |

If a product needs tool-trace UI, the default hook does not expose it as a stable contract. Show a generic running state unless the SDK has been extended.

## Chat History Rule

Streaming hooks expose `answer` as the current turn's accumulated text. A new `send()` clears the current turn. Multi-turn UI must copy completed assistant turns into a separate `messages[]` state.

## Inputs Vs Files

`inputs` are app form variables. `files` are chat-message attachments and only apply when upload is enabled. Do not put file variables in the wrong payload field.

Concrete input keys differ by app. Read the spec or runtime app params; never guess the variable name.

## Auth And Routing

- SM proxy injects platform authorization for `/__api/*`.
- Do not hand-build platform auth headers in generated app code.
- Multi-app workspaces need the correct `appId`; passing it to SDK hooks preserves `X-Miso-App` routing.

## Verification

- Read the agent app spec for app id and input names.
- Use runtime app params when the static spec looks stale.
- Confirm the UI does not depend on stable tool traces from the default hook.
- Confirm completed streaming turns are copied out of volatile `answer` when the UI is multi-turn.

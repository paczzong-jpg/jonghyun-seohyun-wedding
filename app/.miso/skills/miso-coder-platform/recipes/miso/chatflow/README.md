# MISO Chatflow

Use this recipe for MISO `chat` and `advanced-chat` apps. These apps use chat-style request/response contracts and the streaming answer buffer from `useMisoChatStream(appId)`.

## Files To Inspect

- `.miso/specs/api-integration/app-*.md`
- `src/lib/miso-sdk/miso-hooks.ts`
- `references/miso/chatflow.md`
- `MisoChatflowPanel.tsx` from this folder

## Implementation

Copy `MisoChatflowPanel.tsx` to an app-owned component path when a full multi-turn chat UI is needed.

Use `inputs` for app form variables and `files` only for chat attachments. File variables from `user_input_form` belong under `inputs`.

## Advanced Chat

`advanced-chat` apps may emit workflow node events. Register stream handlers only when the app spec says the app is workflow-backed. Plain chat apps should render the normalized `answer` and committed `messages[]` state.

## Verification

- App id and input keys come from `.miso/specs/api-integration/app-*.md`.
- Multi-turn UI stores completed assistant turns outside the hook `answer`.
- File variables are placed in `inputs`, not guessed into `files[]`.

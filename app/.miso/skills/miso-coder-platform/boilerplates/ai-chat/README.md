# AI Chat Boilerplate

Production-grade Vite React overlay for a MISO chatbot service.

## What It Provides

- Conversation sidebar with pinned, archived, private, team, and public conversations.
- Per-user isolation through MISO account identity first, guest identity fallback second.
- PocketBase persistence for chat users, conversations, messages, feedback, artifacts, artifact versions, suggestions, and usage events.
- Runtime routing for MISO Direct LLM, Advanced Chat, and Agent apps.
- Direct LLM model selector sourced from `GET /__api/llm/config`.
- File upload support for Advanced Chat and Agent through `useMisoFileUpload`, plus Direct LLM image input.
- Streaming assistant messages with abort handling, saved partial responses, and stale stream recovery.
- Client-side tool orchestration for Direct LLM artifact actions through `useMisoLLMStream(..., { tools })`. The browser passes real `createArtifact`, `updateArtifact`, `editArtifact`, and `requestSuggestions` tool manifests to Direct LLM and executes tool calls against PocketBase.
- Vercel-style streaming canvas creation: `createArtifact` opens a streaming artifact row first, then the browser streams the artifact body into the canvas with Direct LLM before saving the final version.
- Slash commands and suggested actions for new chat, canvas, text, code, sheet, image, and artifact suggestions. Artifact slash commands are shortcuts, not the only canvas path.
- Artifact canvas for text/code/sheet/image outputs with editable version history, restore, copy, delete, suggestion apply, and suggestion resolution.
- AI SDK-style tool invocation state rendered with local AI Elements-style tool cards.
- Message actions for copy, thumbs up/down feedback, edit, regenerate, and "open in canvas".
- Reasoning display when the selected Direct LLM stream emits reasoning events.

The shell follows the durable patterns from Vercel's chatbot project while staying inside the MISO Vite overlay contract. Source reference: https://github.com/vercel/chatbot. Vercel chatbot is Apache License 2.0, Copyright 2024 Vercel, Inc.

## Copy

Copy this folder into a fresh generated app, preserving paths:

```text
api/setup_chat_collections.mjs
api/chat_hooks.pb.js
src/App.tsx
src/pages/ChatPage.tsx
src/components/ai-elements/*
src/components/chat/*
src/lib/*
```

Do not copy `src/components/ui`, `src/lib/miso-sdk`, lockfiles, or config files from another project.

## Runtime Setup

Create or update PocketBase collections:

```bash
node api/setup_chat_collections.mjs
```

Required environment:

- `SM_INTERNAL_URL`
- `RUNTIME_APP_ID` or `RUNTIME_CODEBASE_ID`

Optional app routing environment:

- `VITE_MISO_CHATFLOW_APP_ID` for Advanced Chat.
- `VITE_MISO_AGENT_APP_ID` for Agent.

Direct LLM uses the selected MISO managed model from `GET /__api/llm/config`.

## Files

| File | Purpose |
| --- | --- |
| `src/pages/ChatPage.tsx` | Runtime orchestration, provider routing, streaming persistence |
| `src/components/ai-elements/tool.tsx` | AI Elements-style tool part display for client tools |
| `src/components/chat/artifact-panel.tsx` | Canvas artifact editor, version history, restore, and suggestion apply panel |
| `src/lib/chat-store.ts` | PocketBase-first persistence with local fallback |
| `src/lib/chat-tool-protocol.ts` | Direct LLM artifact tool schemas and metadata readers |
| `src/lib/chat-identity.ts` | MISO current-user identity with guest fallback |
| `src/lib/chat-config.ts` | Endpoints, team seed labels, prompts |
| `api/setup_chat_collections.mjs` | PB schema and seed setup |
| `api/chat_hooks.pb.js` | PB default-value hook |

## Verification

- Confirm `node api/setup_chat_collections.mjs` creates `chat_users`, `chat_conversations`, `chat_messages`, `chat_feedback`, `chat_artifacts`, `chat_artifact_versions`, `chat_suggestions`, and `chat_usage_events`.
- Send one Direct LLM message and refresh the page; the conversation should remain.
- Ask Direct LLM for a durable document, code file, sheet, or image prompt without slash commands; the assistant should request the `createArtifact` tool, the message should show a tool card, and the canvas should open while content streams into the artifact.
- Ask for a small exact edit to an existing artifact; the assistant should prefer `editArtifact`, create a new version, and keep the older version restorable.
- Apply a suggestion from the canvas suggestion panel; the artifact should save a new version and mark the suggestion resolved.
- Use `/canvas`, `/code`, `/sheet`, and `/image`; each should bias Direct LLM toward the matching artifact tool and still fall back to opening an editable artifact if the model answers as plain text.
- Vote on an assistant message, edit a user message, regenerate an assistant answer, and open an answer in canvas.
- Attach an image while Direct LLM is selected and confirm the request uses the direct LLM image content path.
- Set `VITE_MISO_CHATFLOW_APP_ID`, switch to Advanced Chat, attach a file, and confirm the remote `conversation_id` is reused.
- Set `VITE_MISO_AGENT_APP_ID`, switch to Agent, and confirm streaming and abort both save a message.

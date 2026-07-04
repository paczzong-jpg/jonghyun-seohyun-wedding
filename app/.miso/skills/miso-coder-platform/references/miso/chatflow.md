# MISO Chatflow

SDK source under `src/lib/miso-sdk/` wins over every example here. App-specific ids, input names, and file variables come from `.miso/specs/api-integration/app-*.md`; if the static spec looks stale or empty, call `useMisoAppParams(appId)` and trust the runtime response.

## App Types

Use this reference for chat-style MISO apps:

| app_type | Use | Streaming hook | Blocking hook | Response |
| --- | --- | --- | --- | --- |
| `chat` | Chatbot | `useMisoChatStream` | `useMisoChat` | `answer` |
| `advanced-chat` | Workflow-backed chat | `useMisoChatStream` | `useMisoChat` | `answer` plus node events |

## Chat History Rule

Streaming hooks expose `answer` as the current turn's accumulated text. A new `send()` clears the current turn. Multi-turn UI must copy completed assistant turns into a separate `messages[]` state.

## Advanced Chat Node Events

`advanced-chat` apps may emit workflow node events. Register handlers only when the app type is workflow-backed.

```ts
send("message", {
  handlers: {
    onNodeStarted: (event) => {},
    onNodeFinished: (event) => {},
    onWorkflowFinished: (event) => {},
  },
});
```

Plain `chat` apps do not emit node lifecycle events.

## Inputs Vs Files

`inputs` are app form variables. `files` are chat-message attachments and only apply when upload is enabled. Do not put file variables in the wrong payload field.

Backend parses `inputs`, `query`, and optional `files` as separate request fields. A file variable from the app's `user_input_form` belongs under `inputs`; chat attachments belong under `files`.

## File Transfer Methods

Allowed values for generated app use:

- `remote_url`
- `local_file`

`tool_file` is platform-internal and must not be created by generated app code. Do not invent values such as `upload` or `base64`.

### `remote_url`

Use a real HTTP or HTTPS URL. The backend performs a HEAD/read path for remote files, so `data:*` URLs are invalid.

```ts
send("Analyze", {
  inputs: {
    image_input: {
      type: "image",
      transfer_method: "remote_url",
      url: "https://example.com/photo.jpg",
      upload_file_id: "",
    },
  },
});
```

### `local_file`

Upload browser-selected files through the MISO Service API helper, then pass the returned upload id.

```ts
const { upload } = useMisoFileUpload(appId);
const uploaded = await upload(selectedFile);

send("Analyze", {
  inputs: {
    image_input: {
      type: "image",
      transfer_method: "local_file",
      url: "",
      upload_file_id: uploaded.id,
    },
  },
});
```

Use `/__api/files/upload` through the SDK helper. Do not use PocketBase file upload as a substitute for MISO app file inputs.

`file-list` inputs receive an array of file-transfer objects.

## Input Value Shapes

| Input type | Value shape |
| --- | --- |
| `text-input`, `paragraph` | `string` |
| `number` | `number` |
| `select` | one option string |
| `file` | `{ type, transfer_method, url, upload_file_id }` |
| `file-list` | `Array<{ type, transfer_method, url, upload_file_id }>` |

Concrete input keys differ by app. Read the spec or runtime app params; never guess the variable name.

## Auth And Routing

- SM proxy injects platform authorization for `/__api/*`.
- Do not hand-build platform auth headers in generated app code.
- Multi-app workspaces need the correct `appId`; passing it to SDK hooks preserves `X-Miso-App` routing.

## Verification

- Read the app spec for app id, type, and input names.
- Use runtime app params when the static spec looks stale.
- Confirm streaming handlers only expect node events for workflow-backed chatflow apps.
- For file inputs, confirm whether the app expects `inputs.<key>` or `files[]`.
- Confirm completed streaming turns are copied out of volatile `answer`.

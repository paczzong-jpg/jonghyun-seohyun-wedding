import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Menu } from "lucide-react"
import { defineMisoLLMTools, getMisoLLMConfig, invokeMisoLLM, streamMisoLLM, useMisoLLMStream } from "@/lib/miso-sdk/miso-llm"
import type { DirectLlmContentPart, DirectLlmMessage, DirectLlmTargetModel, DirectLlmToolInvocation, DirectLlmToolSet } from "@/lib/miso-sdk/miso-llm"
import { useMisoAgentStream, useMisoChatStream, useMisoFileUpload } from "@/lib/miso-sdk/miso-hooks"
import type { MisoFileInput } from "@/lib/miso-sdk/miso-hooks"
import { Button } from "@/components/ui/button"
import { ArtifactPanel } from "@/components/chat/artifact-panel"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatHeader } from "@/components/chat/chat-header"
import { ConversationSidebar } from "@/components/chat/conversation-sidebar"
import { MessageList } from "@/components/chat/message-list"
import { ARTIFACT_SYSTEM_PROMPT, CHAT_COMMANDS, CHAT_ENDPOINTS, DEFAULT_ENDPOINT_ID, SUGGESTED_ACTIONS, SYSTEM_PROMPT } from "@/lib/chat-config"
import { resolveChatIdentity, saveChatIdentity } from "@/lib/chat-identity"
import {
  createArtifactInputSchema,
  editArtifactInputSchema,
  readToolInvocations,
  requestSuggestionsInputSchema,
  updateArtifactInputSchema,
} from "@/lib/chat-tool-protocol"
import type { CreateArtifactToolInput, EditArtifactToolInput, RequestSuggestionsToolInput, UpdateArtifactToolInput } from "@/lib/chat-tool-protocol"
import {
  addMessage,
  createArtifact,
  createArtifactSuggestion,
  createConversation,
  deleteArtifact,
  deriveConversationTitle,
  endpointById,
  ensureChatUser,
  listArtifactSuggestions,
  listArtifactVersions,
  listArtifacts,
  listConversations,
  listFeedback,
  listMessages,
  recordUsageEvent,
  replaceMessage,
  subscribeConversationMessages,
  updateArtifact,
  updateArtifactSuggestion,
  updateConversation,
  upsertFeedback,
} from "@/lib/chat-store"
import type {
  ArtifactKind,
  ArtifactSuggestion,
  AttachmentDraft,
  AttachmentMeta,
  ChatArtifact,
  ChatArtifactVersion,
  ChatCommand,
  ChatConversation,
  ChatEndpoint,
  ChatIdentity,
  ChatMessage,
  DirectModelSummary,
  FeedbackRating,
} from "@/lib/chat-types"
import { cn } from "@/lib/utils"

type ActiveRun = {
  conversationId: string
  messageId: string
  endpointId: string
  endpointKind: ChatEndpoint["kind"]
  text: string
  reasoning: string
  finished: boolean
  aborted: boolean
  toolInvocations: DirectLlmToolInvocation[]
  lastArtifactId?: string
  artifactKind?: ArtifactKind
  userText: string
}

type ParsedCommand = {
  command: ChatCommand | null
  cleanText: string
}

function pickEndpoint(endpointId: string): ChatEndpoint {
  return CHAT_ENDPOINTS.find((endpoint) => endpoint.id === endpointId) ?? endpointById(DEFAULT_ENDPOINT_ID)
}

function fileCategory(fileType: string): string {
  if (fileType.startsWith("image/")) return "image"
  if (fileType.startsWith("audio/")) return "audio"
  if (fileType.startsWith("video/")) return "video"
  return "document"
}

function attachmentMeta(draft: AttachmentDraft): AttachmentMeta {
  return {
    id: draft.id,
    name: draft.name,
    size: draft.size,
    type: draft.type,
    uploadFileId: draft.uploadFileId,
    url: draft.url,
  }
}

function eventConversationId(event: { conversation_id?: unknown; data?: unknown }): string | null {
  if (typeof event.conversation_id === "string" && event.conversation_id) return event.conversation_id
  if (!event.data || typeof event.data !== "object") return null
  const data = event.data as Record<string, unknown>
  return typeof data.conversation_id === "string" ? data.conversation_id : null
}

function directHistory(messages: ChatMessage[]): DirectLlmMessage[] {
  const result: DirectLlmMessage[] = []
  for (const message of messages) {
    if (message.status !== "done") continue
    if (message.role === "user") {
      result.push({ role: "user", content: message.content })
      continue
    }
    if (message.role !== "assistant") continue

    const toolInvocations = readToolInvocations(message.metadata)
    if (toolInvocations.length === 0) {
      result.push({ role: "assistant", content: message.content })
      continue
    }

    result.push({
      role: "assistant",
      content: message.content,
      toolCalls: toolInvocations.map((invocation) => ({
        id: invocation.toolCallId,
        name: invocation.toolName,
        arguments: JSON.stringify(invocation.input ?? {}),
      })),
    })
    for (const invocation of toolInvocations) {
      result.push({
        role: "tool",
        content:
          invocation.state === "output-error"
            ? JSON.stringify({ error: invocation.errorText ?? "tool error" })
            : JSON.stringify(invocation.output ?? null),
        toolCallId: invocation.toolCallId,
        name: invocation.toolName,
      })
    }
  }
  return result
}

function parseCommand(text: string): ParsedCommand {
  const match = text.match(/^\/([a-z-]+)\s*/i)
  if (!match) return { command: null, cleanText: text.trim() }
  const command = CHAT_COMMANDS.find((item) => item.label === `/${match[1]}`) ?? null
  if (!command) return { command: null, cleanText: text.trim() }
  return {
    command,
    cleanText: text.slice(match[0].length).trim(),
  }
}

function modelKey(model: DirectModelSummary): string {
  return `${model.registeredProviderId}:${model.modelId}`
}

function modelSummary(input: { registered_provider_id: string; model_id: string }): DirectModelSummary {
  return {
    registeredProviderId: input.registered_provider_id,
    modelId: input.model_id,
    label: `${input.registered_provider_id}/${input.model_id}`,
  }
}

function artifactLanguage(kind: ArtifactKind): string {
  if (kind === "code") return "tsx"
  if (kind === "sheet") return "csv"
  if (kind === "image") return "prompt"
  return "markdown"
}

function inferArtifactKind(message: ChatMessage): ArtifactKind {
  if (/```/.test(message.content)) return "code"
  if (/\|.+\|/.test(message.content) || /,+/.test(message.content)) return "sheet"
  if (/image prompt|이미지|사진|일러스트/i.test(message.content)) return "image"
  return "text"
}

function artifactTitle(text: string, kind: ArtifactKind): string {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find((line) => line.length > 0)
  const title = firstLine || `${kind} artifact`
  return title.length > 48 ? `${title.slice(0, 48)}...` : title
}

function extractArtifactContent(text: string, kind: ArtifactKind): string {
  if (kind !== "code") return text.trim()
  const match = text.match(/```[^\n]*\n([\s\S]*?)```/)
  return (match?.[1] ?? text).trim()
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
    reader.onerror = () => reject(reader.error ?? new Error("파일을 읽을 수 없습니다."))
    reader.readAsDataURL(file)
  })
}

async function directContentParts(text: string, drafts: AttachmentDraft[]): Promise<string | DirectLlmContentPart[]> {
  if (drafts.length === 0) return text
  const parts: DirectLlmContentPart[] = [{ type: "text", text }]
  for (const draft of drafts) {
    if (!draft.type.startsWith("image/")) throw new Error("Direct LLM 첨부는 이미지 파일만 지원합니다.")
    const dataUrl = await readFileAsDataUrl(draft.file)
    const [, base64Data = ""] = dataUrl.split(",", 2)
    parts.push({
      type: "image",
      mimeType: draft.type,
      base64Data,
      format: draft.type.split("/")[1] ?? "image",
      detail: "high",
    })
  }
  return parts
}

function directSystemPrompt(artifactKind: ArtifactKind | undefined, artifacts: ChatArtifact[]): string {
  const artifactContext = artifacts.length
    ? artifacts
        .slice(0, 8)
        .map((artifact) => `- ${artifact.id}: ${artifact.title} (${artifact.kind}, v${artifact.version})`)
        .join("\n")
    : "- none"
  const shortcut = artifactKind
    ? `The user selected the ${artifactKind} artifact shortcut. Prefer createArtifact with kind "${artifactKind}" when the request asks for a durable output.`
    : "Decide whether a client tool is useful. Use normal chat text for ordinary answers."

  return [
    ARTIFACT_SYSTEM_PROMPT,
    shortcut,
    "For createArtifact, prefer passing title, kind, and instruction. The browser streams the artifact body into canvas; only pass content when the user gave exact text to preserve verbatim.",
    "Use editArtifact for small targeted edits with exact oldString/newString. Use updateArtifact for full rewrites.",
    "Existing artifacts available for update or suggestions:",
    artifactContext,
  ].join("\n\n")
}

function artifactWriterSystemPrompt(kind: ArtifactKind): string {
  const base = "Create only the artifact body. Do not include chatty confirmations, tool JSON, or markdown fences unless the artifact itself needs them."
  if (kind === "code") return `${base}\nReturn complete source code only.`
  if (kind === "sheet") return `${base}\nReturn CSV or a compact markdown table.`
  if (kind === "image") return `${base}\nReturn an image-generation prompt plus concise alt text.`
  return `${base}\nMarkdown is supported. Use headings when useful.`
}

function artifactWriterUserPrompt(input: CreateArtifactToolInput, fallbackText: string): string {
  return [
    `Title: ${input.title}`,
    `Kind: ${input.kind}`,
    input.language ? `Format/language: ${input.language}` : "",
    input.instruction ? `Instruction: ${input.instruction}` : "",
    input.content ? `Verbatim or draft content to preserve:\n${input.content}` : "",
    !input.instruction && !input.content ? `Original user request:\n${fallbackText}` : "",
  ].filter(Boolean).join("\n\n")
}

function runMetadata(run: ActiveRun): Record<string, unknown> {
  return {
    aborted: run.aborted,
    reasoning: run.reasoning,
    endpointId: run.endpointId,
    endpointKind: run.endpointKind,
    artifactKind: run.artifactKind,
    toolInvocations: run.toolInvocations,
  }
}

function hasCreatedArtifactTool(run: ActiveRun): boolean {
  return run.toolInvocations.some((invocation) => invocation.toolName === "createArtifact" && invocation.state === "output-available")
}

export function ChatPage() {
  const [identity, setIdentity] = useState<ChatIdentity | null>(null)
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [artifacts, setArtifacts] = useState<ChatArtifact[]>([])
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null)
  const [artifactPanelOpen, setArtifactPanelOpen] = useState(false)
  const [artifactVersions, setArtifactVersions] = useState<ChatArtifactVersion[]>([])
  const [artifactSuggestions, setArtifactSuggestions] = useState<ArtifactSuggestion[]>([])
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<Record<string, FeedbackRating>>({})
  const [selectedEndpointId, setSelectedEndpointId] = useState(DEFAULT_ENDPOINT_ID)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [directModels, setDirectModels] = useState<DirectModelSummary[]>([])
  const [directModel, setDirectModel] = useState<DirectModelSummary | null>(null)
  const [draftValue, setDraftValue] = useState<string | null>(null)

  const advancedEndpoint = endpointById("advanced-chat")
  const agentEndpoint = endpointById("agent")
  const chatflow = useMisoChatStream(advancedEndpoint.appId)
  const agent = useMisoAgentStream(agentEndpoint.appId)
  const {
    send: sendDirectLlm,
    abort: abortDirectLlm,
    isStreaming: directLlmStreaming,
    error: directLlmError,
  } = useMisoLLMStream()
  const chatflowUpload = useMisoFileUpload(advancedEndpoint.appId)
  const agentUpload = useMisoFileUpload(agentEndpoint.appId)

  const messagesRef = useRef<ChatMessage[]>([])
  const artifactsRef = useRef<ChatArtifact[]>([])
  const activeArtifactIdRef = useRef<string | null>(null)
  const runRef = useRef<ActiveRun | null>(null)

  const selectedEndpoint = useMemo(() => pickEndpoint(selectedEndpointId), [selectedEndpointId])
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations],
  )
  const activeArtifact = useMemo(() => artifacts.find((artifact) => artifact.id === activeArtifactId) ?? null, [activeArtifactId, artifacts])
  const isStreaming = chatflow.isStreaming || agent.isStreaming || directLlmStreaming || Boolean(activeRunId)
  const streamError = runtimeError ?? chatflow.error ?? agent.error ?? directLlmError

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    artifactsRef.current = artifacts
  }, [artifacts])

  useEffect(() => {
    activeArtifactIdRef.current = activeArtifactId
  }, [activeArtifactId])

  const loadDirectModels = useCallback(async () => {
    const config = await getMisoLLMConfig()
    const summaries = config.selected_models.map(modelSummary)
    setDirectModels(summaries)
    setDirectModel((current) => current ?? summaries[0] ?? null)
    return summaries
  }, [])

  useEffect(() => {
    let mounted = true
    async function boot() {
      setLoading(true)
      const nextIdentity = await resolveChatIdentity()
      if (!mounted) return
      setIdentity(nextIdentity)
      await ensureChatUser(nextIdentity)
      void loadDirectModels().catch((error) => {
        if (mounted) setRuntimeError(error instanceof Error ? error.message : "Direct LLM 모델을 불러오지 못했습니다.")
      })
      const rows = await listConversations(nextIdentity)
      if (!mounted) return
      if (rows.length === 0) {
        const initialEndpoint = endpointById(DEFAULT_ENDPOINT_ID)
        const created = await createConversation({
          identity: nextIdentity,
          endpoint: initialEndpoint,
          visibility: "private",
        })
        setConversations([created])
        setActiveId(created.id)
        setMessages([])
      } else {
        setConversations(rows)
        setActiveId(rows[0].id)
        setSelectedEndpointId(rows[0].endpointId)
        setMessages(await listMessages(rows[0].id))
      }
      setLoading(false)
    }
    void boot()
    return () => {
      mounted = false
    }
  }, [loadDirectModels])

  useEffect(() => {
    if (!identity || !activeId) return
    const currentActiveId = activeId
    let cancelled = false
    let unsubscribe: (() => void) | null = null
    async function load() {
      const loaded = await listMessages(currentActiveId)
      const loadedArtifacts = await listArtifacts(currentActiveId)
      if (!cancelled) {
        setMessages(loaded)
        setArtifacts(loadedArtifacts)
        setActiveArtifactId((current) => (current && loadedArtifacts.some((artifact) => artifact.id === current) ? current : loadedArtifacts[0]?.id ?? null))
      }
      unsubscribe = await subscribeConversationMessages(currentActiveId, async () => {
        if (!cancelled) setMessages(await listMessages(currentActiveId))
      })
    }
    void load()
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [activeId, identity])

  useEffect(() => {
    if (!identity) return
    const currentIdentity = identity
    const messageIds = messages.filter((message) => message.role === "assistant").map((message) => message.id)
    let cancelled = false
    async function load() {
      const rows = await listFeedback(messageIds, currentIdentity.userKey)
      if (cancelled) return
      setFeedbackByMessageId(Object.fromEntries(rows.map((row) => [row.messageId, row.rating])))
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [identity, messages])

  useEffect(() => {
    if (!activeArtifact) {
      setArtifactVersions([])
      setArtifactSuggestions([])
      return
    }
    const currentArtifact = activeArtifact
    let cancelled = false
    async function load() {
      const [versions, suggestions] = await Promise.all([
        listArtifactVersions(currentArtifact.id),
        listArtifactSuggestions(currentArtifact.id),
      ])
      if (!cancelled) {
        setArtifactVersions(versions)
        setArtifactSuggestions(suggestions)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [activeArtifact])

  const refreshConversations = useCallback(
    async (nextActiveId?: string) => {
      if (!identity) return
      const rows = await listConversations(identity)
      setConversations(rows)
      if (nextActiveId) setActiveId(nextActiveId)
    },
    [identity],
  )

  const refreshArtifacts = useCallback(async (conversationId: string, nextActiveArtifactId?: string) => {
    const rows = await listArtifacts(conversationId)
    setArtifacts(rows)
    if (nextActiveArtifactId) {
      setActiveArtifactId(nextActiveArtifactId)
      setArtifactPanelOpen(true)
    }
  }, [])

  const ensureDirectModel = useCallback(async (): Promise<DirectLlmTargetModel> => {
    const current = directModel ?? directModels[0] ?? (await loadDirectModels())[0]
    if (!current) throw new Error("Direct LLM 모델이 선택되어 있지 않습니다.")
    setDirectModel(current)
    return {
      registeredProviderId: current.registeredProviderId,
      modelId: current.modelId,
    }
  }, [directModel, directModels, loadDirectModels])

  const uploadAttachments = useCallback(
    async (endpoint: ChatEndpoint, drafts: AttachmentDraft[], ownerKey: string): Promise<{ files: MisoFileInput[]; metas: AttachmentMeta[] }> => {
      if (drafts.length === 0) return { files: [], metas: [] }
      if (!endpoint.supportsFiles) throw new Error(`${endpoint.label}은 파일 첨부를 지원하지 않습니다.`)
      if (endpoint.kind === "direct-llm") {
        for (const draft of drafts) {
          if (!draft.type.startsWith("image/")) throw new Error("Direct LLM 첨부는 이미지 파일만 지원합니다.")
        }
        return { files: [], metas: drafts.map(attachmentMeta) }
      }
      const upload = endpoint.kind === "agent" ? agentUpload.upload : chatflowUpload.upload
      const metas: AttachmentMeta[] = []
      const files: MisoFileInput[] = []
      for (const draft of drafts) {
        const uploaded = await upload(draft.file, { filename: draft.name, user: ownerKey })
        metas.push({
          ...attachmentMeta(draft),
          uploadFileId: uploaded.id,
        })
        files.push({
          type: fileCategory(draft.type),
          transfer_method: "local_file",
          url: "",
          upload_file_id: uploaded.id,
        })
      }
      return { files, metas }
    },
    [agentUpload.upload, chatflowUpload.upload],
  )

  const patchArtifactPreview = useCallback((artifactId: string, patch: Partial<ChatArtifact>) => {
    setArtifacts((current) =>
      current.map((artifact) =>
        artifact.id === artifactId
          ? { ...artifact, ...patch, updatedAt: new Date().toISOString() }
          : artifact,
      ),
    )
  }, [])

  const streamArtifactContent = useCallback(
    async (artifact: ChatArtifact, input: CreateArtifactToolInput, run: ActiveRun): Promise<ChatArtifact> => {
      const targetModel = await ensureDirectModel()
      let content = ""
      try {
        await new Promise<void>((resolve, reject) => {
          streamMisoLLM({
            targetModel,
            systemPrompt: artifactWriterSystemPrompt(input.kind),
            messages: [{ role: "user", content: artifactWriterUserPrompt(input, run.userText) }],
          }, {
            onEvent: (event) => {
              if (event.event === "text_chunk" && typeof event.answer === "string") {
                content += event.answer
                patchArtifactPreview(artifact.id, { content, status: "streaming" })
              }
              if (event.event === "message_replace" && typeof event.answer === "string") {
                content = event.answer
                patchArtifactPreview(artifact.id, { content, status: "streaming" })
              }
            },
            onError: reject,
            onDone: () => resolve(),
          })
        })
      } catch (error) {
        const failed = await updateArtifact(artifact.id, {
          status: "error",
          metadata: { ...(artifact.metadata ?? {}), source: "direct_llm_tool_stream", error: error instanceof Error ? error.message : String(error) },
        })
        patchArtifactPreview(failed.id, failed)
        throw error
      }

      const finalContent = content.trim()
      if (!finalContent) throw new Error("Artifact stream returned empty content")
      const updated = await updateArtifact(artifact.id, {
        content: finalContent,
        language: input.language ?? artifact.language,
        status: "ready",
        metadata: { ...(artifact.metadata ?? {}), source: "direct_llm_tool_stream" },
      })
      patchArtifactPreview(updated.id, updated)
      await refreshArtifacts(run.conversationId, updated.id)
      setArtifactVersions(await listArtifactVersions(updated.id))
      return updated
    },
    [ensureDirectModel, patchArtifactPreview, refreshArtifacts],
  )

  const updateStreamingMessage = useCallback((messageId: string, content: string) => {
    setMessages((current) =>
      current.map((message) => (message.id === messageId ? { ...message, content, status: "streaming" } : message)),
    )
    void replaceMessage(messageId, { content, status: "streaming" })
  }, [])

  const syncRunMetadata = useCallback((run: ActiveRun) => {
    const metadata = runMetadata(run)
    setMessages((current) =>
      current.map((message) =>
        message.id === run.messageId ? { ...message, metadata: { ...(message.metadata ?? {}), ...metadata } } : message,
      ),
    )
    void replaceMessage(run.messageId, { metadata })
  }, [])

  const storeToolInvocation = useCallback(
    (invocation: DirectLlmToolInvocation) => {
      const run = runRef.current
      if (!run || run.finished) return
      run.toolInvocations = [
        ...run.toolInvocations.filter((item) => item.toolCallId !== invocation.toolCallId),
        invocation,
      ]
      syncRunMetadata(run)
    },
    [syncRunMetadata],
  )

  const artifactTools = useMemo<DirectLlmToolSet>(
    () =>
      defineMisoLLMTools({
        createArtifact: {
          description: "Create a durable artifact and stream its body into the chat canvas. Prefer instruction over full content unless preserving exact user-provided text.",
          inputSchema: createArtifactInputSchema,
          execute: async (rawInput) => {
            const run = runRef.current
            if (!identity || !run) throw new Error("채팅 실행 컨텍스트가 없습니다.")
            const input = rawInput as CreateArtifactToolInput
            const artifact = await createArtifact({
              conversationId: run.conversationId,
              ownerKey: identity.userKey,
              messageId: run.messageId,
              kind: input.kind,
              title: input.title,
              content: "",
              language: input.language ?? artifactLanguage(input.kind),
              status: "streaming",
              version: 0,
              metadata: {
                source: "direct_llm_tool_stream",
                instruction: input.instruction ?? "",
              },
            })
            run.lastArtifactId = artifact.id
            await refreshArtifacts(run.conversationId, input.open === false ? undefined : artifact.id)
            const completed = await streamArtifactContent(artifact, input, run)
            await recordUsageEvent({
              conversationId: run.conversationId,
              ownerKey: identity.userKey,
              eventType: "direct_llm_tool_create_artifact",
              metadata: { artifactId: completed.id, kind: completed.kind, streaming: true },
            })
            return {
              artifactId: completed.id,
              title: completed.title,
              kind: completed.kind,
              version: completed.version,
              message: `Created ${completed.kind} artifact "${completed.title}" in the canvas.`,
            }
          },
        },
        updateArtifact: {
          description: "Update the active or specified canvas artifact with replacement content, title, or language.",
          inputSchema: updateArtifactInputSchema,
          execute: async (rawInput) => {
            const run = runRef.current
            if (!identity || !run) throw new Error("채팅 실행 컨텍스트가 없습니다.")
            const input = rawInput as UpdateArtifactToolInput
            const artifactId = input.artifactId ?? run.lastArtifactId ?? activeArtifactIdRef.current ?? artifactsRef.current[0]?.id
            if (!artifactId) throw new Error("수정할 artifact가 없습니다.")
            const patch: Parameters<typeof updateArtifact>[1] = {
              status: "ready",
              metadata: {
                source: "direct_llm_tool_update",
              },
            }
            if (input.title !== undefined) patch.title = input.title
            if (input.content !== undefined) patch.content = input.content
            if (input.language !== undefined) patch.language = input.language
            const updated = await updateArtifact(artifactId, patch)
            run.lastArtifactId = updated.id
            await refreshArtifacts(run.conversationId, updated.id)
            await recordUsageEvent({
              conversationId: run.conversationId,
              ownerKey: identity.userKey,
              eventType: "direct_llm_tool_update_artifact",
              metadata: { artifactId: updated.id, kind: updated.kind },
            })
            return {
              artifactId: updated.id,
              title: updated.title,
              kind: updated.kind,
              version: updated.version,
              message: `Updated ${updated.kind} artifact "${updated.title}".`,
            }
          },
        },
        editArtifact: {
          description: "Make a targeted exact-string edit to the active or specified canvas artifact. Prefer this over updateArtifact for small changes.",
          inputSchema: editArtifactInputSchema,
          execute: async (rawInput) => {
            const run = runRef.current
            if (!identity || !run) throw new Error("채팅 실행 컨텍스트가 없습니다.")
            const input = rawInput as EditArtifactToolInput
            const artifactId = input.artifactId ?? run.lastArtifactId ?? activeArtifactIdRef.current ?? artifactsRef.current[0]?.id
            if (!artifactId) throw new Error("편집할 artifact가 없습니다.")
            const artifact = artifactsRef.current.find((item) => item.id === artifactId)
            if (!artifact) throw new Error("선택한 artifact를 찾을 수 없습니다.")
            if (!artifact.content.includes(input.oldString)) {
              throw new Error("oldString not found in artifact")
            }
            const content = input.replaceAll
              ? artifact.content.split(input.oldString).join(input.newString)
              : artifact.content.replace(input.oldString, input.newString)
            const updated = await updateArtifact(artifact.id, {
              content,
              status: "ready",
              metadata: {
                source: "direct_llm_tool_edit",
                oldString: input.oldString,
              },
            })
            run.lastArtifactId = updated.id
            await refreshArtifacts(run.conversationId, updated.id)
            setArtifactVersions(await listArtifactVersions(updated.id))
            await recordUsageEvent({
              conversationId: run.conversationId,
              ownerKey: identity.userKey,
              eventType: "direct_llm_tool_edit_artifact",
              metadata: { artifactId: updated.id, kind: updated.kind, replaceAll: Boolean(input.replaceAll) },
            })
            return {
              artifactId: updated.id,
              title: updated.title,
              kind: updated.kind,
              version: updated.version,
              message: `Edited ${updated.kind} artifact "${updated.title}".`,
            }
          },
        },
        requestSuggestions: {
          description: "Create an improvement suggestion for the active or specified canvas artifact.",
          inputSchema: requestSuggestionsInputSchema,
          execute: async (rawInput) => {
            const run = runRef.current
            if (!identity || !run) throw new Error("채팅 실행 컨텍스트가 없습니다.")
            const input = rawInput as RequestSuggestionsToolInput
            const artifactId = input.artifactId ?? run.lastArtifactId ?? activeArtifactIdRef.current ?? artifactsRef.current[0]?.id
            if (!artifactId) throw new Error("개선안을 만들 artifact가 없습니다.")
            const artifact = artifactsRef.current.find((item) => item.id === artifactId)
            if (!artifact) throw new Error("선택한 artifact를 찾을 수 없습니다.")
            let suggestedText = input.suggestedText
            if (!suggestedText) {
              const targetModel = await ensureDirectModel()
              const result = await invokeMisoLLM({
                targetModel,
                systemPrompt: SYSTEM_PROMPT,
                messages: [
                  {
                    role: "user",
                    content: [
                      `다음 ${artifact.kind} artifact에 대한 개선안을 하나 작성해줘.`,
                      input.instruction ? `요청: ${input.instruction}` : "",
                      artifact.content.slice(0, 12000),
                    ].filter(Boolean).join("\n\n"),
                  },
                ],
              })
              suggestedText = result.answer.trim()
            }
            const suggestion = await createArtifactSuggestion({
              artifactId: artifact.id,
              ownerKey: identity.userKey,
              description: input.description ?? input.instruction ?? "Direct LLM tool suggestion",
              originalText: input.originalText ?? artifact.content.slice(0, 50000),
              suggestedText,
            })
            if (activeArtifactIdRef.current === artifact.id) {
              setArtifactSuggestions((current) => [suggestion, ...current])
            }
            await recordUsageEvent({
              conversationId: run.conversationId,
              ownerKey: identity.userKey,
              eventType: "direct_llm_tool_suggestion",
              metadata: { artifactId: artifact.id, suggestionId: suggestion.id },
            })
            return {
              artifactId: artifact.id,
              suggestionId: suggestion.id,
              title: artifact.title,
              kind: artifact.kind,
              version: artifact.version,
              message: `Created suggestion for "${artifact.title}".`,
            }
          },
        },
      }),
    [ensureDirectModel, identity, refreshArtifacts, streamArtifactContent],
  )

  const appendPreview = useCallback(
    (conversationId: string, chunk: string) => {
      const run = runRef.current
      if (!run || run.conversationId !== conversationId || run.finished) return
      run.text += chunk
      updateStreamingMessage(run.messageId, run.text)
    },
    [updateStreamingMessage],
  )

  const replacePreview = useCallback(
    (conversationId: string, content: string) => {
      const run = runRef.current
      if (!run || run.conversationId !== conversationId || run.finished) return
      run.text = content
      updateStreamingMessage(run.messageId, run.text)
    },
    [updateStreamingMessage],
  )

  const appendReasoning = useCallback((conversationId: string, chunk: string) => {
    const run = runRef.current
    if (!run || run.conversationId !== conversationId || run.finished) return
    run.reasoning += chunk
    syncRunMetadata(run)
  }, [syncRunMetadata])

  const finishAssistant = useCallback(
    async (conversationId: string, status: "done" | "error", fallback?: string) => {
      const run = runRef.current
      if (!run || run.conversationId !== conversationId || run.finished) return
      run.finished = true
      const content = run.text.trim() || (run.toolInvocations.length > 0 ? "요청한 작업을 완료했습니다." : fallback || "")
      if (!identity) {
        runRef.current = null
        setActiveRunId(null)
        return
      }
      const saved = await replaceMessage(run.messageId, {
        content,
        status,
        metadata: runMetadata(run),
      })
      setMessages((current) => current.map((message) => (message.id === saved.id ? saved : message)))
      if (run.artifactKind && content && !hasCreatedArtifactTool(run)) {
        const artifact = await createArtifact({
          conversationId,
          ownerKey: identity.userKey,
          messageId: saved.id,
          kind: run.artifactKind,
          title: artifactTitle(content, run.artifactKind),
          content: extractArtifactContent(content, run.artifactKind),
          language: artifactLanguage(run.artifactKind),
          status: status === "done" ? "ready" : "error",
          metadata: {
            source: "assistant",
            endpointId: run.endpointId,
          },
        })
        await refreshArtifacts(conversationId, artifact.id)
      }
      await refreshConversations()
      runRef.current = null
      setActiveRunId(null)
    },
    [identity, refreshArtifacts, refreshConversations],
  )

  const handleNewConversation = useCallback(async () => {
    if (!identity) return
    const created = await createConversation({
      identity,
      endpoint: selectedEndpoint,
      visibility: "private",
    })
    setConversations((current) => [created, ...current])
    setActiveId(created.id)
    setMessages([])
    setArtifacts([])
    setArtifactVersions([])
    setActiveArtifactId(null)
    setArtifactPanelOpen(false)
    setSidebarOpen(false)
  }, [identity, selectedEndpoint])

  const handleSelectConversation = useCallback(
    async (id: string) => {
      const conversation = conversations.find((item) => item.id === id)
      setActiveId(id)
      if (conversation) setSelectedEndpointId(conversation.endpointId)
      setMessages(await listMessages(id))
      const rows = await listArtifacts(id)
      setArtifacts(rows)
      setArtifactVersions([])
      setActiveArtifactId(rows[0]?.id ?? null)
      setArtifactPanelOpen(false)
      setSidebarOpen(false)
    },
    [conversations],
  )

  const handleArchiveConversation = useCallback(
    async (id: string) => {
      await updateConversation(id, { archived: true })
      const remaining = conversations.filter((conversation) => conversation.id !== id)
      setConversations(remaining)
      if (activeId === id) {
        const next = remaining[0] ?? null
        setActiveId(next?.id ?? null)
        setMessages(next ? await listMessages(next.id) : [])
        const rows = next ? await listArtifacts(next.id) : []
        setArtifacts(rows)
        setArtifactVersions([])
        setActiveArtifactId(rows[0]?.id ?? null)
      }
    },
    [activeId, conversations],
  )

  const handleTogglePinned = useCallback(async (conversation: ChatConversation) => {
    const updated = await updateConversation(conversation.id, { pinned: !conversation.pinned })
    setConversations((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }, [])

  const handleVisibilityChange = useCallback(
    async (visibility: ChatConversation["visibility"]) => {
      if (!activeConversation) return
      const updated = await updateConversation(activeConversation.id, { visibility })
      setConversations((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    },
    [activeConversation],
  )

  const handleEndpointChange = useCallback(
    async (endpointId: string) => {
      const endpoint = pickEndpoint(endpointId)
      setSelectedEndpointId(endpoint.id)
      if (!activeConversation) return
      const updated = await updateConversation(activeConversation.id, {
        endpointId: endpoint.id,
        endpointKind: endpoint.kind,
        endpointLabel: endpoint.label,
      })
      setConversations((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    },
    [activeConversation],
  )

  const handleDirectModelChange = useCallback(
    async (nextModelKey: string) => {
      const next = directModels.find((model) => modelKey(model) === nextModelKey)
      if (!next) return
      setDirectModel(next)
      if (activeConversation) {
        const updated = await updateConversation(activeConversation.id, { modelLabel: next.label })
        setConversations((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      }
    },
    [activeConversation, directModels],
  )

  const handleIdentityChange = useCallback(
    async (next: ChatIdentity) => {
      const saved = { ...next, source: next.source ?? "guest" }
      saveChatIdentity(saved)
      setIdentity(saved)
      await ensureChatUser(saved)
      const rows = await listConversations(saved)
      if (rows.length === 0) {
        const created = await createConversation({ identity: saved, endpoint: selectedEndpoint })
        setConversations([created])
        setActiveId(created.id)
        setMessages([])
        setArtifacts([])
        setArtifactVersions([])
        setActiveArtifactId(null)
      } else {
        setConversations(rows)
        setActiveId(rows[0].id)
        setMessages(await listMessages(rows[0].id))
        const loadedArtifacts = await listArtifacts(rows[0].id)
        setArtifacts(loadedArtifacts)
        setArtifactVersions([])
        setActiveArtifactId(loadedArtifacts[0]?.id ?? null)
      }
    },
    [selectedEndpoint],
  )

  const handleCreateSuggestion = useCallback(
    async (artifact: ChatArtifact) => {
      if (!identity) return
      try {
        const targetModel = await ensureDirectModel()
        const result = await invokeMisoLLM({
          targetModel,
          systemPrompt: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `다음 ${artifact.kind} artifact를 검토하고 바로 적용 가능한 개선안 하나를 제안해줘.\n\n${artifact.content.slice(0, 12000)}`,
            },
          ],
        })
        const suggestion = await createArtifactSuggestion({
          artifactId: artifact.id,
          ownerKey: identity.userKey,
          description: "Direct LLM 개선안",
          originalText: artifact.content.slice(0, 50000),
          suggestedText: result.answer.trim(),
        })
        setArtifactSuggestions((current) => [suggestion, ...current])
        await recordUsageEvent({
          conversationId: artifact.conversationId,
          ownerKey: identity.userKey,
          eventType: "artifact_suggestion",
          metadata: { artifactId: artifact.id },
        })
      } catch (error) {
        setRuntimeError(error instanceof Error ? error.message : "개선안을 생성하지 못했습니다.")
      }
    },
    [ensureDirectModel, identity],
  )

  const handleSend = useCallback(
    async (rawText: string, drafts: AttachmentDraft[]) => {
      if (!identity || isStreaming) return
      setRuntimeError(null)

      const parsed = parseCommand(rawText)
      if (parsed.command?.id === "new" || parsed.command?.id === "clear") {
        await handleNewConversation()
        return
      }
      if (parsed.command?.id === "suggest") {
        if (activeArtifact) await handleCreateSuggestion(activeArtifact)
        else setRuntimeError("개선안을 만들 열린 artifact가 없습니다.")
        return
      }

      const text = parsed.cleanText || rawText.trim()
      const artifactKind = parsed.command?.artifactKind
      if (!text) {
        setRuntimeError("명령 뒤에 요청 내용을 입력하세요.")
        return
      }

      const endpoint = selectedEndpoint
      if (endpoint.kind !== "direct-llm" && !endpoint.appId) {
        setRuntimeError(`${endpoint.label} 앱 ID가 설정되지 않았습니다.`)
        return
      }

      try {
        let conversation = activeConversation
        if (!conversation) {
          const created = await createConversation({ identity, endpoint })
          conversation = created
          setConversations((current) => [created, ...current])
          setActiveId(created.id)
        }

        const previousMessages = messagesRef.current
        const uploaded = await uploadAttachments(endpoint, drafts, identity.userKey)
        const userMessage = await addMessage({
          conversationId: conversation.id,
          ownerKey: identity.userKey,
          role: "user",
          content: rawText,
          attachments: uploaded.metas,
          status: "done",
          metadata: {
            endpointId: endpoint.id,
            endpointKind: endpoint.kind,
            command: parsed.command?.id,
          },
        })
        const assistantDraft = await addMessage({
          conversationId: conversation.id,
          ownerKey: identity.userKey,
          role: "assistant",
          content: "",
          attachments: [],
          status: "streaming",
          metadata: {
            endpointId: endpoint.id,
            endpointKind: endpoint.kind,
            artifactKind,
          },
        })
        setMessages((current) => [...current, userMessage, assistantDraft])

        const titlePatch = previousMessages.length === 0 ? deriveConversationTitle(text) : conversation.title
        const updatedConversation = await updateConversation(conversation.id, {
          title: titlePatch,
          endpointId: endpoint.id,
          endpointKind: endpoint.kind,
          endpointLabel: endpoint.label,
          modelLabel: directModel?.label ?? conversation.modelLabel,
        })
        setConversations((current) => current.map((item) => (item.id === updatedConversation.id ? updatedConversation : item)))

        runRef.current = {
          conversationId: conversation.id,
          messageId: assistantDraft.id,
          endpointId: endpoint.id,
          endpointKind: endpoint.kind,
          text: "",
          reasoning: "",
          finished: false,
          aborted: false,
          toolInvocations: [],
          artifactKind,
          userText: text,
        }
        setActiveRunId(assistantDraft.id)
        await recordUsageEvent({
          conversationId: conversation.id,
          ownerKey: identity.userKey,
          eventType: "message_send",
          metadata: {
            endpointKind: endpoint.kind,
            command: parsed.command?.id,
            attachments: drafts.length,
          },
        })

        if (endpoint.kind === "direct-llm") {
          const targetModel = await ensureDirectModel()
          const directContent = await directContentParts(text, drafts)
          sendDirectLlm(directContent, {
            history: directHistory(previousMessages),
            targetModel,
            systemPrompt: directSystemPrompt(artifactKind, artifactsRef.current),
            tools: artifactTools,
            handlers: {
              onMessage: (chunk) => appendPreview(conversation.id, chunk),
              onMessageReplace: (answer) => replacePreview(conversation.id, answer),
              onReasoning: (chunk) => appendReasoning(conversation.id, chunk),
              onToolCall: storeToolInvocation,
              onToolResult: storeToolInvocation,
              onError: (error) => {
                setRuntimeError(error.message)
                void finishAssistant(conversation.id, "error", error.message)
              },
              onDone: () => {
                void finishAssistant(conversation.id, "done")
              },
            },
          })
          return
        }

        const stream = endpoint.kind === "agent" ? agent : chatflow
        stream.send(text, {
          conversationId: conversation.remoteConversationId,
          files: uploaded.files,
          inputs: {
            ownerKey: identity.userKey,
            displayName: identity.displayName,
            source: "miso-coder-ai-chat",
          },
          handlers: {
            onMessage: (chunk) => appendPreview(conversation.id, chunk),
            onMessageReplace: (answer) => replacePreview(conversation.id, answer),
            onMessageEnd: (event) => {
              if (typeof event.answer === "string" && event.answer) replacePreview(conversation.id, event.answer)
              const remoteId = eventConversationId(event)
              if (remoteId) {
                void updateConversation(conversation.id, { remoteConversationId: remoteId }).then((updated) => {
                  setConversations((current) => current.map((item) => (item.id === updated.id ? updated : item)))
                })
              }
            },
            onError: (error) => {
              setRuntimeError(error.message)
              void finishAssistant(conversation.id, "error", error.message)
            },
            onDone: () => {
              void finishAssistant(conversation.id, "done")
            },
          },
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "메시지 전송에 실패했습니다."
        setRuntimeError(message)
        const run = runRef.current
        if (run) void finishAssistant(run.conversationId, "error", message)
      }
    },
    [
      activeArtifact,
      activeConversation,
      agent,
      appendPreview,
      appendReasoning,
      artifactTools,
      chatflow,
      directModel?.label,
      ensureDirectModel,
      finishAssistant,
      handleCreateSuggestion,
      handleNewConversation,
      identity,
      isStreaming,
      replacePreview,
      selectedEndpoint,
      sendDirectLlm,
      storeToolInvocation,
      uploadAttachments,
    ],
  )

  const handleAbort = useCallback(() => {
    const run = runRef.current
    if (run) run.aborted = true
    if (selectedEndpoint.kind === "direct-llm") {
      abortDirectLlm()
      if (run) {
        const hasPartial = run.text.trim().length > 0 || run.toolInvocations.length > 0
        void finishAssistant(run.conversationId, hasPartial ? "done" : "error", "중단되었습니다.")
      }
    }
    if (selectedEndpoint.kind === "advanced-chat") chatflow.abort()
    if (selectedEndpoint.kind === "agent") agent.abort()
  }, [abortDirectLlm, agent, chatflow, finishAssistant, selectedEndpoint.kind])

  const handleFeedback = useCallback(
    async (message: ChatMessage, rating: FeedbackRating) => {
      if (!identity) return
      const feedback = await upsertFeedback({ messageId: message.id, ownerKey: identity.userKey, rating })
      setFeedbackByMessageId((current) => ({ ...current, [feedback.messageId]: feedback.rating }))
    },
    [identity],
  )

  const handleEditMessage = useCallback((message: ChatMessage) => {
    setDraftValue(message.content)
  }, [])

  const handleRegenerate = useCallback(
    (message: ChatMessage) => {
      const index = messages.findIndex((item) => item.id === message.id)
      const previousUser = messages
        .slice(0, index)
        .reverse()
        .find((item) => item.role === "user")
      if (previousUser) void handleSend(previousUser.content, [])
    },
    [handleSend, messages],
  )

  const handleCreateArtifactFromMessage = useCallback(
    async (message: ChatMessage) => {
      if (!identity) return
      const kind = inferArtifactKind(message)
      const artifact = await createArtifact({
        conversationId: message.conversationId,
        ownerKey: identity.userKey,
        messageId: message.id,
        kind,
        title: artifactTitle(message.content, kind),
        content: extractArtifactContent(message.content, kind),
        language: artifactLanguage(kind),
        status: "ready",
        metadata: {
          source: "message_action",
        },
      })
      await refreshArtifacts(message.conversationId, artifact.id)
    },
    [identity, refreshArtifacts],
  )

  const handleSaveArtifact = useCallback(
    async (artifactId: string, patch: Pick<ChatArtifact, "title" | "content"> & { language?: string }) => {
      if (!activeConversation) return
      const updated = await updateArtifact(artifactId, { ...patch, status: "ready", metadata: { source: "manual_save" } })
      await refreshArtifacts(activeConversation.id, updated.id)
      setArtifactVersions(await listArtifactVersions(updated.id))
    },
    [activeConversation, refreshArtifacts],
  )

  const handleDeleteArtifact = useCallback(
    async (artifactId: string) => {
      if (!activeConversation) return
      await deleteArtifact(artifactId)
      const rows = await listArtifacts(activeConversation.id)
      setArtifacts(rows)
      setArtifactVersions([])
      setActiveArtifactId(rows[0]?.id ?? null)
      if (rows.length === 0) setArtifactPanelOpen(false)
    },
    [activeConversation],
  )

  const handleToggleSuggestion = useCallback(async (suggestion: ArtifactSuggestion) => {
    const updated = await updateArtifactSuggestion(suggestion.id, { resolved: !suggestion.resolved })
    setArtifactSuggestions((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }, [])

  const handleApplySuggestion = useCallback(
    async (suggestion: ArtifactSuggestion) => {
      if (!activeArtifact) return
      const nextContent = suggestion.originalText && activeArtifact.content.includes(suggestion.originalText)
        ? activeArtifact.content.replace(suggestion.originalText, suggestion.suggestedText)
        : suggestion.suggestedText
      const updated = await updateArtifact(activeArtifact.id, {
        content: nextContent,
        status: "ready",
        metadata: { source: "suggestion_apply", suggestionId: suggestion.id },
      })
      await updateArtifactSuggestion(suggestion.id, { resolved: true })
      await refreshArtifacts(activeArtifact.conversationId, updated.id)
      setArtifactVersions(await listArtifactVersions(updated.id))
      setArtifactSuggestions(await listArtifactSuggestions(updated.id))
    },
    [activeArtifact, refreshArtifacts],
  )

  const handleRestoreVersion = useCallback(
    async (version: ChatArtifactVersion) => {
      const artifact = artifactsRef.current.find((item) => item.id === version.artifactId)
      if (!artifact) return
      const updated = await updateArtifact(version.artifactId, {
        title: version.title,
        content: version.content,
        language: version.language,
        status: "ready",
        metadata: { source: "version_restore", restoredFromVersion: version.version },
      })
      await refreshArtifacts(artifact.conversationId, updated.id)
      setArtifactVersions(await listArtifactVersions(updated.id))
    },
    [refreshArtifacts],
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-transform duration-200",
          "lg:relative lg:inset-auto lg:translate-x-0 lg:transition-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <ConversationSidebar
          conversations={conversations}
          activeId={activeId}
          identity={identity}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onArchive={handleArchiveConversation}
          onTogglePinned={handleTogglePinned}
        />
      </div>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="사이드바 닫기"
          className="fixed inset-0 z-30 bg-foreground/25 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 lg:hidden">
          <Button variant="ghost" size="icon" aria-label="사이드바 열기" onClick={() => setSidebarOpen(true)}>
            <Menu className="size-4" />
          </Button>
        </div>

        <ChatHeader
          conversation={activeConversation}
          endpoints={CHAT_ENDPOINTS}
          selectedEndpoint={selectedEndpoint}
          identity={identity}
          isStreaming={isStreaming}
          modelLabel={directModel?.label ?? activeConversation?.modelLabel}
          directModels={directModels}
          selectedDirectModelKey={directModel ? modelKey(directModel) : undefined}
          onEndpointChange={handleEndpointChange}
          onDirectModelChange={handleDirectModelChange}
          onVisibilityChange={handleVisibilityChange}
          onIdentityChange={handleIdentityChange}
        />

        <MessageList
          messages={messages}
          loading={loading}
          error={streamError}
          feedbackByMessageId={feedbackByMessageId}
          onFeedback={handleFeedback}
          onEdit={handleEditMessage}
          onRegenerate={handleRegenerate}
          onCreateArtifact={handleCreateArtifactFromMessage}
        />

        <ChatInput
          isStreaming={isStreaming}
          endpoint={selectedEndpoint}
          draftValue={draftValue}
          suggestedActions={SUGGESTED_ACTIONS}
          onDraftApplied={() => setDraftValue(null)}
          onSend={handleSend}
          onAbort={handleAbort}
        />
      </main>

      {artifactPanelOpen && (
        <ArtifactPanel
          artifacts={artifacts}
          activeArtifact={activeArtifact}
          versions={artifactVersions}
          suggestions={artifactSuggestions}
          onSelect={setActiveArtifactId}
          onClose={() => setArtifactPanelOpen(false)}
          onSave={handleSaveArtifact}
          onDelete={handleDeleteArtifact}
          onCreateSuggestion={handleCreateSuggestion}
          onToggleSuggestion={handleToggleSuggestion}
          onApplySuggestion={handleApplySuggestion}
          onRestoreVersion={handleRestoreVersion}
        />
      )}
    </div>
  )
}

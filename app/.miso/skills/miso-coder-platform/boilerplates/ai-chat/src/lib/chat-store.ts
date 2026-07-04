import pb from "@/lib/miso-sdk/runtime-client"
import { CHAT_ENDPOINTS, DEFAULT_ENDPOINT_ID } from "@/lib/chat-config"
import type {
  AttachmentMeta,
  ArtifactKind,
  ArtifactStatus,
  ArtifactSuggestion,
  ChatArtifact,
  ChatArtifactVersion,
  ChatConversation,
  ChatEndpoint,
  ChatIdentity,
  ChatMessage,
  ChatStats,
  ChatUsageEvent,
  ConversationVisibility,
  ConversationWithMessages,
  FeedbackRating,
  MessageFeedback,
} from "@/lib/chat-types"

const COLLECTIONS = {
  USERS: "chat_users",
  CONVERSATIONS: "chat_conversations",
  MESSAGES: "chat_messages",
  ARTIFACTS: "chat_artifacts",
  ARTIFACT_VERSIONS: "chat_artifact_versions",
  SUGGESTIONS: "chat_suggestions",
  FEEDBACK: "chat_feedback",
  USAGE_EVENTS: "chat_usage_events",
} as const

const LOCAL_STORAGE_KEY = "miso-chat:fallback"

type PBRecord = Record<string, unknown> & {
  id: string
  created?: string
  updated?: string
}

type LocalState = {
  conversations: ChatConversation[]
  messages: ChatMessage[]
  artifacts: ChatArtifact[]
  artifactVersions: ChatArtifactVersion[]
  suggestions: ArtifactSuggestion[]
  feedback: MessageFeedback[]
  usageEvents: ChatUsageEvent[]
}

export type CreateConversationInput = {
  identity: ChatIdentity
  title?: string
  visibility?: ConversationVisibility
  endpoint?: ChatEndpoint
}

export type ConversationPatch = Partial<
  Pick<
    ChatConversation,
    "title" | "visibility" | "endpointId" | "endpointKind" | "endpointLabel" | "modelLabel" | "remoteConversationId" | "pinned" | "archived"
  >
>

function nowIso(): string {
  return new Date().toISOString()
}

function uid(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function pbText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback
}

function int(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback
}

function arr<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback
}

function visibility(value: unknown): ConversationVisibility {
  return value === "public" || value === "team" || value === "private" ? value : "private"
}

function artifactKind(value: unknown): ArtifactKind {
  return value === "code" || value === "sheet" || value === "image" || value === "text" ? value : "text"
}

function artifactStatus(value: unknown): ArtifactStatus {
  return value === "draft" || value === "streaming" || value === "ready" || value === "error" ? value : "draft"
}

function feedbackRating(value: unknown): FeedbackRating {
  return value === "down" ? "down" : "up"
}

function normalizeLocalState(value: Partial<LocalState>): LocalState {
  return {
    conversations: Array.isArray(value.conversations) ? value.conversations : [],
    messages: Array.isArray(value.messages) ? value.messages : [],
    artifacts: Array.isArray(value.artifacts) ? value.artifacts : [],
    artifactVersions: Array.isArray(value.artifactVersions) ? value.artifactVersions : [],
    suggestions: Array.isArray(value.suggestions) ? value.suggestions : [],
    feedback: Array.isArray(value.feedback) ? value.feedback : [],
    usageEvents: Array.isArray(value.usageEvents) ? value.usageEvents : [],
  }
}

function localState(): LocalState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) return normalizeLocalState(JSON.parse(raw) as Partial<LocalState>)
  } catch {
    // ignore corrupt local fallback
  }
  return normalizeLocalState({})
}

function saveLocalState(next: LocalState): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next))
}

function defaultEndpoint(): ChatEndpoint {
  return CHAT_ENDPOINTS.find((endpoint) => endpoint.id === DEFAULT_ENDPOINT_ID) ?? CHAT_ENDPOINTS[0]
}

function endpointById(endpointId: string): ChatEndpoint {
  return CHAT_ENDPOINTS.find((endpoint) => endpoint.id === endpointId) ?? defaultEndpoint()
}

function mapConversation(record: unknown): ChatConversation {
  const r = record as PBRecord
  const endpoint = endpointById(str(r.endpointId, DEFAULT_ENDPOINT_ID))
  const kind = str(r.endpointKind, endpoint.kind) as ChatConversation["endpointKind"]
  return {
    id: r.id,
    ownerKey: str(r.ownerKey),
    title: str(r.title, "새 대화"),
    visibility: visibility(r.visibility),
    endpointId: str(r.endpointId, endpoint.id),
    endpointKind: kind,
    endpointLabel: str(r.endpointLabel, endpoint.label),
    modelLabel: str(r.modelLabel) || undefined,
    remoteConversationId: str(r.remoteConversationId) || undefined,
    pinned: bool(r.pinned),
    archived: bool(r.archived),
    createdAt: str(r.created, str(r.createdAt, nowIso())),
    updatedAt: str(r.updated, str(r.updatedAt, nowIso())),
  }
}

function mapMessage(record: unknown): ChatMessage {
  const r = record as PBRecord
  return {
    id: r.id,
    conversationId: str(r.conversationId),
    ownerKey: str(r.ownerKey),
    role: str(r.role, "assistant") as ChatMessage["role"],
    content: str(r.content),
    attachments: arr<AttachmentMeta>(r.attachments, []),
    status: str(r.status, "done") as ChatMessage["status"],
    metadata: typeof r.metadata === "object" && r.metadata ? (r.metadata as Record<string, unknown>) : undefined,
    createdAt: str(r.created, str(r.createdAt, nowIso())),
  }
}

function mapArtifact(record: unknown): ChatArtifact {
  const r = record as PBRecord
  return {
    id: r.id,
    conversationId: str(r.conversationId),
    ownerKey: str(r.ownerKey),
    messageId: str(r.messageId) || undefined,
    kind: artifactKind(r.kind),
    title: str(r.title, "Untitled artifact"),
    content: str(r.content),
    language: str(r.language) || undefined,
    status: artifactStatus(r.status),
    version: int(r.version, 1),
    metadata: typeof r.metadata === "object" && r.metadata ? (r.metadata as Record<string, unknown>) : undefined,
    createdAt: str(r.created, str(r.createdAt, nowIso())),
    updatedAt: str(r.updated, str(r.updatedAt, nowIso())),
  }
}

function mapSuggestion(record: unknown): ArtifactSuggestion {
  const r = record as PBRecord
  return {
    id: r.id,
    artifactId: str(r.artifactId),
    ownerKey: str(r.ownerKey),
    description: str(r.description),
    originalText: str(r.originalText),
    suggestedText: str(r.suggestedText),
    resolved: bool(r.resolved),
    createdAt: str(r.created, str(r.createdAt, nowIso())),
    updatedAt: str(r.updated, str(r.updatedAt, nowIso())),
  }
}

function mapArtifactVersion(record: unknown): ChatArtifactVersion {
  const r = record as PBRecord
  return {
    id: r.id,
    artifactId: str(r.artifactId),
    ownerKey: str(r.ownerKey),
    version: int(r.version, 1),
    title: str(r.title, "Untitled artifact"),
    content: str(r.content),
    language: str(r.language) || undefined,
    source: str(r.source, "manual"),
    createdAt: str(r.created, str(r.createdAt, nowIso())),
  }
}

function mapFeedback(record: unknown): MessageFeedback {
  const r = record as PBRecord
  return {
    id: r.id,
    messageId: str(r.messageId),
    ownerKey: str(r.ownerKey),
    rating: feedbackRating(r.rating),
    note: str(r.note) || undefined,
    createdAt: str(r.created, str(r.createdAt, nowIso())),
    updatedAt: str(r.updated, str(r.updatedAt, nowIso())),
  }
}

function artifactVersionSource(metadata: Record<string, unknown> | undefined): string {
  const source = metadata?.source
  return typeof source === "string" && source.trim() ? source.trim() : "manual"
}

async function createArtifactVersionSnapshot(
  artifact: ChatArtifact,
  source = artifactVersionSource(artifact.metadata),
): Promise<ChatArtifactVersion | null> {
  const data = {
    artifactId: artifact.id,
    ownerKey: artifact.ownerKey,
    version: artifact.version,
    title: artifact.title,
    content: artifact.content,
    language: artifact.language ?? "",
    source,
  }
  try {
    return mapArtifactVersion(await pb.collection(COLLECTIONS.ARTIFACT_VERSIONS).create(data, { $autoCancel: false }))
  } catch {
    const version = mapArtifactVersion({ id: uid("ver"), ...data, createdAt: nowIso() })
    const state = localState()
    saveLocalState({
      ...state,
      artifactVersions: [
        version,
        ...state.artifactVersions.filter((item) => !(item.artifactId === version.artifactId && item.version === version.version)),
      ],
    })
    return version
  }
}

function shouldSnapshotArtifact(artifact: ChatArtifact): boolean {
  return artifact.version > 0 && artifact.content.trim().length > 0
}

function mapUsageEvent(record: unknown): ChatUsageEvent {
  const r = record as PBRecord
  return {
    id: r.id,
    conversationId: str(r.conversationId),
    ownerKey: str(r.ownerKey),
    eventType: str(r.eventType),
    metadata: typeof r.metadata === "object" && r.metadata ? (r.metadata as Record<string, unknown>) : undefined,
    createdAt: str(r.created, str(r.createdAt, nowIso())),
  }
}

function canSee(identity: ChatIdentity, conversation: ChatConversation): boolean {
  return conversation.ownerKey === identity.userKey || conversation.visibility !== "private"
}

function sortConversations(rows: ChatConversation[]): ChatConversation[] {
  return [...rows].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

export function deriveConversationTitle(message: string): string {
  const oneLine = message.trim().replace(/\s+/g, " ")
  if (!oneLine) return "새 대화"
  return oneLine.length > 36 ? `${oneLine.slice(0, 36)}...` : oneLine
}

export async function ensureChatUser(identity: ChatIdentity): Promise<void> {
  try {
    const rows = await pb.collection(COLLECTIONS.USERS).getFullList({
      filter: `userKey="${pbText(identity.userKey)}"`,
      $autoCancel: false,
    })
    const data = {
      userKey: identity.userKey,
      displayName: identity.displayName,
      email: identity.email ?? "",
      role: identity.role,
    }
    if (rows[0]) {
      await pb.collection(COLLECTIONS.USERS).update(rows[0].id, data, { $autoCancel: false })
    } else {
      await pb.collection(COLLECTIONS.USERS).create(data, { $autoCancel: false })
    }
  } catch {
    // Fallback mode has no user table.
  }
}

export async function listConversations(identity: ChatIdentity): Promise<ChatConversation[]> {
  try {
    const rows = await pb.collection(COLLECTIONS.CONVERSATIONS).getFullList({
      sort: "-updated",
      filter: `(ownerKey="${pbText(identity.userKey)}"||visibility!="private")&&archived=false`,
      $autoCancel: false,
    })
    return sortConversations(rows.map(mapConversation))
  } catch {
    return sortConversations(localState().conversations.filter((conversation) => !conversation.archived && canSee(identity, conversation)))
  }
}

export async function createConversation(input: CreateConversationInput): Promise<ChatConversation> {
  const endpoint = input.endpoint ?? defaultEndpoint()
  const data = {
    ownerKey: input.identity.userKey,
    title: input.title ?? "새 대화",
    visibility: input.visibility ?? "private",
    endpointId: endpoint.id,
    endpointKind: endpoint.kind,
    endpointLabel: endpoint.label,
    modelLabel: "",
    remoteConversationId: "",
    pinned: false,
    archived: false,
  }
  try {
    return mapConversation(await pb.collection(COLLECTIONS.CONVERSATIONS).create(data, { $autoCancel: false }))
  } catch {
    const conversation = mapConversation({ id: uid("conv"), ...data, createdAt: nowIso(), updatedAt: nowIso() })
    const state = localState()
    saveLocalState({ ...state, conversations: [conversation, ...state.conversations] })
    return conversation
  }
}

export async function updateConversation(id: string, patch: ConversationPatch): Promise<ChatConversation> {
  try {
    return mapConversation(await pb.collection(COLLECTIONS.CONVERSATIONS).update(id, patch, { $autoCancel: false }))
  } catch {
    const state = localState()
    const conversations = state.conversations.map((conversation) =>
      conversation.id === id ? { ...conversation, ...patch, updatedAt: nowIso() } : conversation,
    )
    const updated = conversations.find((conversation) => conversation.id === id)
    saveLocalState({ ...state, conversations })
    if (!updated) throw new Error("Conversation not found")
    return updated
  }
}

export async function archiveConversation(id: string): Promise<void> {
  await updateConversation(id, { archived: true })
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const rows = await pb.collection(COLLECTIONS.MESSAGES).getFullList({
      sort: "+created",
      filter: `conversationId="${pbText(conversationId)}"`,
      $autoCancel: false,
    })
    return rows.map(mapMessage)
  } catch {
    return localState().messages
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
}

export async function addMessage(input: Omit<ChatMessage, "id" | "createdAt">): Promise<ChatMessage> {
  const data = {
    ...input,
    attachments: input.attachments ?? [],
    metadata: input.metadata ?? {},
  }
  try {
    return mapMessage(await pb.collection(COLLECTIONS.MESSAGES).create(data, { $autoCancel: false }))
  } catch {
    const message = mapMessage({ id: uid("msg"), ...data, createdAt: nowIso() })
    const state = localState()
    saveLocalState({ ...state, messages: [...state.messages, message] })
    return message
  }
}

export async function replaceMessage(id: string, patch: Partial<Pick<ChatMessage, "content" | "status" | "metadata">>): Promise<ChatMessage> {
  try {
    return mapMessage(await pb.collection(COLLECTIONS.MESSAGES).update(id, patch, { $autoCancel: false }))
  } catch {
    const state = localState()
    const messages = state.messages.map((message) => (message.id === id ? { ...message, ...patch } : message))
    const updated = messages.find((message) => message.id === id)
    saveLocalState({ ...state, messages })
    if (!updated) throw new Error("Message not found")
    return updated
  }
}

export async function listArtifacts(conversationId: string): Promise<ChatArtifact[]> {
  try {
    const rows = await pb.collection(COLLECTIONS.ARTIFACTS).getFullList({
      sort: "-updated",
      filter: `conversationId="${pbText(conversationId)}"`,
      $autoCancel: false,
    })
    return rows.map(mapArtifact)
  } catch {
    return localState().artifacts
      .filter((artifact) => artifact.conversationId === conversationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
}

export async function createArtifact(
  input: Omit<ChatArtifact, "id" | "createdAt" | "updatedAt" | "version"> & { version?: number },
): Promise<ChatArtifact> {
  const data = {
    ...input,
    language: input.language ?? "",
    version: input.version ?? 1,
    metadata: input.metadata ?? {},
  }
  try {
    const artifact = mapArtifact(await pb.collection(COLLECTIONS.ARTIFACTS).create(data, { $autoCancel: false }))
    if (shouldSnapshotArtifact(artifact)) await createArtifactVersionSnapshot(artifact)
    return artifact
  } catch {
    const artifact = mapArtifact({ id: uid("art"), ...data, createdAt: nowIso(), updatedAt: nowIso() })
    const state = localState()
    saveLocalState({ ...state, artifacts: [artifact, ...state.artifacts] })
    if (shouldSnapshotArtifact(artifact)) await createArtifactVersionSnapshot(artifact)
    return artifact
  }
}

export async function updateArtifact(
  id: string,
  patch: Partial<Pick<ChatArtifact, "title" | "content" | "language" | "status" | "metadata">>,
): Promise<ChatArtifact> {
  const shouldVersion = patch.title !== undefined || patch.content !== undefined || patch.language !== undefined
  try {
    const current = await pb.collection(COLLECTIONS.ARTIFACTS).getOne(id, { $autoCancel: false })
    const nextVersion = int((current as PBRecord).version, 1) + (shouldVersion ? 1 : 0)
    const updated = mapArtifact(
      await pb.collection(COLLECTIONS.ARTIFACTS).update(id, { ...patch, version: nextVersion }, { $autoCancel: false }),
    )
    if (shouldVersion) await createArtifactVersionSnapshot(updated, artifactVersionSource(patch.metadata ?? updated.metadata))
    return updated
  } catch {
    const state = localState()
    const artifacts = state.artifacts.map((artifact) =>
      artifact.id === id
        ? {
            ...artifact,
            ...patch,
            version: shouldVersion ? artifact.version + 1 : artifact.version,
            updatedAt: nowIso(),
          }
        : artifact,
    )
    const updated = artifacts.find((artifact) => artifact.id === id)
    saveLocalState({ ...state, artifacts })
    if (!updated) throw new Error("Artifact not found")
    if (shouldVersion) await createArtifactVersionSnapshot(updated, artifactVersionSource(patch.metadata ?? updated.metadata))
    return updated
  }
}

export async function deleteArtifact(id: string): Promise<void> {
  try {
    await pb.collection(COLLECTIONS.ARTIFACTS).delete(id, { $autoCancel: false })
    void pb.collection(COLLECTIONS.ARTIFACT_VERSIONS).getFullList({ filter: `artifactId="${pbText(id)}"`, $autoCancel: false })
      .then((rows) => Promise.all(rows.map((row) => pb.collection(COLLECTIONS.ARTIFACT_VERSIONS).delete(row.id, { $autoCancel: false }))))
      .catch(() => undefined)
  } catch {
    const state = localState()
    saveLocalState({
      ...state,
      artifacts: state.artifacts.filter((artifact) => artifact.id !== id),
      artifactVersions: state.artifactVersions.filter((version) => version.artifactId !== id),
      suggestions: state.suggestions.filter((suggestion) => suggestion.artifactId !== id),
    })
  }
}

export async function listArtifactVersions(artifactId: string): Promise<ChatArtifactVersion[]> {
  try {
    const rows = await pb.collection(COLLECTIONS.ARTIFACT_VERSIONS).getFullList({
      sort: "-version",
      filter: `artifactId="${pbText(artifactId)}"`,
      $autoCancel: false,
    })
    return rows.map(mapArtifactVersion)
  } catch {
    return localState().artifactVersions
      .filter((version) => version.artifactId === artifactId)
      .sort((a, b) => b.version - a.version)
  }
}

export async function listArtifactSuggestions(artifactId: string): Promise<ArtifactSuggestion[]> {
  try {
    const rows = await pb.collection(COLLECTIONS.SUGGESTIONS).getFullList({
      sort: "-updated",
      filter: `artifactId="${pbText(artifactId)}"`,
      $autoCancel: false,
    })
    return rows.map(mapSuggestion)
  } catch {
    return localState().suggestions
      .filter((suggestion) => suggestion.artifactId === artifactId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
}

export async function createArtifactSuggestion(
  input: Omit<ArtifactSuggestion, "id" | "createdAt" | "updatedAt" | "resolved"> & { resolved?: boolean },
): Promise<ArtifactSuggestion> {
  const data = {
    ...input,
    resolved: input.resolved ?? false,
  }
  try {
    return mapSuggestion(await pb.collection(COLLECTIONS.SUGGESTIONS).create(data, { $autoCancel: false }))
  } catch {
    const suggestion = mapSuggestion({ id: uid("sug"), ...data, createdAt: nowIso(), updatedAt: nowIso() })
    const state = localState()
    saveLocalState({ ...state, suggestions: [suggestion, ...state.suggestions] })
    return suggestion
  }
}

export async function updateArtifactSuggestion(id: string, patch: Partial<Pick<ArtifactSuggestion, "resolved">>): Promise<ArtifactSuggestion> {
  try {
    return mapSuggestion(await pb.collection(COLLECTIONS.SUGGESTIONS).update(id, patch, { $autoCancel: false }))
  } catch {
    const state = localState()
    const suggestions = state.suggestions.map((suggestion) =>
      suggestion.id === id ? { ...suggestion, ...patch, updatedAt: nowIso() } : suggestion,
    )
    const updated = suggestions.find((suggestion) => suggestion.id === id)
    saveLocalState({ ...state, suggestions })
    if (!updated) throw new Error("Suggestion not found")
    return updated
  }
}

export async function listFeedback(messageIds: string[], ownerKey: string): Promise<MessageFeedback[]> {
  if (messageIds.length === 0) return []
  try {
    const rows = await pb.collection(COLLECTIONS.FEEDBACK).getFullList({
      sort: "-updated",
      filter: `ownerKey="${pbText(ownerKey)}"`,
      $autoCancel: false,
    })
    return rows.map(mapFeedback).filter((feedback) => messageIds.includes(feedback.messageId))
  } catch {
    return localState().feedback.filter((feedback) => feedback.ownerKey === ownerKey && messageIds.includes(feedback.messageId))
  }
}

export async function upsertFeedback(input: {
  messageId: string
  ownerKey: string
  rating: FeedbackRating
  note?: string
}): Promise<MessageFeedback> {
  const data = {
    messageId: input.messageId,
    ownerKey: input.ownerKey,
    rating: input.rating,
    note: input.note ?? "",
  }
  try {
    const rows = await pb.collection(COLLECTIONS.FEEDBACK).getFullList({
      filter: `messageId="${pbText(input.messageId)}"&&ownerKey="${pbText(input.ownerKey)}"`,
      $autoCancel: false,
    })
    if (rows[0]) return mapFeedback(await pb.collection(COLLECTIONS.FEEDBACK).update(rows[0].id, data, { $autoCancel: false }))
    return mapFeedback(await pb.collection(COLLECTIONS.FEEDBACK).create(data, { $autoCancel: false }))
  } catch {
    const state = localState()
    const existing = state.feedback.find((feedback) => feedback.messageId === input.messageId && feedback.ownerKey === input.ownerKey)
    const feedback = mapFeedback({
      id: existing?.id ?? uid("fb"),
      ...data,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    })
    saveLocalState({
      ...state,
      feedback: existing
        ? state.feedback.map((item) => (item.id === existing.id ? feedback : item))
        : [feedback, ...state.feedback],
    })
    return feedback
  }
}

export async function recordUsageEvent(input: Omit<ChatUsageEvent, "id" | "createdAt">): Promise<ChatUsageEvent> {
  const data = {
    ...input,
    metadata: input.metadata ?? {},
  }
  try {
    return mapUsageEvent(await pb.collection(COLLECTIONS.USAGE_EVENTS).create(data, { $autoCancel: false }))
  } catch {
    const event = mapUsageEvent({ id: uid("evt"), ...data, createdAt: nowIso() })
    const state = localState()
    saveLocalState({ ...state, usageEvents: [event, ...state.usageEvents] })
    return event
  }
}

export async function loadConversation(identity: ChatIdentity, id: string): Promise<ConversationWithMessages | null> {
  const conversations = await listConversations(identity)
  const conversation = conversations.find((item) => item.id === id)
  if (!conversation) return null
  return {
    conversation,
    messages: await listMessages(id),
  }
}

export async function getChatStats(identity: ChatIdentity): Promise<ChatStats> {
  const conversations = await listConversations(identity)
  const messageLists = await Promise.all(conversations.map((conversation) => listMessages(conversation.id)))
  return {
    totalConversations: conversations.length,
    privateConversations: conversations.filter((conversation) => conversation.visibility === "private").length,
    sharedConversations: conversations.filter((conversation) => conversation.visibility !== "private").length,
    totalMessages: messageLists.reduce((sum, rows) => sum + rows.length, 0),
  }
}

export async function subscribeConversationMessages(
  conversationId: string,
  onChange: () => void,
): Promise<() => void> {
  try {
    return await pb.collection(COLLECTIONS.MESSAGES).subscribe("*", (event) => {
      const record = event.record as Record<string, unknown>
      if (record.conversationId === conversationId) onChange()
    })
  } catch {
    return () => {}
  }
}

export { defaultEndpoint, endpointById }

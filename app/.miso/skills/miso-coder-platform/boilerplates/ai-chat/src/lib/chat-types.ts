export type ChatRole = "user" | "assistant" | "system"
export type ConversationVisibility = "private" | "team" | "public"
export type ChatEndpointKind = "direct-llm" | "advanced-chat" | "agent"
export type MessageStatus = "pending" | "streaming" | "done" | "error"
export type IdentitySource = "miso" | "guest"
export type ArtifactKind = "text" | "code" | "sheet" | "image"
export type ArtifactStatus = "draft" | "streaming" | "ready" | "error"
export type FeedbackRating = "up" | "down"

export type ChatIdentity = {
  userKey: string
  displayName: string
  email?: string
  role: "owner" | "member" | "guest"
  source?: IdentitySource
}

export type AttachmentMeta = {
  id?: string
  name: string
  size: number
  type: string
  uploadFileId?: string
  url?: string
}

export type AttachmentDraft = AttachmentMeta & {
  file: File
}

export type ChatEndpoint = {
  id: string
  kind: ChatEndpointKind
  label: string
  description: string
  appId?: string
  supportsFiles: boolean
  supportsWorkflowEvents: boolean
}

export type ChatConversation = {
  id: string
  ownerKey: string
  title: string
  visibility: ConversationVisibility
  endpointId: string
  endpointKind: ChatEndpointKind
  endpointLabel: string
  modelLabel?: string
  remoteConversationId?: string
  pinned: boolean
  archived: boolean
  createdAt: string
  updatedAt: string
}

export type ChatMessage = {
  id: string
  conversationId: string
  ownerKey: string
  role: ChatRole
  content: string
  attachments: AttachmentMeta[]
  status: MessageStatus
  metadata?: Record<string, unknown>
  createdAt: string
}

export type ChatArtifact = {
  id: string
  conversationId: string
  ownerKey: string
  messageId?: string
  kind: ArtifactKind
  title: string
  content: string
  language?: string
  status: ArtifactStatus
  version: number
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type ChatArtifactVersion = {
  id: string
  artifactId: string
  ownerKey: string
  version: number
  title: string
  content: string
  language?: string
  source: string
  createdAt: string
}

export type ArtifactSuggestion = {
  id: string
  artifactId: string
  ownerKey: string
  description: string
  originalText: string
  suggestedText: string
  resolved: boolean
  createdAt: string
  updatedAt: string
}

export type MessageFeedback = {
  id: string
  messageId: string
  ownerKey: string
  rating: FeedbackRating
  note?: string
  createdAt: string
  updatedAt: string
}

export type ChatUsageEvent = {
  id: string
  conversationId: string
  ownerKey: string
  eventType: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export type ConversationWithMessages = {
  conversation: ChatConversation
  messages: ChatMessage[]
}

export type ChatStats = {
  totalConversations: number
  privateConversations: number
  sharedConversations: number
  totalMessages: number
}

export type DirectModelSummary = {
  registeredProviderId: string
  modelId: string
  label: string
}

export type ChatCommandId = "new" | "clear" | "canvas" | "text" | "code" | "sheet" | "image" | "suggest"

export type ChatCommand = {
  id: ChatCommandId
  label: string
  hint: string
  promptPrefix?: string
  artifactKind?: ArtifactKind
}

export type StreamingMessage = {
  id: string
  conversationId: string
  content: string
  status: MessageStatus
}

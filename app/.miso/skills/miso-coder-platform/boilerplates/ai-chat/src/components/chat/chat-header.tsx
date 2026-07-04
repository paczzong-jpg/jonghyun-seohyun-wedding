import { Activity, MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ProviderSelector } from "@/components/chat/provider-selector"
import { VisibilitySelector } from "@/components/chat/visibility-selector"
import { IdentityPanel } from "@/components/chat/identity-panel"
import { CHAT_CONFIG } from "@/lib/chat-config"
import type { ChatConversation, ChatEndpoint, ChatIdentity, ConversationVisibility, DirectModelSummary } from "@/lib/chat-types"

type ChatHeaderProps = {
  conversation: ChatConversation | null
  endpoints: ChatEndpoint[]
  selectedEndpoint: ChatEndpoint
  identity: ChatIdentity | null
  isStreaming: boolean
  modelLabel?: string
  directModels: DirectModelSummary[]
  selectedDirectModelKey?: string
  onEndpointChange: (endpointId: string) => void
  onDirectModelChange: (modelKey: string) => void
  onVisibilityChange: (visibility: ConversationVisibility) => void
  onIdentityChange: (identity: ChatIdentity) => void
}

export function ChatHeader({
  conversation,
  endpoints,
  selectedEndpoint,
  identity,
  isStreaming,
  modelLabel,
  directModels,
  selectedDirectModelKey,
  onEndpointChange,
  onDirectModelChange,
  onVisibilityChange,
  onIdentityChange,
}: ChatHeaderProps) {
  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <MessageCircle className="size-4" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{conversation?.title ?? CHAT_CONFIG.title}</h1>
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <Activity className="size-3" />
            <span>{isStreaming ? "응답 중" : CHAT_CONFIG.subtitle}</span>
            {modelLabel && <span className="hidden truncate sm:inline">{modelLabel}</span>}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <Badge variant={selectedEndpoint.appId || selectedEndpoint.kind === "direct-llm" ? "secondary" : "destructive"} className="rounded-sm">
          {selectedEndpoint.kind}
        </Badge>
        <ProviderSelector endpoints={endpoints} selectedEndpoint={selectedEndpoint} onChange={onEndpointChange} />
        {selectedEndpoint.kind === "direct-llm" && directModels.length > 0 && (
          <Select value={selectedDirectModelKey} onValueChange={onDirectModelChange} disabled={isStreaming}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {directModels.map((model) => (
                <SelectItem key={`${model.registeredProviderId}:${model.modelId}`} value={`${model.registeredProviderId}:${model.modelId}`}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <VisibilitySelector value={conversation?.visibility ?? "private"} onChange={onVisibilityChange} />
        <Separator orientation="vertical" className="hidden h-8 sm:block" />
        <IdentityPanel identity={identity} onChange={onIdentityChange} />
      </div>
    </header>
  )
}

import { useEffect, useRef } from "react"
import { AlertCircle, LoaderCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage } from "@/components/chat/chat-message"
import { CHAT_CONFIG } from "@/lib/chat-config"
import type { ChatMessage as ChatMessageRecord, FeedbackRating } from "@/lib/chat-types"

type MessageListProps = {
  messages: ChatMessageRecord[]
  loading: boolean
  error: string | null
  feedbackByMessageId?: Record<string, FeedbackRating>
  onFeedback?: (message: ChatMessageRecord, rating: FeedbackRating) => void
  onEdit?: (message: ChatMessageRecord) => void
  onRegenerate?: (message: ChatMessageRecord) => void
  onCreateArtifact?: (message: ChatMessageRecord) => void
}

export function MessageList({
  messages,
  loading,
  error,
  feedbackByMessageId = {},
  onFeedback,
  onEdit,
  onRegenerate,
  onCreateArtifact,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  return (
    <ScrollArea className="min-h-0 flex-1 bg-background">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-5 px-4 py-6">
        {loading && (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            불러오는 중
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <h2 className="text-xl font-semibold">{CHAT_CONFIG.welcomeTitle}</h2>
            <p className="text-sm text-muted-foreground">{CHAT_CONFIG.welcomeMessage}</p>
          </div>
        )}

        {!loading &&
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              feedback={feedbackByMessageId[message.id]}
              onFeedback={onFeedback}
              onEdit={onEdit}
              onRegenerate={onRegenerate}
              onCreateArtifact={onCreateArtifact}
            />
          ))}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}

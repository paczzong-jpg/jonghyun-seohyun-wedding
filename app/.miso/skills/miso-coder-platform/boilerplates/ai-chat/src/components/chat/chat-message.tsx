import { Bot, Check, Clock, Copy, PanelRightOpen, Paperclip, Pencil, RefreshCcw, ThumbsDown, ThumbsUp, TriangleAlert, User } from "lucide-react"
import { Tool, ToolCode, ToolHeader, ToolSection } from "@/components/ai-elements/tool"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { readToolInvocations, toolOutputText } from "@/lib/chat-tool-protocol"
import type { DirectLlmToolInvocation } from "@/lib/miso-sdk/miso-llm"
import type { AttachmentMeta, ChatMessage as ChatMessageRecord, FeedbackRating } from "@/lib/chat-types"
import { cn } from "@/lib/utils"

type ChatMessageProps = {
  message: ChatMessageRecord
  feedback?: FeedbackRating
  onFeedback?: (message: ChatMessageRecord, rating: FeedbackRating) => void
  onEdit?: (message: ChatMessageRecord) => void
  onRegenerate?: (message: ChatMessageRecord) => void
  onCreateArtifact?: (message: ChatMessageRecord) => void
}

function renderText(content: string, streaming: boolean) {
  const text = streaming ? `${content}▌` : content
  return text.split(/(```[\s\S]*?```)/g).map((block, blockIndex) => {
    if (block.startsWith("```")) {
      const code = block.replace(/^```[^\n]*\n?/, "").replace(/```$/, "")
      return (
        <pre key={`code-${blockIndex}`} className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          <code className="font-mono">{code}</code>
        </pre>
      )
    }
    return block
      .split(/\n{2,}/)
      .filter((paragraph) => paragraph.trim().length > 0)
      .map((paragraph, paragraphIndex) => (
        <p key={`p-${blockIndex}-${paragraphIndex}`} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ))
  })
}

function AttachmentList({ attachments }: { attachments: AttachmentMeta[] }) {
  if (attachments.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {attachments.map((attachment) => (
        <Badge key={`${attachment.name}-${attachment.size}`} variant="secondary" className="max-w-56 gap-1 rounded-md">
          <Paperclip className="size-3 shrink-0" />
          <span className="truncate">{attachment.name}</span>
        </Badge>
      ))}
    </div>
  )
}

function StatusIcon({ status }: { status: ChatMessageRecord["status"] }) {
  if (status === "streaming" || status === "pending") return <Clock className="size-3" />
  if (status === "error") return <TriangleAlert className="size-3 text-destructive" />
  return <Check className="size-3" />
}

function reasoningText(message: ChatMessageRecord): string | null {
  const reasoning = message.metadata?.reasoning
  return typeof reasoning === "string" && reasoning.trim().length > 0 ? reasoning.trim() : null
}

function compactJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function ToolInvocationList({ invocations }: { invocations: DirectLlmToolInvocation[] }) {
  if (invocations.length === 0) return null
  return (
    <div className="grid gap-2">
      {invocations.map((invocation) => (
        <Tool key={invocation.toolCallId}>
          <ToolHeader name={invocation.toolName} state={invocation.state} />
          <ToolSection title="Input">
            <ToolCode value={compactJson(invocation.input)} />
          </ToolSection>
          <ToolSection title="Result">
            <p className={cn("whitespace-pre-wrap", invocation.state === "output-error" && "text-destructive")}>{toolOutputText(invocation)}</p>
          </ToolSection>
        </Tool>
      ))}
    </div>
  )
}

export function ChatMessage({ message, feedback, onFeedback, onEdit, onRegenerate, onCreateArtifact }: ChatMessageProps) {
  const isUser = message.role === "user"
  const isStreaming = message.status === "streaming" || message.status === "pending"
  const reasoning = !isUser ? reasoningText(message) : null
  const toolInvocations = !isUser ? readToolInvocations(message.metadata) : []

  return (
    <article className={cn("group flex items-start gap-3", isUser && "flex-row-reverse")}>
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className={cn("text-xs", isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn("flex min-w-0 max-w-3xl flex-col gap-2", isUser && "items-end")}>
        <AttachmentList attachments={message.attachments} />
        <div
          className={cn(
            "flex min-w-0 flex-col gap-2 rounded-lg px-4 py-3 text-sm leading-relaxed",
            isUser ? "bg-primary text-primary-foreground" : "border border-border bg-card text-card-foreground",
            message.status === "error" && "border-destructive/50",
          )}
        >
          {reasoning && (
            <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium">Reasoning</span>
              <p className="mt-1 whitespace-pre-wrap">{reasoning}</p>
            </div>
          )}
          <ToolInvocationList invocations={toolInvocations} />
          {message.content ? renderText(message.content, isStreaming) : isStreaming && toolInvocations.length === 0 ? renderText("", true) : null}
        </div>
        <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", isUser && "flex-row-reverse")}>
          <StatusIcon status={message.status} />
          <span>{new Date(message.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
          {!isStreaming && message.content && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="복사"
              onClick={() => void navigator.clipboard.writeText(message.content)}
            >
              <Copy className="size-3" />
            </Button>
          )}
          {!isStreaming && isUser && onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="수정"
              onClick={() => onEdit(message)}
            >
              <Pencil className="size-3" />
            </Button>
          )}
          {!isStreaming && !isUser && onRegenerate && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="다시 생성"
              onClick={() => onRegenerate(message)}
            >
              <RefreshCcw className="size-3" />
            </Button>
          )}
          {!isStreaming && !isUser && onCreateArtifact && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Canvas로 열기"
              onClick={() => onCreateArtifact(message)}
            >
              <PanelRightOpen className="size-3" />
            </Button>
          )}
          {!isStreaming && !isUser && onFeedback && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("size-6 opacity-0 transition-opacity group-hover:opacity-100", feedback === "up" && "opacity-100 text-primary")}
                aria-label="좋아요"
                onClick={() => onFeedback(message, "up")}
              >
                <ThumbsUp className="size-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("size-6 opacity-0 transition-opacity group-hover:opacity-100", feedback === "down" && "opacity-100 text-destructive")}
                aria-label="싫어요"
                onClick={() => onFeedback(message, "down")}
              >
                <ThumbsDown className="size-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

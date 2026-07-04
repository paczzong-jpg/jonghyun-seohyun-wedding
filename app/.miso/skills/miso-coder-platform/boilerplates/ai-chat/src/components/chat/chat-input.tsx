import { useEffect, useRef, useState } from "react"
import type { ChangeEvent, KeyboardEvent } from "react"
import { Command, Paperclip, Send, Square, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CHAT_CONFIG, CHAT_COMMANDS } from "@/lib/chat-config"
import type { AttachmentDraft, ChatCommand, ChatEndpoint } from "@/lib/chat-types"
import { cn } from "@/lib/utils"

type ChatInputProps = {
  endpoint: ChatEndpoint
  isStreaming: boolean
  draftValue?: string | null
  suggestedActions?: readonly string[]
  onSend: (message: string, attachments: AttachmentDraft[]) => void
  onAbort: () => void
  onDraftApplied?: () => void
}

function draftFromFile(file: File): AttachmentDraft {
  return {
    id: `${file.name}_${file.size}_${file.lastModified}`,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    file,
  }
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function ChatInput({ endpoint, isStreaming, draftValue, suggestedActions = [], onSend, onAbort, onDraftApplied }: ChatInputProps) {
  const [value, setValue] = useState("")
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([])
  const [composing, setComposing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canSubmit = value.trim().length > 0 && !isStreaming
  const commandMatches = value.startsWith("/")
    ? CHAT_COMMANDS.filter((command) => command.label.startsWith(value.split(/\s+/)[0] || "/"))
    : []

  useEffect(() => {
    if (draftValue === undefined || draftValue === null) return
    setValue(draftValue)
    onDraftApplied?.()
  }, [draftValue, onDraftApplied])

  const submit = () => {
    const message = value.trim()
    if (!message || isStreaming) return
    onSend(message, attachments)
    setValue("")
    setAttachments([])
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || composing || event.nativeEvent.isComposing) return
    event.preventDefault()
    submit()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setAttachments((current) => [...current, ...files.map(draftFromFile)])
    event.target.value = ""
  }

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id))
  }

  const applyCommand = (command: ChatCommand) => {
    setValue((current) => {
      const body = current.replace(/^\/\S*\s*/, "")
      return `${command.label}${body ? ` ${body}` : " "}`
    })
  }

  const applySuggestedAction = (prompt: string) => {
    setValue(prompt)
  }

  return (
    <section className="shrink-0 border-t border-border bg-background px-3 py-3">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        {!isStreaming && value.length === 0 && suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map((prompt) => (
              <Button key={prompt} type="button" variant="outline" size="sm" className="h-8 rounded-md text-xs" onClick={() => applySuggestedAction(prompt)}>
                {prompt}
              </Button>
            ))}
          </div>
        )}

        {!isStreaming && commandMatches.length > 0 && (
          <div className="flex flex-wrap gap-2 rounded-md border border-border bg-card p-2">
            {commandMatches.map((command) => (
              <button
                key={command.id}
                type="button"
                className="inline-flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => applyCommand(command)}
              >
                <Command className="size-3 shrink-0" />
                <span className="font-medium">{command.label}</span>
                <span className="truncate text-muted-foreground">{command.hint}</span>
              </button>
            ))}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <span
                key={attachment.id}
                className="inline-flex min-w-0 max-w-56 items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                <Paperclip className="size-3 shrink-0" />
                <span className="truncate">{attachment.name}</span>
                <span className="shrink-0">{formatBytes(attachment.size)}</span>
                <button
                  type="button"
                  className="rounded text-muted-foreground hover:text-destructive"
                  aria-label={`${attachment.name} 제거`}
                  onClick={() => removeAttachment(attachment.id ?? attachment.name)}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-lg border border-border bg-card p-2 shadow-sm">
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="파일 첨부"
            disabled={isStreaming || !endpoint.supportsFiles}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-4" />
          </Button>

          <Textarea
            value={value}
            rows={1}
            placeholder={CHAT_CONFIG.placeholder}
            className={cn("max-h-44 min-h-11 flex-1 resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0")}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
          />

          {isStreaming ? (
            <Button type="button" variant="destructive" size="icon" className="shrink-0" aria-label="중지" onClick={onAbort}>
              <Square className="size-4" />
            </Button>
          ) : (
            <Button type="button" size="icon" className="shrink-0" aria-label="전송" disabled={!canSubmit} onClick={submit}>
              <Send className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

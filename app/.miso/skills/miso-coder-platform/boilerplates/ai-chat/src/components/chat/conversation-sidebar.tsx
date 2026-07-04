import { Archive, Bot, MessageSquare, Pin, PinOff, Plus, UserRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { ChatConversation, ChatIdentity } from "@/lib/chat-types"
import { cn } from "@/lib/utils"

type ConversationSidebarProps = {
  conversations: ChatConversation[]
  activeId: string | null
  identity: ChatIdentity | null
  onSelect: (id: string) => void
  onNew: () => void
  onArchive: (id: string) => void
  onTogglePinned: (conversation: ChatConversation) => void
}

type Group = {
  label: string
  items: ChatConversation[]
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function groupConversations(conversations: ChatConversation[]): Group[] {
  const now = new Date()
  const today = dayKey(now)
  const yesterdayDate = new Date(now)
  yesterdayDate.setDate(now.getDate() - 1)
  const yesterday = dayKey(yesterdayDate)
  const groups = new Map<string, ChatConversation[]>()
  for (const conversation of conversations) {
    const key = dayKey(new Date(conversation.updatedAt))
    const label = key === today ? "오늘" : key === yesterday ? "어제" : key
    groups.set(label, [...(groups.get(label) ?? []), conversation])
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
}

export function ConversationSidebar({
  conversations,
  activeId,
  identity,
  onSelect,
  onNew,
  onArchive,
  onTogglePinned,
}: ConversationSidebarProps) {
  const groups = groupConversations(conversations)

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 shrink-0 items-center gap-2 px-3">
        <Button variant="outline" size="sm" className="flex-1 justify-start gap-2" onClick={onNew}>
          <Plus className="size-4" />
          새 대화
        </Button>
      </div>
      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-3">
          {groups.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">대화 없음</p>}
          {groups.map((group) => (
            <section key={group.label} className="flex flex-col gap-1.5">
              <h2 className="px-2 text-xs font-medium text-muted-foreground">{group.label}</h2>
              <ul className="flex flex-col gap-1">
                {group.items.map((conversation) => (
                  <li key={conversation.id} className="group flex items-center gap-1">
                    <button
                      type="button"
                      className={cn(
                        "flex min-w-0 flex-1 flex-col gap-1 rounded-md px-2 py-2 text-left transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        activeId === conversation.id && "bg-accent text-accent-foreground",
                      )}
                      onClick={() => onSelect(conversation.id)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">{conversation.title}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1 pl-5">
                        {conversation.pinned && <Pin className="size-3 shrink-0 text-muted-foreground" />}
                        <Badge variant="secondary" className="h-5 max-w-28 rounded-sm px-1.5 text-xs">
                          <span className="truncate">{conversation.endpointLabel}</span>
                        </Badge>
                        <span className="truncate text-xs text-muted-foreground">{conversation.visibility}</span>
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label={conversation.pinned ? "고정 해제" : "고정"}
                      onClick={() => onTogglePinned(conversation)}
                    >
                      {conversation.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="보관"
                      onClick={() => onArchive(conversation.id)}
                    >
                      <Archive className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </ScrollArea>

      <Separator />
      <div className="flex items-center gap-2 p-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          {identity?.source === "miso" ? <Bot className="size-4" /> : <UserRound className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{identity?.displayName ?? "Loading"}</p>
          <p className="truncate text-xs text-muted-foreground">{identity?.email ?? identity?.role ?? ""}</p>
        </div>
      </div>
    </aside>
  )
}

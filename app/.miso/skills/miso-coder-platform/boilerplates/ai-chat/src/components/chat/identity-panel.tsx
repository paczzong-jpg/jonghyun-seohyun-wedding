import { useEffect, useState } from "react"
import { UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TEAM_MEMBERS } from "@/lib/chat-config"
import type { ChatIdentity } from "@/lib/chat-types"

type IdentityPanelProps = {
  identity: ChatIdentity | null
  onChange: (identity: ChatIdentity) => void
}

export function IdentityPanel({ identity, onChange }: IdentityPanelProps) {
  const [draft, setDraft] = useState<ChatIdentity | null>(identity)
  const locked = draft?.source === "miso"

  useEffect(() => {
    setDraft(identity)
  }, [identity])

  if (!draft) {
    return (
      <Button variant="outline" size="sm" disabled>
        Loading
      </Button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-44 justify-start gap-2">
          <UserRound className="size-4 shrink-0" />
          <span className="truncate">{draft.displayName}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="chat-display-name">이름</Label>
            <Input
              id="chat-display-name"
              value={draft.displayName}
              disabled={locked}
              onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="chat-email">이메일</Label>
            <Input
              id="chat-email"
              value={draft.email ?? ""}
              disabled={locked}
              onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>역할</Label>
            <Select
              value={draft.role}
              disabled={locked}
              onValueChange={(role) => {
                if (role === "owner" || role === "member" || role === "guest") setDraft({ ...draft, role })
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">owner</SelectItem>
                <SelectItem value="member">member</SelectItem>
                <SelectItem value="guest">guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!locked && (
            <div className="flex flex-wrap gap-1.5">
              {TEAM_MEMBERS.map((member) => (
                <Button
                  key={member.name}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      userKey: `guest:${member.name.toLowerCase()}`,
                      displayName: member.name,
                      role: member.role,
                      source: "guest",
                    })
                  }
                >
                  {member.name}
                </Button>
              ))}
            </div>
          )}
          <Button type="button" onClick={() => onChange(draft)} disabled={locked}>
            저장
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

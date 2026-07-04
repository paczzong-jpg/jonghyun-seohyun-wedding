import { Globe, Lock, UsersRound } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ConversationVisibility } from "@/lib/chat-types"

type VisibilitySelectorProps = {
  value: ConversationVisibility
  onChange: (value: ConversationVisibility) => void
}

const options: Array<{ value: ConversationVisibility; label: string; icon: typeof Lock }> = [
  { value: "private", label: "비공개", icon: Lock },
  { value: "team", label: "팀", icon: UsersRound },
  { value: "public", label: "공개", icon: Globe },
]

export function VisibilitySelector({ value, onChange }: VisibilitySelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      className="rounded-md border border-border bg-background p-0.5"
      onValueChange={(next) => {
        if (next === "private" || next === "team" || next === "public") onChange(next)
      }}
    >
      {options.map((option) => {
        const Icon = option.icon
        return (
          <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label} className="h-8 gap-1 px-2 text-xs">
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}

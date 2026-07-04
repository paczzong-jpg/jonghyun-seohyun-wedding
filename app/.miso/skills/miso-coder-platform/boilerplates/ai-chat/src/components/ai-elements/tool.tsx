import { Check, ChevronDown, Clock, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ToolState = "input-available" | "output-available" | "output-error"

type ToolProps = {
  children: ReactNode
}

type ToolHeaderProps = {
  name: string
  state: ToolState
}

type ToolSectionProps = {
  title: string
  children: ReactNode
}

function stateLabel(state: ToolState): string {
  if (state === "output-available") return "Completed"
  if (state === "output-error") return "Error"
  return "Running"
}

function StateIcon({ state }: { state: ToolState }) {
  if (state === "output-available") return <Check className="size-3" />
  if (state === "output-error") return <TriangleAlert className="size-3" />
  return <Clock className="size-3" />
}

export function Tool({ children }: ToolProps) {
  return <div className="overflow-hidden rounded-md border border-border bg-muted/50 text-xs">{children}</div>
}

export function ToolHeader({ name, state }: ToolHeaderProps) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-2 border-b border-border px-3">
      <div className="flex min-w-0 items-center gap-2">
        <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{name}</span>
      </div>
      <Badge
        variant={state === "output-error" ? "destructive" : "secondary"}
        className={cn("h-5 shrink-0 gap-1 rounded-sm px-1.5 text-[10px]", state === "input-available" && "bg-background")}
      >
        <StateIcon state={state} />
        {stateLabel(state)}
      </Badge>
    </div>
  )
}

export function ToolSection({ title, children }: ToolSectionProps) {
  return (
    <div className="grid gap-1 px-3 py-2">
      <div className="font-medium text-muted-foreground">{title}</div>
      {children}
    </div>
  )
}

export function ToolCode({ value }: { value: string }) {
  return (
    <pre className="max-h-40 overflow-auto rounded-sm bg-background p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
      <code>{value}</code>
    </pre>
  )
}


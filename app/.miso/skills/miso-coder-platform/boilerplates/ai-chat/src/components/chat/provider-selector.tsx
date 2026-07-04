import { Bot, BrainCircuit, Check, Cpu } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ChatEndpoint } from "@/lib/chat-types"

type ProviderSelectorProps = {
  endpoints: ChatEndpoint[]
  selectedEndpoint: ChatEndpoint
  onChange: (endpointId: string) => void
}

function ProviderIcon({ kind }: { kind: ChatEndpoint["kind"] }) {
  if (kind === "agent") return <Bot className="size-4" />
  if (kind === "advanced-chat") return <BrainCircuit className="size-4" />
  return <Cpu className="size-4" />
}

export function ProviderSelector({ endpoints, selectedEndpoint, onChange }: ProviderSelectorProps) {
  return (
    <Select value={selectedEndpoint.id} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-44 gap-2">
        <ProviderIcon kind={selectedEndpoint.kind} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="w-72">
        {endpoints.map((endpoint) => (
          <SelectItem key={endpoint.id} value={endpoint.id}>
            <span className="flex w-full items-center gap-2">
              <ProviderIcon kind={endpoint.kind} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2">
                  <span>{endpoint.label}</span>
                  {endpoint.id === selectedEndpoint.id && <Check className="size-3" />}
                </span>
                <span className="text-xs text-muted-foreground">{endpoint.description}</span>
              </span>
              {endpoint.kind !== "direct-llm" && !endpoint.appId && (
                <Badge variant="outline" className="rounded-sm">
                  env
                </Badge>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

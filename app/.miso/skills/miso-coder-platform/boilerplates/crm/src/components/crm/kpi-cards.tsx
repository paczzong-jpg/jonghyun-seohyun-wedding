import { Building2, CircleDollarSign, FileText, TrendingUp, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { DashboardSummary } from "@/lib/crm-types"

type KpiCardsProps = {
  summary: DashboardSummary | null
}

function money(value: number): string {
  return `${Math.round(value / 10000).toLocaleString("ko-KR")}만`
}

export function KpiCards({ summary }: KpiCardsProps) {
  const items = [
    { label: "Companies", value: summary?.companies ?? 0, icon: Building2 },
    { label: "Contacts", value: summary?.contacts ?? 0, icon: Users },
    { label: "Open deals", value: summary?.openDeals ?? 0, icon: TrendingUp },
    { label: "Pipeline", value: money(summary?.pipelineValue ?? 0), icon: CircleDollarSign },
    { label: "Open quotes", value: summary?.openQuotes ?? 0, icon: FileText },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <item.icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="truncate text-xl font-semibold">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

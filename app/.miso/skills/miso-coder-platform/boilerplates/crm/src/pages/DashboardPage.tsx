import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KpiCards } from "@/components/crm/kpi-cards"
import { PageHeader } from "@/components/crm/page-header"
import { DEAL_STAGE_LABEL, DEAL_STAGE_TONE, DEAL_STAGES, QUOTE_STATUS_LABEL, TASK_STATUS_LABEL } from "@/lib/crm-config"
import { dashboardSummary } from "@/lib/crm-store"
import type { DashboardSummary } from "@/lib/crm-types"
import { cn } from "@/lib/utils"

function money(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const data = await dashboardSummary()
        if (mounted) setSummary(data)
      } catch {
        toast.error("Dashboard를 불러오지 못했습니다.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <>
      <PageHeader title="Dashboard" description="Pipeline health, close motion, tasks, and quote status." />
      <KpiCards summary={summary} />

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stage distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {loading && <p className="text-sm text-muted-foreground">Loading</p>}
            {!loading && DEAL_STAGES.map((stage) => {
              const count = summary?.stageCounts[stage] ?? 0
              const max = Math.max(...DEAL_STAGES.map((item) => summary?.stageCounts[item] ?? 0), 1)
              return (
                <div key={stage} className="grid gap-2 md:grid-cols-[10rem_1fr_3rem] md:items-center">
                  <Badge className={cn("w-fit rounded-sm", DEAL_STAGE_TONE[stage])}>{DEAL_STAGE_LABEL[stage]}</Badge>
                  <progress className="h-2 w-full overflow-hidden rounded-full bg-muted accent-primary" value={count} max={max} />
                  <span className="text-sm text-muted-foreground">{count}</span>
                </div>
              )
            })}
            <div className="grid gap-2 border-t border-border pt-3 text-sm md:grid-cols-3">
              <span>Pipeline {money(summary?.pipelineValue ?? 0)}</span>
              <span>Weighted {money(summary?.weightedPipeline ?? 0)}</span>
              <span>Won {money(summary?.wonValue ?? 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Due tasks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {summary?.dueTasks.length === 0 && <p className="text-sm text-muted-foreground">No open tasks</p>}
            {summary?.dueTasks.map((task) => (
              <div key={task.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <Badge variant="secondary">{TASK_STATUS_LABEL[task.status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{task.owner} · {task.dueDate || "no due date"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent deals</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {summary?.recentDeals.length === 0 && <p className="text-sm text-muted-foreground">No deals</p>}
            {summary?.recentDeals.map((deal) => (
              <div key={deal.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{deal.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{deal.companyName || deal.owner}</p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge className={cn("rounded-sm", DEAL_STAGE_TONE[deal.stage])}>{DEAL_STAGE_LABEL[deal.stage]}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{money(deal.value)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active quotes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {summary?.activeQuotes.length === 0 && <p className="text-sm text-muted-foreground">No active quotes</p>}
            {summary?.activeQuotes.map((quote) => (
              <div key={quote.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{quote.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{quote.companyName || quote.owner}</p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge variant="outline">{QUOTE_STATUS_LABEL[quote.status]}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{money(quote.amount)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DEAL_STAGE_LABEL, DEAL_STAGE_TONE, DEAL_STAGES } from "@/lib/crm-config"
import { allDeals, deleteDeal, moveDealStage } from "@/lib/crm-store"
import type { Deal, DealStage } from "@/lib/crm-types"
import { cn } from "@/lib/utils"

type PipelineBoardProps = {
  refreshKey: number
  onAdd: (stage: DealStage) => void
  onEdit: (deal: Deal) => void
}

function money(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`
}

export function PipelineBoard({ refreshKey, onAdd, onEdit }: PipelineBoardProps) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const rows = await allDeals()
        if (mounted) setDeals(rows)
      } catch {
        toast.error("Pipeline을 불러오지 못했습니다.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [refreshKey])

  const byStage = useMemo(() => {
    return DEAL_STAGES.reduce(
      (acc, stage) => ({ ...acc, [stage]: deals.filter((deal) => deal.stage === stage) }),
      {} as Record<DealStage, Deal[]>,
    )
  }, [deals])

  async function move(id: string, stage: DealStage) {
    const previous = deals
    setDeals((current) => current.map((deal) => (deal.id === id ? { ...deal, stage } : deal)))
    try {
      await moveDealStage(id, stage)
    } catch {
      setDeals(previous)
      toast.error("Stage 변경에 실패했습니다.")
    }
  }

  async function remove(id: string) {
    const previous = deals
    setDeals((current) => current.filter((deal) => deal.id !== id))
    try {
      await deleteDeal(id)
      toast.success("Deal deleted")
    } catch {
      setDeals(previous)
      toast.error("Deal 삭제에 실패했습니다.")
    }
  }

  if (loading) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading pipeline</CardContent></Card>
  }

  return (
    <div className="grid gap-3 overflow-x-auto pb-2 lg:grid-cols-6">
      {DEAL_STAGES.map((stage) => {
        const rows = byStage[stage]
        const total = rows.reduce((sum, deal) => sum + deal.value, 0)
        return (
          <Card
            key={stage}
            className="min-w-64"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const id = event.dataTransfer.getData("text/plain")
              if (id) void move(id, stage)
              setDraggingId(null)
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Badge className={cn("rounded-sm", DEAL_STAGE_TONE[stage])}>{DEAL_STAGE_LABEL[stage]}</Badge>
                  <span className="text-xs text-muted-foreground">{rows.length}</span>
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{money(total)}</p>
              </div>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Deal 추가" onClick={() => onAdd(stage)}>
                <Plus className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex min-h-48 flex-col gap-2 p-3 pt-0">
              {rows.length === 0 && <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Empty</p>}
              {rows.map((deal) => (
                <article
                  key={deal.id}
                  draggable
                  className={cn("rounded-md border border-border bg-background p-3 shadow-sm", draggingId === deal.id && "opacity-50")}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", deal.id)
                    setDraggingId(deal.id)
                  }}
                  onDragEnd={() => setDraggingId(null)}
                >
                  <button type="button" className="block w-full truncate text-left text-sm font-medium hover:text-primary" onClick={() => onEdit(deal)}>
                    {deal.title}
                  </button>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{deal.companyName || "No company"}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{money(deal.value)}</span>
                    <Button variant="ghost" size="icon" className="size-7" aria-label="삭제" onClick={() => void remove(deal.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {DEAL_STAGES.filter((next) => next !== deal.stage).slice(0, 3).map((next) => (
                      <Button key={next} variant="secondary" size="sm" className="h-6 px-2 text-xs" onClick={() => void move(deal.id, next)}>
                        {DEAL_STAGE_LABEL[next]}
                      </Button>
                    ))}
                  </div>
                </article>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

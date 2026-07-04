import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Kpi } from "@/lib/dashboard-data"

/** 지표 카드 그리드. data 배열을 받아 카드로 렌더한다. (실측 공통 패턴 distill) */
export function KpiCards({ items }: { items: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((kpi) => {
        const up = kpi.change !== null && kpi.change >= 0
        return (
          <Card key={kpi.title} className="shadow-sm">
            <CardContent className="p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{kpi.title}</span>
                <kpi.icon className="size-4 text-primary" />
              </div>
              <div className="mb-1 flex items-baseline gap-1.5">
                <span className="text-2xl leading-tight font-bold text-foreground">{kpi.value}</span>
                <span className="text-xs text-muted-foreground">{kpi.unit}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {kpi.change !== null ? (
                  <>
                    <span className={cn("flex items-center gap-0.5 font-medium", up ? "text-chart-2" : "text-destructive")}>
                      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {up ? "+" : ""}{kpi.change}%
                    </span>
                    <span className="text-muted-foreground">{kpi.compareLabel}</span>
                  </>
                ) : (
                  <span className="flex items-center gap-0.5 font-medium text-muted-foreground">
                    <Target className="size-3" />
                    {kpi.compareLabel}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

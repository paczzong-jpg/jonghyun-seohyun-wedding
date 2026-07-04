import { useId } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { SeriesPoint } from "@/lib/dashboard-data"

/** recharts 영역 차트 래퍼. 색상은 테마 토큰(var(--color-chart-1)) 사용. data=[] 이면 빈 카드를 표시한다. */
export function OverviewChart({ title, data }: { title: string; data: SeriesPoint[] }) {
  const gid = useId()

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            데이터 없음
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} width={48}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                color: "var(--color-foreground)",
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey="value" stroke="var(--color-chart-1)" strokeWidth={2} fill={`url(#${gid})`} />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

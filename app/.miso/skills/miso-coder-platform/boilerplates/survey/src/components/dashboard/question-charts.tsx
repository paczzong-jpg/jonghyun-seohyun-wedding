import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import type { AggregateStats, Question } from "@/lib/survey-data"

interface QuestionChartsProps {
  stats: AggregateStats
  questions: Question[]
}

const BAR_PRIMARY = "hsl(var(--primary))"
const BAR_MUTED = "hsl(var(--muted-foreground))"
const CHART_GRID = "hsl(var(--border))"
const CHART_TICK = "hsl(var(--muted-foreground))"
const CHART_TEXT = "hsl(var(--foreground))"
const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: `1px solid ${CHART_GRID}`,
  fontSize: 12,
}

/** 문항별 응답 분포 차트 섹션. single/multiple/scale 문항을 시각화한다. */
export function QuestionCharts({ stats, questions }: QuestionChartsProps) {
  const chartableQuestions = questions.filter((q) => q.type !== "text")

  if (chartableQuestions.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">문항별 응답 분포</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {chartableQuestions.map((q, i) => {
          const agg = stats.perQuestion[q.id]
          if (!agg) return null

          if (q.type === "single" || q.type === "multiple") {
            return (
              <OptionBarChart
                key={q.id}
                question={q}
                index={i}
                optionCounts={agg.optionCounts ?? {}}
                answeredCount={agg.answeredCount}
              />
            )
          }

          if (q.type === "scale") {
            return (
              <ScaleBarChart
                key={q.id}
                question={q}
                index={i}
                scaleDist={agg.scaleDist ?? {}}
                scaleAvg={agg.scaleAvg ?? 0}
                answeredCount={agg.answeredCount}
              />
            )
          }

          return null
        })}
      </div>
    </div>
  )
}

// ── 객관식/다중선택 수평 바 ────────────────────────────────

interface OptionBarChartProps {
  question: Question
  index: number
  optionCounts: Record<string, number>
  answeredCount: number
}

function OptionBarChart({ question, index, optionCounts, answeredCount }: OptionBarChartProps) {
  const options = question.options ?? []
  const data = options.map((opt) => ({
    name: opt.label.length > 18 ? opt.label.slice(0, 18) + "…" : opt.label,
    fullName: opt.label,
    count: optionCounts[opt.id] ?? 0,
  }))

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-2">
        <p className="text-xs font-medium text-primary">{question.category}</p>
        <CardTitle className="text-sm font-semibold text-card-foreground leading-snug">
          Q{index + 1}. {question.text.length > 40 ? question.text.slice(0, 40) + "…" : question.text}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {question.type === "multiple" ? "다중 선택" : "단일 선택"} · {answeredCount}명 응답
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(120, data.length * 44)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, maxCount]}
              tick={{ fontSize: 11, fill: CHART_TICK }}
              tickCount={maxCount + 1}
              allowDecimals={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              tick={{ fontSize: 11, fill: CHART_TEXT }}
            />
            <Tooltip
              formatter={(value: number) => [`${value}명`, "응답 수"]}
              labelFormatter={(_label, payload) => {
                const p = payload as Array<{ payload?: { fullName?: string } }>
                return p[0]?.payload?.fullName ?? _label
              }}
              contentStyle={TOOLTIP_STYLE}
            />
            <Bar dataKey="count" name="응답 수" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.count === maxCount ? BAR_PRIMARY : BAR_MUTED}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ── 척도 분포 수직 바 ─────────────────────────────────────

interface ScaleBarChartProps {
  question: Question
  index: number
  scaleDist: Record<number, number>
  scaleAvg: number
  answeredCount: number
}

function ScaleBarChart({ question, index, scaleDist, scaleAvg, answeredCount }: ScaleBarChartProps) {
  const min = question.scaleMin ?? 1
  const max = question.scaleMax ?? 5

  const data = Array.from({ length: max - min + 1 }, (_, i) => {
    const val = min + i
    return { name: String(val), value: val, count: scaleDist[val] ?? 0 }
  })

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-2">
        <p className="text-xs font-medium text-primary">{question.category}</p>
        <CardTitle className="text-sm font-semibold text-card-foreground leading-snug">
          Q{index + 1}. {question.text.length > 40 ? question.text.slice(0, 40) + "…" : question.text}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          척도 {min}~{max} · {answeredCount}명 응답 ·{" "}
          <span className="font-medium text-primary">평균 {scaleAvg}점</span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-1 flex justify-between text-xs text-muted-foreground px-1">
          <span>{question.scaleMinLabel}</span>
          <span>{question.scaleMaxLabel}</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 13, fill: CHART_TICK }} />
            <YAxis
              domain={[0, maxCount]}
              tick={{ fontSize: 11, fill: CHART_TICK }}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: number) => [`${value}명`, "응답 수"]}
              contentStyle={TOOLTIP_STYLE}
            />
            <ReferenceLine
              x={String(Math.round(scaleAvg))}
              stroke={BAR_PRIMARY}
              strokeDasharray="4 2"
              strokeWidth={2}
              label={{ value: `avg ${scaleAvg}`, position: "top", fontSize: 11, fill: BAR_PRIMARY }}
            />
            <Bar dataKey="count" name="응답 수" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.count === maxCount ? BAR_PRIMARY : BAR_MUTED}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

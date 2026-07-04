import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type ScheduleItem = {
  /** Session.id와 연결 (세션 식별용). */
  id?: string
  time: string
  title: string
  speaker?: string
  /** 세션 소개 — SESSIONS에서 파생되어 채워진다. */
  description?: string
  /** 키워드 배지 목록 — SESSIONS.keywords에서 파생된다. */
  keywords?: string[]
  tag?: string
  tagVariant?: "default" | "secondary" | "outline" | "destructive"
}

type Props = {
  items: ScheduleItem[]
}

/** 행사 일정 타임라인 섹션 */
export function ScheduleSection({ items }: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">일정</h2>
      <div className="relative space-y-3 pl-4">
        {/* 타임라인 세로선 */}
        <div className="absolute left-0 top-2 h-[calc(100%-1rem)] w-px bg-border" />

        {items.map((item, i) => (
          <div key={i} className="relative flex gap-4">
            {/* 타임라인 점 */}
            <div
              className={cn(
                "absolute -left-[0.3125rem] top-[0.875rem] size-2.5 rounded-full border-2 border-background",
                item.tag ? "bg-primary" : "bg-muted-foreground/40",
              )}
            />

            <Card className="ml-4 flex-1 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">{item.time}</p>
                    <p className="font-medium text-foreground">{item.title}</p>
                    {item.speaker && (
                      <p className="text-sm text-muted-foreground">{item.speaker}</p>
                    )}
                    {item.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {item.description}
                      </p>
                    )}
                    {item.keywords && item.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.keywords.map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-xs px-1.5 py-0">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {item.tag && (
                    <Badge variant={item.tagVariant ?? "secondary"} className="shrink-0">
                      {item.tag}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </section>
  )
}

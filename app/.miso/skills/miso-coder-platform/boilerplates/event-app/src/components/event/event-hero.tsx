import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Users } from "lucide-react"
import { DEFAULT_EVENT_CODE } from "@/lib/event-data"

type Props = {
  title: string
  tagline: string
  date: string
  venue: string
  capacity: string
}

/** 행사 소개 히어로 섹션 — 제목·날짜·장소·CTA 버튼 */
export function EventHero({ title, tagline, date, venue, capacity }: Props) {
  const navigate = useNavigate()

  return (
    <section className="rounded-2xl bg-primary px-6 py-14 text-primary-foreground md:px-12 md:py-20">
      <div className="space-y-6">
        <Badge variant="secondary" className="w-fit bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25">
          2026 · MISO Coder Event
        </Badge>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{title}</h1>
          <p className="max-w-xl text-lg text-primary-foreground/80">{tagline}</p>
        </div>

        {/* 메타 정보 */}
        <div className="flex flex-wrap gap-4 text-sm text-primary-foreground/80">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-4" />
            {date}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" />
            {venue}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4" />
            {capacity}
          </span>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            variant="secondary"
            className="font-semibold"
            onClick={() => navigate(`/join/${DEFAULT_EVENT_CODE}`)}
          >
            체크인하고 참여
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate("/quiz")}
          >
            라이브 퀴즈
          </Button>
        </div>
      </div>
    </section>
  )
}

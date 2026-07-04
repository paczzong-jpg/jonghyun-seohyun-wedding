import { Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { QuizPlayer } from "@/lib/event-data"

type Props = {
  players: QuizPlayer[]
  currentParticipantId?: string
  limit?: number
}

export function QuizLeaderboard({ players, currentParticipantId, limit = 10 }: Props) {
  const visible = players.slice(0, limit)

  return (
    <div className="space-y-2">
      {visible.length === 0 ? (
        <p className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          아직 점수가 없습니다.
        </p>
      ) : (
        visible.map((player) => {
          const active = player.participantId === currentParticipantId
          return (
            <Card key={player.id} className={active ? "border-primary/50 bg-primary/5" : "shadow-sm"}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                  {player.rank || "-"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{player.displayName}</p>
                    {player.rank === 1 && <Trophy className="size-4 text-primary" />}
                    {active && <Badge variant="secondary">나</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    정답 {player.correctCount}개 · 응답 {player.answeredCount}개
                  </p>
                </div>
                <p className="text-lg font-bold tabular-nums text-foreground">{player.score}</p>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

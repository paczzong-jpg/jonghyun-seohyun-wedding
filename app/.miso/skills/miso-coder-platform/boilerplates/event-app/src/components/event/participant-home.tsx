import { Gift, MessageCircle, Trophy, UserCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Participant } from "@/lib/event-data"

type Props = {
  participant: Participant
}

export function ParticipantHome({ participant }: Props) {
  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10">
              <UserCheck className="size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-foreground">{participant.name}</p>
              <p className="text-sm text-muted-foreground">{participant.affiliation}</p>
            </div>
            <Badge variant="secondary">체크인 완료</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            행사 코드 <span className="font-mono text-foreground">{participant.eventCode}</span>로 참여 중입니다.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/qna">
          <Button variant="outline" className="h-24 w-full flex-col gap-2">
            <MessageCircle className="size-5" />
            Q&A
          </Button>
        </Link>
        <Link to="/quiz">
          <Button variant="outline" className="h-24 w-full flex-col gap-2">
            <Trophy className="size-5" />
            라이브 퀴즈
          </Button>
        </Link>
        <Link to="/draw">
          <Button variant="outline" className="h-24 w-full flex-col gap-2">
            <Gift className="size-5" />
            경품추첨
          </Button>
        </Link>
      </div>
    </div>
  )
}

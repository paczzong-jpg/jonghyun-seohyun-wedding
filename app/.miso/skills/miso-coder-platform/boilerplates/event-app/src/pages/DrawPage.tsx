import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DEFAULT_EVENT_CODE,
  listDrawWinners,
  subscribeDrawWinners,
  type DrawWinner,
} from "@/lib/event-data"
import { readParticipantSession } from "@/lib/participant-session"

export function DrawPage() {
  const participant = readParticipantSession(DEFAULT_EVENT_CODE)
  const [winners, setWinners] = useState<DrawWinner[]>([])

  useEffect(() => {
    listDrawWinners(DEFAULT_EVENT_CODE).then(setWinners)
  }, [])

  useEffect(() => {
    let active = true
    let unsub: () => void = () => {}
    subscribeDrawWinners((action, record) => {
      if (!active) return
      setWinners((prev) => {
        if (action === "delete") return prev.filter((winner) => winner.id !== record.id)
        return [record, ...prev.filter((winner) => winner.id !== record.id)]
      })
    }).then((fn) => { unsub = fn })
    return () => {
      active = false
      unsub()
    }
  }, [])

  if (!participant) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">체크인이 필요합니다</h1>
        <p className="text-sm text-muted-foreground">체크인 완료 참가자만 경품추첨 후보에 포함됩니다.</p>
        <Link to={`/join/${DEFAULT_EVENT_CODE}`}>
          <Button>체크인하기</Button>
        </Link>
      </div>
    )
  }

  const myWin = winners.find((winner) => winner.participantId === participant.id && !winner.voided)

  return (
    <div className="mx-auto max-w-md">
      <Card className="shadow-sm">
        <CardContent className="space-y-5 p-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Gift className="size-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {myWin ? "당첨되었습니다" : "경품추첨 대기 중"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {myWin
                ? `${myWin.participantName}님, 운영자 안내에 따라 경품을 수령해 주세요.`
                : "체크인 완료 상태입니다. 운영자가 추첨을 시작하면 발표자 화면에 당첨자가 표시됩니다."}
            </p>
          </div>
          <Link to="/quiz">
            <Button variant="outline" className="w-full">라이브 퀴즈로 이동</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

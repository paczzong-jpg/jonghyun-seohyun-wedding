import { useCallback, useEffect, useMemo, useState } from "react"
import { Gift, RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DEFAULT_EVENT_CODE,
  drawPrizeWinner,
  listDrawPrizes,
  listDrawWinners,
  listParticipants,
  subscribeDrawWinners,
  subscribeParticipants,
  type DrawPrize,
  type DrawWinner,
  type Participant,
} from "@/lib/event-data"
import { getEligibleDrawCandidates } from "@/lib/draw-state"

type Props = {
  eventCode?: string
}

export function DrawAdminPanel({ eventCode = DEFAULT_EVENT_CODE }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [prizes, setPrizes] = useState<DrawPrize[]>([])
  const [winners, setWinners] = useState<DrawWinner[]>([])
  const [selectedPrizeId, setSelectedPrizeId] = useState("")
  const [drawing, setDrawing] = useState(false)
  const [latestWinner, setLatestWinner] = useState<DrawWinner | null>(null)

  const load = useCallback(async () => {
    const [ps, prizeRows, winnerRows] = await Promise.all([
      listParticipants(eventCode),
      listDrawPrizes(eventCode),
      listDrawWinners(eventCode),
    ])
    setParticipants(ps)
    setPrizes(prizeRows)
    setWinners(winnerRows)
    setSelectedPrizeId((current) => current || prizeRows[0]?.id || "")
  }, [eventCode])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let active = true
    const unsubs: Array<() => void> = []
    subscribeParticipants((_, record) => {
      if (!active) return
      setParticipants((prev) => {
        const exists = prev.some((p) => p.id === record.id)
        return exists ? prev.map((p) => p.id === record.id ? record : p) : [...prev, record]
      })
    }).then((fn) => unsubs.push(fn))
    subscribeDrawWinners((_, record) => {
      if (!active) return
      setWinners((prev) => [record, ...prev.filter((winner) => winner.id !== record.id)])
      setLatestWinner(record)
    }).then((fn) => unsubs.push(fn))
    return () => {
      active = false
      unsubs.forEach((fn) => fn())
    }
  }, [])

  const candidates = useMemo(
    () => getEligibleDrawCandidates(participants, winners),
    [participants, winners],
  )
  const checkedInCount = participants.filter((p) => p.checkedIn).length
  const selectedPrize = prizes.find((prize) => prize.id === selectedPrizeId)

  async function draw() {
    if (!selectedPrizeId) return
    setDrawing(true)
    try {
      const winner = await drawPrizeWinner(eventCode, selectedPrizeId)
      setLatestWinner(winner)
      await load()
    } finally {
      setDrawing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="체크인" value={`${checkedInCount}명`} />
        <Stat label="후보" value={`${candidates.length}명`} />
        <Stat label="경품" value={`${prizes.length}개`} />
        <Stat label="당첨" value={`${winners.filter((w) => !w.voided).length}명`} />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="size-4" />
            경품추첨
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Select value={selectedPrizeId} onValueChange={setSelectedPrizeId}>
              <SelectTrigger>
                <SelectValue placeholder="경품 선택" />
              </SelectTrigger>
              <SelectContent>
                {prizes.map((prize) => (
                  <SelectItem key={prize.id} value={prize.id}>
                    {prize.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={draw} disabled={!selectedPrizeId || candidates.length === 0 || drawing}>
              <Sparkles className="mr-2 size-4" />
              {drawing ? "추첨 중..." : "추첨 시작"}
            </Button>
          </div>

          {selectedPrize && (
            <div className="rounded-lg border border-border bg-muted px-4 py-3">
              <p className="font-medium text-foreground">{selectedPrize.name}</p>
              <p className="text-sm text-muted-foreground">{selectedPrize.description}</p>
            </div>
          )}

          {latestWinner ? (
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-5 py-4">
              <p className="text-sm text-primary">최근 당첨자</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{latestWinner.participantName}</p>
            </div>
          ) : (
            <p className="rounded-lg border border-border px-4 py-6 text-center text-sm text-muted-foreground">
              아직 추첨 결과가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="size-4" />
            당첨 이력
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {winners.length === 0 ? (
            <p className="text-sm text-muted-foreground">당첨 이력이 없습니다.</p>
          ) : (
            winners.map((winner) => (
              <div key={winner.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="font-medium text-foreground">{winner.participantName}</p>
                  <p className="text-xs text-muted-foreground">{winner.drawnAt}</p>
                </div>
                <Badge variant={winner.voided ? "outline" : "secondary"}>
                  {winner.voided ? "취소" : "당첨"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}

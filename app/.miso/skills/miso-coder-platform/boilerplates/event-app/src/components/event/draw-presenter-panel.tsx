import { useCallback, useEffect, useState } from "react"
import { Gift, Sparkles } from "lucide-react"
import {
  DEFAULT_EVENT_CODE,
  listDrawPrizes,
  listDrawWinners,
  subscribeDrawWinners,
  type DrawPrize,
  type DrawWinner,
} from "@/lib/event-data"

type Props = {
  eventCode?: string
}

export function DrawPresenterPanel({ eventCode = DEFAULT_EVENT_CODE }: Props) {
  const [prizes, setPrizes] = useState<DrawPrize[]>([])
  const [winners, setWinners] = useState<DrawWinner[]>([])

  const load = useCallback(async () => {
    const [prizeRows, winnerRows] = await Promise.all([
      listDrawPrizes(eventCode),
      listDrawWinners(eventCode),
    ])
    setPrizes(prizeRows)
    setWinners(winnerRows)
  }, [eventCode])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let active = true
    let unsub: () => void = () => {}
    subscribeDrawWinners((_, record) => {
      if (!active) return
      setWinners((prev) => [record, ...prev.filter((winner) => winner.id !== record.id)])
    }).then((fn) => { unsub = fn })
    return () => {
      active = false
      unsub()
    }
  }, [])

  const latest = winners.find((winner) => !winner.voided)
  const prize = latest ? prizes.find((item) => item.id === latest.prizeId) : prizes[0]

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/20">
        <Gift className="size-10 text-primary" />
      </div>
      {latest ? (
        <div>
          <p className="text-lg text-background/60">{prize?.name ?? "경품"} 당첨자</p>
          <h1 className="mt-3 text-6xl font-bold text-background">{latest.participantName}</h1>
          <p className="mt-5 flex items-center justify-center gap-2 text-xl text-primary">
            <Sparkles className="size-6" />
            축하합니다
          </p>
        </div>
      ) : (
        <div>
          <h1 className="text-5xl font-bold text-background">경품추첨 대기 중</h1>
          <p className="mt-4 text-xl text-background/60">운영자가 추첨을 시작하면 당첨자가 표시됩니다.</p>
        </div>
      )}
    </div>
  )
}

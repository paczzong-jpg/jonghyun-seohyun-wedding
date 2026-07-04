import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { QuizParticipantPanel } from "@/components/event/quiz-participant-panel"
import { DEFAULT_EVENT_CODE } from "@/lib/event-data"
import { readParticipantSession } from "@/lib/participant-session"

export function QuizPage() {
  const participant = readParticipantSession(DEFAULT_EVENT_CODE)

  if (!participant) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">체크인이 필요합니다</h1>
        <p className="text-sm text-muted-foreground">
          QR 또는 행사 코드로 먼저 체크인해야 라이브 퀴즈에 참여할 수 있습니다.
        </p>
        <Link to={`/join/${DEFAULT_EVENT_CODE}`}>
          <Button>체크인하기</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <QuizParticipantPanel participant={participant} />
    </div>
  )
}

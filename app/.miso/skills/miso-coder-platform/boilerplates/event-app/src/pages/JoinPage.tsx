import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { JoinCheckinForm } from "@/components/event/join-checkin-form"
import { ParticipantHome } from "@/components/event/participant-home"
import { checkInParticipant, type Participant, type ParticipantInput } from "@/lib/event-data"
import { readParticipantSession, saveParticipantSession } from "@/lib/participant-session"
import { normalizeEventCode } from "@/lib/qr-code"

export function JoinPage() {
  const params = useParams()
  const eventCode = normalizeEventCode(params.eventCode)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setParticipant(readParticipantSession(eventCode))
  }, [eventCode])

  async function handleSubmit(input: ParticipantInput) {
    setSubmitting(true)
    setError(null)
    try {
      const created = await checkInParticipant(input)
      saveParticipantSession(created)
      setParticipant(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : "체크인에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <p className="text-sm font-medium text-primary">행사 코드 {eventCode}</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">모바일 체크인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          체크인 후 Q&A, 라이브 퀴즈, 경품추첨에 참여할 수 있습니다.
        </p>
      </div>

      {participant ? (
        <ParticipantHome participant={participant} />
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">참가자 정보</CardTitle>
            <CardDescription>현장 운영과 추첨 후보 확인에 사용됩니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <JoinCheckinForm eventCode={eventCode} isSubmitting={submitting} onSubmit={handleSubmit} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

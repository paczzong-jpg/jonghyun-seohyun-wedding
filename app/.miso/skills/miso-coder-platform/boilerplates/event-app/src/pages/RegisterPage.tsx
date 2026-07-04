import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RegisterForm } from "@/components/event/register-form"
import { DEFAULT_EVENT_CODE, registerParticipant, type ParticipantInput } from "@/lib/event-data"
import { useNavigate } from "react-router-dom"

type PageState = "form" | "success" | "error"

/**
 * 참가 신청 페이지.
 * 데이터 저장: registerParticipant() (src/lib/event-data.ts).
 * PocketBase 전환 시 해당 함수만 pb.collection("participants").create() 로 교체한다.
 */
export function RegisterPage() {
  const [pageState, setPageState] = useState<PageState>("form")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (input: ParticipantInput) => {
    setSubmitting(true)
    setErrorMsg(null)
    try {
      await registerParticipant(input)
      setPageState("success")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "신청 중 오류가 발생했습니다.")
      setPageState("error")
    } finally {
      setSubmitting(false)
    }
  }

  // 성공 화면
  if (pageState === "success") {
    return (
      <div className="mx-auto max-w-md">
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="size-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">신청 완료!</h2>
              <p className="text-sm text-muted-foreground">
                참가 신청이 접수되었습니다.
                <br />
                확인 메일을 발송했으니 확인해 주세요.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate(`/join/${DEFAULT_EVENT_CODE}`)}>
                체크인하기
              </Button>
              <Button onClick={() => navigate("/")}>홈으로</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">참가 신청</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          MISO Live 2026 참가를 신청합니다. 아래 정보를 입력해 주세요.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">신청 정보</CardTitle>
          <CardDescription>* 표시 항목은 필수입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {pageState === "error" && errorMsg && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMsg}
            </div>
          )}
          <RegisterForm onSubmit={handleSubmit} isSubmitting={submitting} />
        </CardContent>
      </Card>
    </div>
  )
}

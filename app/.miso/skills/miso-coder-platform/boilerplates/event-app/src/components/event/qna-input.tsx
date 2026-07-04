import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { QuestionInput } from "@/lib/event-data"

type Props = {
  onSubmit: (input: QuestionInput) => Promise<void>
  /** 세션별 Q&A에서 세션 ID를 전달하면 질문에 sessionId가 포함된다. */
  sessionId?: string
  /** 입력창 placeholder. 기본값: "발표자에게 궁금한 점을 질문하세요." */
  placeholder?: string
}

/** 질문 입력 폼 — 닉네임 + 질문 내용. sessionId prop으로 세션별 질문 등록을 지원한다. */
export function QnaInput({ onSubmit, sessionId, placeholder = "발표자에게 궁금한 점을 질문하세요." }: Props) {
  const [authorName, setAuthorName] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedContent = content.trim()
    if (!trimmedContent) { setError("질문 내용을 입력하세요."); return }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({
        authorName: authorName.trim() || "익명",
        content: trimmedContent,
        sessionId,
      })
      setContent("")
    } catch {
      setError("질문 등록에 실패했습니다. 다시 시도해 주세요.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="font-medium text-foreground">질문하기</h3>

      <div className="space-y-1.5">
        <Label htmlFor="qna-author">이름 (선택)</Label>
        <Input
          id="qna-author"
          placeholder="익명"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={30}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qna-content">질문 내용 *</Label>
        <Textarea
          id="qna-content"
          placeholder={placeholder}
          rows={3}
          value={content}
          onChange={(e) => { setContent(e.target.value); setError(null) }}
          maxLength={300}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-right text-xs text-muted-foreground">{content.length}/300</p>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "등록 중..." : "질문 등록"}
      </Button>
    </form>
  )
}

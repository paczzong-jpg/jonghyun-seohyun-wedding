import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { Question, AnswerValue, MultipleAnswer } from "@/lib/survey-data"

interface QuestionCardProps {
  question: Question
  index: number       // 0-based (표시는 1-based)
  value: AnswerValue | undefined
  onChange: (value: AnswerValue) => void
}

/**
 * 단일 문항 렌더러.
 * - single   → RadioGroup (shadcn)
 * - multiple → Checkbox 목록 (shadcn)
 * - scale    → Slider + 눈금 라벨 (shadcn)
 * - text     → Textarea (shadcn, optional 표시)
 */
export function QuestionCard({ question, index, value, onChange }: QuestionCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <p className="text-xs font-medium text-primary">{question.category}</p>
        <CardTitle className="text-base leading-snug font-semibold text-foreground">
          Q{index + 1}. {question.text}
          {question.optional && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">(선택)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {question.type === "single" && (
          <SingleQuestion
            question={question}
            value={value as string | undefined}
            onChange={onChange}
          />
        )}
        {question.type === "multiple" && (
          <MultipleQuestion
            question={question}
            value={(value as string[] | undefined) ?? []}
            onChange={onChange}
          />
        )}
        {question.type === "scale" && (
          <ScaleQuestion
            question={question}
            value={value as number | undefined}
            onChange={onChange}
          />
        )}
        {question.type === "text" && (
          <TextQuestion
            value={value as string | undefined}
            onChange={onChange}
          />
        )}
      </CardContent>
    </Card>
  )
}

// ── 객관식 단일 선택 ───────────────────────────────────────

interface SingleQuestionProps {
  question: Question
  value: string | undefined
  onChange: (value: AnswerValue) => void
}

function SingleQuestion({ question, value, onChange }: SingleQuestionProps) {
  return (
    <RadioGroup value={value ?? ""} onValueChange={onChange} className="space-y-2">
      {(question.options ?? []).map((opt) => (
        <div
          key={opt.id}
          className={cn(
            "flex items-center gap-3 rounded-md border border-border px-4 py-3 transition-colors",
            value === opt.id
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50",
          )}
        >
          <RadioGroupItem value={opt.id} id={opt.id} />
          <Label htmlFor={opt.id} className="flex-1 cursor-pointer text-sm text-foreground">
            {opt.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )
}

// ── 다중 선택 ──────────────────────────────────────────────

interface MultipleQuestionProps {
  question: Question
  value: string[]
  onChange: (value: AnswerValue) => void
}

function MultipleQuestion({ question, value, onChange }: MultipleQuestionProps) {
  function toggle(optId: string) {
    const next: MultipleAnswer = value.includes(optId)
      ? value.filter((id) => id !== optId)
      : [...value, optId]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <p className="mb-1 text-xs text-muted-foreground">해당하는 항목을 모두 선택하세요.</p>
      {(question.options ?? []).map((opt) => {
        const checked = value.includes(opt.id)
        return (
          <div
            key={opt.id}
            className={cn(
              "flex items-center gap-3 rounded-md border border-border px-4 py-3 transition-colors",
              checked ? "border-primary bg-primary/5" : "hover:bg-muted/50",
            )}
          >
            <Checkbox
              id={opt.id}
              checked={checked}
              onCheckedChange={() => toggle(opt.id)}
            />
            <Label htmlFor={opt.id} className="flex-1 cursor-pointer text-sm text-foreground">
              {opt.label}
            </Label>
          </div>
        )
      })}
    </div>
  )
}

// ── 척도 (슬라이더) ────────────────────────────────────────

interface ScaleQuestionProps {
  question: Question
  value: number | undefined
  onChange: (value: AnswerValue) => void
}

function ScaleQuestion({ question, value, onChange }: ScaleQuestionProps) {
  const min = question.scaleMin ?? 1
  const max = question.scaleMax ?? 5
  const mid = Math.round((min + max) / 2)
  const current = value ?? mid
  const isUnset = value === undefined

  function handleChange(vals: number[]) {
    if (vals[0] !== undefined) onChange(vals[0])
  }

  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="space-y-5 px-1">
      {isUnset && (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
          슬라이더를 움직여 값을 선택해야 다음으로 이동할 수 있습니다.
        </p>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{question.scaleMinLabel}</span>
        {isUnset ? (
          <span className="text-sm font-medium text-muted-foreground">— 미선택 —</span>
        ) : (
          <span className="text-lg font-bold text-primary">{current}점</span>
        )}
        <span>{question.scaleMaxLabel}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[current]}
        onValueChange={handleChange}
        className={cn("w-full", isUnset && "opacity-40")}
      />
      <div className="flex justify-between px-0.5">
        {ticks.map((n) => (
          <span
            key={n}
            className={cn(
              "text-xs",
              !isUnset && n === current ? "font-semibold text-primary" : "text-muted-foreground",
            )}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── 주관식 (텍스트) ────────────────────────────────────────

interface TextQuestionProps {
  value: string | undefined
  onChange: (value: AnswerValue) => void
}

function TextQuestion({ value, onChange }: TextQuestionProps) {
  const text = value as string | undefined ?? ""
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        자유롭게 작성해 주세요. 이 문항은 선택 사항으로 점수에 영향을 주지 않습니다.
      </p>
      <Textarea
        placeholder="의견을 입력해 주세요..."
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="resize-none"
      />
      <p className="text-right text-xs text-muted-foreground">{text.length}자</p>
    </div>
  )
}

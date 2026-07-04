import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { TRANSFORM_MODES, type TransformMode } from "@/lib/tool-logic"

interface InputPanelProps {
  input: string
  mode: TransformMode
  onInputChange: (value: string) => void
  onModeChange: (mode: TransformMode) => void
  onRun: () => void
  isRunning: boolean
}

/**
 * 입력 패널 — Textarea + 변환 옵션 셀렉트 + 실행 버튼.
 * ★ 교체 지점: 변환 옵션 추가 시 TRANSFORM_MODES(tool-logic.ts)에 항목 추가.
 */
export function InputPanel({
  input,
  mode,
  onInputChange,
  onModeChange,
  onRun,
  isRunning,
}: InputPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="input-text">입력</Label>
        <Textarea
          id="input-text"
          placeholder="변환할 텍스트를 입력하세요..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          className="min-h-[280px] resize-none font-mono text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="transform-mode">변환 방식</Label>
        <Select value={mode} onValueChange={(v) => onModeChange(v as TransformMode)}>
          <SelectTrigger id="transform-mode">
            <SelectValue placeholder="변환 방식 선택" />
          </SelectTrigger>
          <SelectContent>
            {TRANSFORM_MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onRun} disabled={isRunning || !input.trim()} className="w-full">
        {isRunning ? "변환 중..." : "변환 실행"}
      </Button>
    </div>
  )
}

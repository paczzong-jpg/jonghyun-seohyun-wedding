import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ToolHeader } from "@/components/tool/tool-header"
import { InputPanel } from "@/components/tool/input-panel"
import { OutputPanel } from "@/components/tool/output-panel"
import { transform, type TransformMode } from "@/lib/tool-logic"

/**
 * 단일 페이지 변환 도구 — 좌: 입력 패널 / 우: 출력 패널.
 * 상태(input/output/error)는 이 페이지에서 관리하며 각 패널 컴포넌트로 전달한다.
 */
export function ToolPage() {
  const [input, setInput] = useState("")
  const [mode, setMode] = useState<TransformMode>("case-upper")
  const [output, setOutput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  function handleRun() {
    setIsRunning(true)
    setError(null)
    try {
      const result = transform(input, { mode })
      setOutput(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.")
      setOutput("")
    } finally {
      setIsRunning(false)
    }
  }

  /** 모드 변경 시 이전 출력·에러 초기화 */
  function handleModeChange(next: TransformMode) {
    setMode(next)
    setOutput("")
    setError(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <ToolHeader
          title="텍스트 변환 도구"
          description="입력 텍스트를 다양한 방식으로 변환합니다. 변환 방식을 선택하고 실행 버튼을 누르세요."
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <InputPanel
                input={input}
                mode={mode}
                onInputChange={setInput}
                onModeChange={handleModeChange}
                onRun={handleRun}
                isRunning={isRunning}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <OutputPanel
                output={output}
                error={error}
                filename={`${mode}-result.txt`}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

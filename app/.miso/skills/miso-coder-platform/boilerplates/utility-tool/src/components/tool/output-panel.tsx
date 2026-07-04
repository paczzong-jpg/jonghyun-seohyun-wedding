import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface OutputPanelProps {
  output: string
  error: string | null
  filename?: string
}

/**
 * 출력 패널 — 결과 표시 + 복사(navigator.clipboard) + 다운로드(Blob).
 */
export function OutputPanel({ output, error, filename = "result.txt" }: OutputPanelProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    if (!output) return
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="output-text">출력</Label>
        {output && (
          <Badge variant="secondary" className="text-xs font-mono">
            {output.length}자
          </Badge>
        )}
      </div>

      {error ? (
        <div className="flex min-h-[280px] items-start rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <Textarea
          id="output-text"
          readOnly
          placeholder="변환 결과가 여기에 표시됩니다."
          value={output}
          className="min-h-[280px] resize-none font-mono text-sm text-foreground"
        />
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleCopy}
          disabled={!output || !!error}
          className="flex-1"
        >
          {copied ? "복사됨!" : "복사"}
        </Button>
        <Button
          variant="outline"
          onClick={handleDownload}
          disabled={!output || !!error}
          className="flex-1"
        >
          다운로드
        </Button>
      </div>
    </div>
  )
}

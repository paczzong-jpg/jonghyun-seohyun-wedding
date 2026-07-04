import { useEffect, useMemo, useState } from "react"
import { Check, Code2, Copy, FileText, History, Image, Lightbulb, PanelRightClose, RotateCcw, Save, Sheet, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ArtifactKind, ArtifactSuggestion, ChatArtifact, ChatArtifactVersion } from "@/lib/chat-types"
import { cn } from "@/lib/utils"

type ArtifactPanelProps = {
  artifacts: ChatArtifact[]
  activeArtifact: ChatArtifact | null
  versions: ChatArtifactVersion[]
  suggestions: ArtifactSuggestion[]
  onSelect: (artifactId: string) => void
  onClose: () => void
  onSave: (artifactId: string, patch: Pick<ChatArtifact, "title" | "content"> & { language?: string }) => void
  onDelete: (artifactId: string) => void
  onCreateSuggestion: (artifact: ChatArtifact) => void
  onToggleSuggestion: (suggestion: ArtifactSuggestion) => void
  onApplySuggestion: (suggestion: ArtifactSuggestion) => void
  onRestoreVersion: (version: ChatArtifactVersion) => void
}

const kindLabels: Record<ArtifactKind, string> = {
  text: "Text",
  code: "Code",
  sheet: "Sheet",
  image: "Image",
}

function KindIcon({ kind }: { kind: ArtifactKind }) {
  if (kind === "code") return <Code2 className="size-4" />
  if (kind === "sheet") return <Sheet className="size-4" />
  if (kind === "image") return <Image className="size-4" />
  return <FileText className="size-4" />
}

function languageForKind(kind: ArtifactKind, current?: string): string {
  if (current) return current
  if (kind === "code") return "tsx"
  if (kind === "sheet") return "csv"
  if (kind === "image") return "prompt"
  return "markdown"
}

function sheetPreview(content: string): string[][] {
  const rows = content
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0))
  return rows.slice(0, 8)
}

function previewText(value: string, limit = 140): string {
  const compact = value.trim().replace(/\s+/g, " ")
  return compact.length > limit ? `${compact.slice(0, limit)}...` : compact
}

export function ArtifactPanel({
  artifacts,
  activeArtifact,
  versions,
  suggestions,
  onSelect,
  onClose,
  onSave,
  onDelete,
  onCreateSuggestion,
  onToggleSuggestion,
  onApplySuggestion,
  onRestoreVersion,
}: ArtifactPanelProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [language, setLanguage] = useState("")

  useEffect(() => {
    setTitle(activeArtifact?.title ?? "")
    setContent(activeArtifact?.content ?? "")
    setLanguage(languageForKind(activeArtifact?.kind ?? "text", activeArtifact?.language))
  }, [activeArtifact])

  const savedLanguage = activeArtifact ? languageForKind(activeArtifact.kind, activeArtifact.language) : ""
  const dirty = Boolean(activeArtifact && (title !== activeArtifact.title || content !== activeArtifact.content || language !== savedLanguage))
  const previewRows = useMemo(() => (activeArtifact?.kind === "sheet" ? sheetPreview(content) : []), [activeArtifact?.kind, content])

  if (!activeArtifact) {
    return (
      <aside className="hidden min-w-80 max-w-md flex-1 border-l border-border bg-card lg:flex lg:flex-col">
        <div className="flex min-h-16 items-center justify-between border-b border-border px-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Canvas</h2>
            <p className="text-xs text-muted-foreground">/canvas 명령이나 메시지 action으로 생성</p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Canvas 닫기" onClick={onClose}>
            <PanelRightClose className="size-4" />
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          저장된 artifact가 없습니다.
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex min-w-80 max-w-xl flex-1 flex-col border-l border-border bg-card">
      <div className="flex min-h-16 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <KindIcon kind={activeArtifact.kind} />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">Canvas</h2>
            <p className="truncate text-xs text-muted-foreground">v{activeArtifact.version} · {kindLabels[activeArtifact.kind]}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Artifact 복사"
            onClick={() => void navigator.clipboard.writeText(content)}
          >
            <Copy className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="개선안 생성" onClick={() => onCreateSuggestion(activeArtifact)}>
            <Lightbulb className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Canvas 닫기" onClick={onClose}>
            <PanelRightClose className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {artifacts.length > 1 && (
          <ScrollArea className="hidden w-40 shrink-0 border-r border-border md:block">
            <div className="flex flex-col gap-1 p-2">
              {artifacts.map((artifact) => (
                <button
                  key={artifact.id}
                  type="button"
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-muted",
                    artifact.id === activeArtifact.id && "bg-muted",
                  )}
                  onClick={() => onSelect(artifact.id)}
                >
                  <KindIcon kind={artifact.kind} />
                  <span className="truncate">{artifact.title}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="grid gap-2 border-b border-border p-3">
            <Input value={title} aria-label="Artifact 제목" onChange={(event) => setTitle(event.target.value)} />
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-9 min-w-0 flex-1">
                  <SelectValue placeholder="format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="markdown">markdown</SelectItem>
                  <SelectItem value="tsx">tsx</SelectItem>
                  <SelectItem value="typescript">typescript</SelectItem>
                  <SelectItem value="csv">csv</SelectItem>
                  <SelectItem value="prompt">prompt</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant={activeArtifact.status === "ready" ? "secondary" : "outline"} className="rounded-sm">
                {activeArtifact.status}
              </Badge>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="grid gap-3 p-3">
              <Textarea
                value={content}
                aria-label="Artifact 내용"
                className="min-h-80 resize-y font-mono text-xs leading-relaxed"
                onChange={(event) => setContent(event.target.value)}
              />

              {activeArtifact.kind === "sheet" && previewRows.length > 0 && (
                <div className="overflow-hidden rounded-md border border-border">
                  <table className="w-full table-fixed text-xs">
                    <tbody>
                      {previewRows.map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}`} className={rowIndex === 0 ? "bg-muted font-medium" : ""}>
                          {row.map((cell, cellIndex) => (
                            <td key={`cell-${rowIndex}-${cellIndex}`} className="truncate border-r border-t border-border px-2 py-1 last:border-r-0">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {versions.length > 0 && (
                <section className="grid gap-2">
                  <h3 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <History className="size-3.5" />
                    Version history
                  </h3>
                  <div className="grid gap-2">
                    {versions.slice(0, 6).map((version) => (
                      <div key={version.id} className="grid gap-2 rounded-md border border-border px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium">v{version.version} · {version.source}</div>
                            <div className="truncate text-muted-foreground">{version.title}</div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 shrink-0 rounded-md px-2 text-xs"
                            disabled={version.version === activeArtifact.version}
                            onClick={() => onRestoreVersion(version)}
                          >
                            <RotateCcw className="mr-1 size-3" />
                            복원
                          </Button>
                        </div>
                        <p className="line-clamp-2 text-muted-foreground">{previewText(version.content)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {suggestions.length > 0 && (
                <section className="grid gap-2">
                  <h3 className="text-xs font-medium text-muted-foreground">Suggestions</h3>
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className={cn(
                        "grid gap-1 rounded-md border border-border px-3 py-2 text-left text-xs hover:bg-muted",
                        suggestion.resolved && "text-muted-foreground",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 font-medium">
                          {suggestion.resolved && <Check className="size-3" />}
                          <span className="truncate">{suggestion.description}</span>
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 rounded-md px-2 text-xs"
                            disabled={suggestion.resolved}
                            onClick={() => onApplySuggestion(suggestion)}
                          >
                            적용
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-md px-2 text-xs"
                            onClick={() => onToggleSuggestion(suggestion)}
                          >
                            {suggestion.resolved ? "다시 열기" : "해결"}
                          </Button>
                        </div>
                      </div>
                      {suggestion.originalText && (
                        <div className="rounded-sm bg-muted px-2 py-1 text-muted-foreground line-through">
                          {previewText(suggestion.originalText)}
                        </div>
                      )}
                      <div className="rounded-sm bg-muted/60 px-2 py-1">{previewText(suggestion.suggestedText)}</div>
                    </div>
                  ))}
                </section>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between gap-2 border-t border-border p-3">
            <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(activeArtifact.id)}>
              <Trash2 className="mr-2 size-4" />
              삭제
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!dirty || title.trim().length === 0}
              onClick={() => onSave(activeArtifact.id, { title: title.trim(), content, language })}
            >
              <Save className="mr-2 size-4" />
              저장
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}

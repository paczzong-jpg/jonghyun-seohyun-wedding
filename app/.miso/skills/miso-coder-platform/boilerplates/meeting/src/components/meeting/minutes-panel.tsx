import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DownloadIcon,
  FileTextIcon,
  NotebookPenIcon,
  PencilIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatClock } from "@/lib/meeting/audio";
import type { Meeting, MinutesTemplate } from "@/lib/meeting/types";
import { Markdown } from "./markdown";

// ────────────────────────────────────────────────
// 회의록 문서 패널 — 렌더·편집·TOC·템플릿 재생성·다운로드 + 내 노트.
// AI 산출물(회의록)과 사용자 입력(내 노트)을 탭으로 시각 분리한다.
// ────────────────────────────────────────────────

function parseToc(markdown: string): string[] {
  return [...markdown.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
}

export interface MinutesPanelProps {
  meeting: Meeting;
  templates: MinutesTemplate[];
  /** 생성 스트리밍 중간 마크다운 (summarizing 동안) */
  streamingMd: string | null;
  busy: boolean;
  onSeek: (sec: number) => void;
  onRegenerate: (templateId: string) => void;
  onSaveMinutes: (markdown: string) => Promise<void>;
  onSaveNotes: (notes: string) => Promise<void>;
  onManageTemplates: () => void;
}

export function MinutesPanel({
  meeting,
  templates,
  streamingMd,
  busy,
  onSeek,
  onRegenerate,
  onSaveMinutes,
  onSaveNotes,
  onManageTemplates,
}: MinutesPanelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [templateId, setTemplateId] = useState(meeting.template);
  const [notes, setNotes] = useState(meeting.my_notes);
  const [notesSaved, setNotesSaved] = useState(true);
  const notesTimer = useRef<number>(0);
  const docRef = useRef<HTMLDivElement>(null);

  const markdown = streamingMd ?? meeting.minutes_md;
  const toc = useMemo(() => parseToc(markdown), [markdown]);

  useEffect(() => setTemplateId(meeting.template), [meeting.template]);
  useEffect(() => {
    setNotes(meeting.my_notes);
    setNotesSaved(true);
  }, [meeting.id, meeting.my_notes]);

  const jumpToSection = useCallback((index: number) => {
    const headings = docRef.current?.querySelectorAll("h2");
    headings?.[index]?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  const startEdit = useCallback(() => {
    setDraft(meeting.minutes_md);
    setEditing(true);
  }, [meeting.minutes_md]);

  const saveEdit = useCallback(async () => {
    try {
      await onSaveMinutes(draft);
      setEditing(false);
      toast.success("회의록을 저장했습니다");
    } catch {
      toast.error("저장에 실패했습니다");
    }
  }, [draft, onSaveMinutes]);

  const download = useCallback(() => {
    const header = [
      `# ${meeting.title || "회의록"}`,
      "",
      `- 일시: ${new Date(meeting.created).toLocaleString("ko-KR")}`,
      `- 길이: ${formatClock(meeting.duration)}`,
      meeting.participants.length ? `- 참석: ${meeting.participants.join(", ")}` : "",
      "",
      "---",
      "",
    ]
      .filter((line) => line !== null)
      .join("\n");
    const blob = new Blob([header + meeting.minutes_md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(meeting.title || "회의록").replace(/[/\\:*?"<>|]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [meeting]);

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      setNotesSaved(false);
      window.clearTimeout(notesTimer.current);
      notesTimer.current = window.setTimeout(() => {
        onSaveNotes(value)
          .then(() => setNotesSaved(true))
          .catch(() => toast.error("노트 저장에 실패했습니다"));
      }, 800);
    },
    [onSaveNotes],
  );

  return (
    <Tabs defaultValue="minutes" className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 pt-3 pb-0">
        <TabsList className="h-9 bg-transparent p-0">
          <TabsTrigger value="minutes" className="gap-1.5 rounded-b-none data-[state=active]:shadow-none">
            <FileTextIcon className="size-3.5" />
            회의록
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5 rounded-b-none data-[state=active]:shadow-none">
            <NotebookPenIcon className="size-3.5" />
            내 노트
          </TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-1.5 pb-1.5">
          <Select value={templateId} onValueChange={setTemplateId} disabled={busy}>
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue placeholder="템플릿" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.name}
                </SelectItem>
              ))}
              <button
                type="button"
                className="w-full rounded-sm px-2 py-1.5 text-left text-xs text-primary hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onManageTemplates();
                }}
              >
                템플릿 관리…
              </button>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={busy || !templateId}
            onClick={() => onRegenerate(templateId)}
            title="선택한 템플릿으로 회의록 재생성"
          >
            <RefreshCwIcon className={`size-3 ${busy ? "animate-spin" : ""}`} />
            재생성
          </Button>
        </div>
      </div>

      {/* 회의록 탭 */}
      <TabsContent value="minutes" className="mt-0 flex min-h-0 flex-1 flex-col">
        {toc.length > 1 && !editing ? (
          <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2">
            {toc.map((title, i) => (
              <button
                key={`${title}-${i}`}
                type="button"
                className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
                onClick={() => jumpToSection(i)}
              >
                {title}
              </button>
            ))}
          </div>
        ) : null}

        {editing ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-0 flex-1 resize-none font-mono text-xs leading-relaxed"
            />
            <div className="flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <XIcon className="size-3.5" />
                취소
              </Button>
              <Button size="sm" onClick={() => void saveEdit()}>
                저장
              </Button>
            </div>
          </div>
        ) : (
          <div ref={docRef} className="mn-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {markdown ? (
              <>
                <Markdown onSeek={onSeek}>{markdown}</Markdown>
                {streamingMd !== null ? (
                  <p className="mn-shimmer mt-2 text-sm">회의록 작성 중…</p>
                ) : null}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">
                  {busy ? "회의록을 준비하는 중입니다…" : "아직 회의록이 없습니다"}
                </p>
                {!busy && meeting.status === "ready" ? (
                  <Button size="sm" onClick={() => onRegenerate(templateId || templates[0]?.id || "")}>
                    회의록 생성
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        )}

        {!editing && meeting.minutes_md && streamingMd === null ? (
          <div className="flex items-center justify-end gap-1.5 border-t border-border px-4 py-2">
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={startEdit}>
              <PencilIcon className="size-3" />
              편집
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={download}>
              <DownloadIcon className="size-3" />
              .md
            </Button>
          </div>
        ) : null}
      </TabsContent>

      {/* 내 노트 탭 — 사용자 입력 공간 (AI 산출물과 분리) */}
      <TabsContent value="notes" className="mt-0 flex min-h-0 flex-1 flex-col p-4">
        <Textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="회의 중 떠오른 생각, 개인 메모를 자유롭게 적어두세요. 자동 저장됩니다."
          className="min-h-0 flex-1 resize-none text-sm leading-relaxed"
        />
        <p className="mt-1.5 text-right text-[11px] text-muted-foreground">
          {notesSaved ? "저장됨" : "입력 중…"}
        </p>
      </TabsContent>
    </Tabs>
  );
}

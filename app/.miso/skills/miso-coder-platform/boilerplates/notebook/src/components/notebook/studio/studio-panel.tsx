import { useEffect, useMemo, useState } from "react";

import {
  AudioLines,
  FileBarChart2,
  GitBranch,
  Layers,
  Loader2,
  NotebookPen,
  Plus,
  ScrollText,
  Table2,
  Trash2,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { ArtifactViewer } from "@/components/notebook/studio/artifact-viewer";
import { NoteDialog } from "@/components/notebook/studio/note-dialog";
import { ReportDialog } from "@/components/notebook/studio/report-dialog";

import {
  createArtifact,
  deleteArtifact,
  listArtifacts,
  listNotes,
} from "@/lib/notebook/db";
import {
  generateDataTable,
  generateFlashcards,
  generateMindMap,
  generatePodcastScript,
  generateQuiz,
  type NotebookContext,
} from "@/lib/notebook/llm";
import type { Artifact, ArtifactType, Note, Source } from "@/lib/notebook/types";

const TILES: Array<{
  type: Exclude<ArtifactType, "report">;
  label: string;
  icon: LucideIcon;
  tint: string;
  fg: string;
}> = [
  { type: "audio", label: "오디오 오버뷰", icon: AudioLines, tint: "#EEF0FF", fg: "#4F46E5" },
  { type: "mindmap", label: "마인드맵", icon: GitBranch, tint: "#E6F7F4", fg: "#0F766E" },
  { type: "flashcards", label: "플래시카드", icon: Layers, tint: "#FFF4E0", fg: "#B45309" },
  { type: "quiz", label: "퀴즈", icon: FileBarChart2, tint: "#FDEEF2", fg: "#BE185D" },
  { type: "table", label: "데이터 테이블", icon: Table2, tint: "#EEF2F6", fg: "#334155" },
];

export const ARTIFACT_META: Record<ArtifactType, { label: string; icon: LucideIcon }> = {
  audio: { label: "오디오 오버뷰", icon: AudioLines },
  mindmap: { label: "마인드맵", icon: GitBranch },
  flashcards: { label: "플래시카드", icon: Layers },
  quiz: { label: "퀴즈", icon: FileBarChart2 },
  table: { label: "데이터 테이블", icon: Table2 },
  report: { label: "리포트", icon: ScrollText },
};

export function StudioPanel({
  notebookId,
  readySourceCount,
  getContext,
  onSourcesChanged,
  onOpenSource,
  onAsk,
}: {
  notebookId: string;
  readySourceCount: number;
  getContext: () => Promise<NotebookContext>;
  onSourcesChanged: () => Promise<Source[]>;
  onOpenSource: (sourceId: string) => void;
  onAsk: (question: string) => void;
}) {
  const [artifacts, setArtifacts] = useState<Artifact[] | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [generating, setGenerating] = useState<Partial<Record<ArtifactType, boolean>>>({});
  const [viewing, setViewing] = useState<Artifact | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [noteState, setNoteState] = useState<{ note: Note | null } | null>(null);

  const refreshArtifacts = () => listArtifacts(notebookId).then(setArtifacts);
  const refreshNotes = () => listNotes(notebookId).then(setNotes);
  useEffect(() => {
    refreshArtifacts().catch(console.error);
    refreshNotes().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebookId]);

  const disabled = readySourceCount === 0;

  const generate = async (type: Exclude<ArtifactType, "report">) => {
    if (disabled || generating[type]) return;
    setGenerating((g) => ({ ...g, [type]: true }));
    try {
      const context = await getContext();
      let artifact: Artifact;
      if (type === "audio") {
        const lines = await generatePodcastScript(context);
        artifact = await createArtifact({
          notebook: notebookId,
          type: "audio",
          title: "오디오 오버뷰",
          payload: { lines },
        });
      } else if (type === "mindmap") {
        const root = await generateMindMap(context);
        artifact = await createArtifact({
          notebook: notebookId,
          type: "mindmap",
          title: root.label,
          payload: { root },
        });
      } else if (type === "flashcards") {
        const cards = await generateFlashcards(context);
        artifact = await createArtifact({
          notebook: notebookId,
          type: "flashcards",
          title: `플래시카드 ${cards.length}장`,
          payload: { cards },
        });
      } else if (type === "quiz") {
        const items = await generateQuiz(context);
        artifact = await createArtifact({
          notebook: notebookId,
          type: "quiz",
          title: `이해도 퀴즈 ${items.length}문항`,
          payload: { items },
        });
      } else {
        const table = await generateDataTable(context);
        artifact = await createArtifact({
          notebook: notebookId,
          type: "table",
          title: table.title,
          payload: { columns: table.columns, rows: table.rows },
        });
      }
      await refreshArtifacts();
      setViewing(artifact);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "생성에 실패했습니다");
    } finally {
      setGenerating((g) => ({ ...g, [type]: false }));
    }
  };

  const removeArtifact = async (artifact: Artifact) => {
    if (!window.confirm(`'${artifact.title}'을(를) 삭제할까요?`)) return;
    await deleteArtifact(artifact.id);
    await refreshArtifacts();
  };

  const sortedArtifacts = useMemo(() => artifacts ?? [], [artifacts]);

  return (
    <section className="nb-panel w-full">
      <header className="nb-panel-header">
        <span className="nb-panel-title">
          <Wand2 size={15} className="text-muted-foreground" />
          스튜디오
        </span>
        {disabled && (
          <span className="text-[11px] font-semibold text-muted-foreground">
            소스 추가 후 사용 가능
          </span>
        )}
      </header>

      <div className="nb-scroll flex-1 p-3">
        {/* ── 생성 타일 ── */}
        <div className="grid grid-cols-2 gap-2">
          {TILES.map((tile) => (
            <button
              key={tile.type}
              type="button"
              disabled={disabled || generating[tile.type]}
              onClick={() => generate(tile.type)}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left shadow-[var(--nb-shadow-card)] transition-all hover:-translate-y-px hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <span
                className="grid h-8 w-8 flex-none place-items-center rounded-lg"
                style={{ background: tile.tint, color: tile.fg }}
              >
                {generating[tile.type] ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <tile.icon size={15} strokeWidth={2.1} />
                )}
              </span>
              <span className="text-[12px] font-bold leading-tight">
                {generating[tile.type] ? "생성 중…" : tile.label}
              </span>
            </button>
          ))}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left shadow-[var(--nb-shadow-card)] transition-all hover:-translate-y-px hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-[#ECF5EA] text-[#3F6212]">
              <ScrollText size={15} strokeWidth={2.1} />
            </span>
            <span className="text-[12px] font-bold leading-tight">리포트</span>
          </button>
        </div>

        {/* ── 산출물 ── */}
        <SectionTitle
          label="산출물"
          count={sortedArtifacts.length}
          className="mt-5"
        />
        {artifacts === null ? (
          <div className="mt-2 flex flex-col gap-1.5">
            {[0, 1].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : sortedArtifacts.length === 0 ? (
          <p className="mt-2 rounded-xl bg-muted/50 px-3 py-3 text-[12px] leading-relaxed text-muted-foreground">
            위 타일을 눌러 소스로부터 오디오·마인드맵·퀴즈 같은 산출물을 만들어보세요.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {sortedArtifacts.map((artifact) => {
              const meta = ARTIFACT_META[artifact.type];
              return (
                <li key={artifact.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setViewing(artifact)}
                    onKeyDown={(e) => e.key === "Enter" && setViewing(artifact)}
                    className="group flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted"
                  >
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-secondary text-secondary-foreground">
                      <meta.icon size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-bold">
                        {artifact.title}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {meta.label} ·{" "}
                        {new Date(artifact.created).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeArtifact(artifact);
                      }}
                      aria-label="산출물 삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* ── 노트 ── */}
        <div className="mt-5 flex items-center justify-between">
          <SectionTitle label="노트" count={notes?.length ?? 0} />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11.5px] font-bold text-muted-foreground"
            onClick={() => setNoteState({ note: null })}
          >
            <Plus size={12} strokeWidth={2.6} /> 새 노트
          </Button>
        </div>
        {notes === null ? (
          <div className="mt-2 h-11 animate-pulse rounded-xl bg-muted" />
        ) : notes.length === 0 ? (
          <p className="mt-2 rounded-xl bg-muted/50 px-3 py-3 text-[12px] leading-relaxed text-muted-foreground">
            직접 메모를 쓰거나, 채팅 답변을 노트로 저장해 모아두세요.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => setNoteState({ note })}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted"
                >
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-[#FFF4E0] text-[#B45309]">
                    <NotebookPen size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold">
                      {note.title || "제목 없는 노트"}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {note.kind === "ai" ? `AI · ${note.origin}` : "내 노트"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ArtifactViewer
        artifact={viewing}
        onClose={() => setViewing(null)}
        getContext={getContext}
        onAsk={onAsk}
        notebookId={notebookId}
        onNotesChanged={refreshNotes}
      />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        notebookId={notebookId}
        getContext={getContext}
        onCreated={async (artifact) => {
          await refreshArtifacts();
          setViewing(artifact);
        }}
      />
      {noteState && (
        <NoteDialog
          notebookId={notebookId}
          note={noteState.note}
          onClose={() => setNoteState(null)}
          onChanged={refreshNotes}
          onSourcesChanged={onSourcesChanged}
          onOpenSource={onOpenSource}
        />
      )}
    </section>
  );
}

function SectionTitle({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className?: string;
}) {
  return (
    <h3
      className={`flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-muted-foreground ${className ?? ""}`}
    >
      {label}
      {count > 0 && <span className="nb-count">{count}</span>}
    </h3>
  );
}

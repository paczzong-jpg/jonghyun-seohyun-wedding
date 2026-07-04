import { useState } from "react";

import { FileInput, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { Markdown } from "@/components/notebook/shared/markdown";

import { createNote, deleteNote, updateNote } from "@/lib/notebook/db";
import { ingestSource } from "@/lib/notebook/ingest";
import type { Note, Source } from "@/lib/notebook/types";

export function NoteDialog({
  notebookId,
  note,
  onClose,
  onChanged,
  onSourcesChanged,
  onOpenSource,
}: {
  notebookId: string;
  note: Note | null;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onSourcesChanged: () => Promise<Source[]>;
  onOpenSource: (sourceId: string) => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [busy, setBusy] = useState(false);
  const [converting, setConverting] = useState(false);

  const save = async () => {
    if (!content.trim() || busy) return;
    setBusy(true);
    try {
      const finalTitle = title.trim() || content.trim().slice(0, 30);
      if (note) {
        await updateNote(note.id, { title: finalTitle, content });
      } else {
        await createNote({ notebook: notebookId, title: finalTitle, content, kind: "manual" });
      }
      await onChanged();
      toast.success("노트를 저장했습니다");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!note || !window.confirm("이 노트를 삭제할까요?")) return;
    await deleteNote(note.id);
    await onChanged();
    onClose();
  };

  /** 노트를 소스로 변환 — 이후 채팅 근거로 활용 (NotebookLM의 '메모를 소스로') */
  const convertToSource = async () => {
    if (!note || converting) return;
    setConverting(true);
    try {
      const { source } = await ingestSource(notebookId, {
        kind: "text",
        title: note.title || "노트",
        text: note.content,
      });
      await onSourcesChanged();
      toast.success("소스로 변환했습니다 — 이제 채팅 근거로 사용됩니다");
      onClose();
      onOpenSource(source.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "변환에 실패했습니다");
    } finally {
      setConverting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[82dvh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle asChild>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="노트 제목"
              className="border-0 px-1 text-[16px] font-extrabold shadow-none focus-visible:ring-0"
            />
          </DialogTitle>
          {note?.kind === "ai" && (
            <p className="px-1 text-[11.5px] font-semibold text-muted-foreground">
              AI 생성 · {note.origin}
            </p>
          )}
        </DialogHeader>

        <Tabs defaultValue={note?.kind === "ai" ? "preview" : "edit"} className="min-h-0 flex-1">
          <TabsList className="h-8">
            <TabsTrigger value="edit" className="px-3 text-[12px] font-bold">
              편집
            </TabsTrigger>
            <TabsTrigger value="preview" className="px-3 text-[12px] font-bold">
              미리보기
            </TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="마크다운으로 자유롭게 작성하세요"
              className="min-h-64 resize-none text-[13.5px] leading-relaxed"
            />
          </TabsContent>
          <TabsContent value="preview" className="nb-scroll mt-2 max-h-72 overflow-y-auto">
            {content.trim() ? (
              <Markdown content={content} />
            ) : (
              <p className="py-8 text-center text-[13px] text-muted-foreground">
                내용이 없습니다
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <div className="flex items-center gap-1">
            {note && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-[12px] font-bold text-muted-foreground"
                  onClick={convertToSource}
                  disabled={converting}
                >
                  {converting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <FileInput size={13} />
                  )}
                  소스로 변환
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={remove}
                  aria-label="노트 삭제"
                >
                  <Trash2 size={14} />
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              닫기
            </Button>
            <Button onClick={save} disabled={!content.trim() || busy} className="font-bold">
              저장
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

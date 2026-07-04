import { useCallback, useRef, useState } from "react";
import {
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  Loader2Icon,
  PaperclipIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  attachmentFileUrl,
  createAttachment,
  createAttachmentChunks,
  deleteAttachment,
  updateAttachment,
} from "@/lib/meeting/db";
import { extractAttachmentText, isSupportedAttachment } from "@/lib/meeting/ingest";
import type { Attachment, Meeting } from "@/lib/meeting/types";

// ────────────────────────────────────────────────
// 회의자료 첨부 패널.
// - 원본은 PB file 필드로 보존 → 언제든 재다운로드
// - 텍스트 추출본은 청크로 저장 → 회의록·채팅의 AI 소스로 합류
// - 추출 불가 형식도 첨부·다운로드는 가능 (status=ready, char_count=0)
// ────────────────────────────────────────────────

export interface AttachmentsPanelProps {
  meeting: Meeting;
  attachments: Attachment[];
  onChanged: () => void;
}

export function AttachmentsPanel({ meeting, attachments, onChanged }: AttachmentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = [...files];
      if (list.length === 0) return;
      setUploading(true);
      for (const file of list) {
        try {
          const record = await createAttachment(meeting.id, file);
          onChanged();
          if (!isSupportedAttachment(file)) {
            await updateAttachment(record.id, { status: "ready", char_count: 0 });
            toast.info(`${file.name}: 원본만 보관합니다 (텍스트 추출 미지원 형식)`);
          } else {
            try {
              const { text, chunks } = await extractAttachmentText(file);
              await createAttachmentChunks(record.id, meeting.id, chunks);
              await updateAttachment(record.id, { status: "ready", char_count: text.length });
            } catch (error) {
              await updateAttachment(record.id, {
                status: "failed",
                error: error instanceof Error ? error.message : "추출 실패",
              });
              toast.error(`${file.name}: 텍스트 추출에 실패했습니다`);
            }
          }
        } catch {
          toast.error(`${file.name}: 업로드에 실패했습니다`);
        }
        onChanged();
      }
      setUploading(false);
    },
    [meeting.id, onChanged],
  );

  const remove = useCallback(
    async (attachment: Attachment) => {
      try {
        await deleteAttachment(attachment.id);
        onChanged();
      } catch {
        toast.error("삭제에 실패했습니다");
      }
    },
    [onChanged],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 업로드 영역 */}
      <div className="p-3">
        <button
          type="button"
          className={`flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-sm transition-colors ${
            dragOver ? "border-primary bg-secondary" : "border-input text-muted-foreground hover:border-primary/60"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void upload(e.dataTransfer.files);
          }}
          disabled={uploading}
        >
          {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <PaperclipIcon className="size-4" />}
          <span>{uploading ? "업로드 중…" : "회의자료 첨부 (클릭 또는 드래그)"}</span>
          <span className="text-[11px]">PDF·DOCX·MD·TXT·CSV 는 AI 소스로도 활용됩니다</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* 첨부 목록 */}
      <div className="mn-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {attachments.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">첨부된 자료가 없습니다</p>
        ) : (
          <ul className="space-y-1.5">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="mn-card flex items-center gap-2.5 px-3 py-2.5">
                {attachment.status === "processing" ? (
                  <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ) : attachment.status === "failed" ? (
                  <TriangleAlertIcon className="size-4 shrink-0 text-destructive" />
                ) : attachment.char_count > 0 ? (
                  <FileTextIcon className="size-4 shrink-0 text-primary" />
                ) : (
                  <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{attachment.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {attachment.status === "processing"
                      ? "텍스트 추출 중…"
                      : attachment.status === "failed"
                        ? attachment.error || "추출 실패 — 원본은 보관됨"
                        : attachment.char_count > 0
                          ? `AI 소스 포함 · ${attachment.char_count.toLocaleString()}자`
                          : "원본 보관"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="size-7 shrink-0" asChild title="원본 다운로드">
                  <a href={attachmentFileUrl(attachment)} download={attachment.title}>
                    <DownloadIcon className="size-3.5" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => void remove(attachment)}
                  title="삭제"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

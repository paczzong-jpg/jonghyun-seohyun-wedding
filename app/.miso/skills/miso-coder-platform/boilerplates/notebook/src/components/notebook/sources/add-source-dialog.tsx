import { useRef, useState } from "react";

import { CheckCircle2, FileUp, Link2, Loader2, TextCursorInput, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { ingestSource, type IngestPhase } from "@/lib/notebook/ingest";
import type { Source, SourceInput } from "@/lib/notebook/types";

const PHASE_LABEL: Record<IngestPhase, string> = {
  extract: "내용 추출 중",
  store: "저장 중",
  brief: "AI 분석 중",
};

interface QueueItem {
  name: string;
  status: "waiting" | IngestPhase | "done" | "error";
  message?: string;
}

export function AddSourceDialog({
  notebookId,
  open,
  onOpenChange,
  onChanged,
}: {
  notebookId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => Promise<Source[]>;
}) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [url, setUrl] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const setItem = (index: number, patch: Partial<QueueItem>) =>
    setQueue((q) => q.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  /** 입력 목록을 순차 인제스트 — 각 항목 완료 즉시 소스 목록 갱신 */
  const run = async (inputs: Array<{ name: string; input: SourceInput }>) => {
    if (inputs.length === 0 || busy) return;
    setBusy(true);
    const base = queue.length;
    setQueue((q) => [...q, ...inputs.map(({ name }) => ({ name, status: "waiting" as const }))]);

    for (let i = 0; i < inputs.length; i++) {
      const at = base + i;
      try {
        await ingestSource(notebookId, inputs[i].input, (phase) => setItem(at, { status: phase }));
        setItem(at, { status: "done" });
        await onChanged();
      } catch (error) {
        setItem(at, {
          status: "error",
          message: error instanceof Error ? error.message : "처리 실패",
        });
        await onChanged();
      }
    }
    setBusy(false);
  };

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    run(list.map((file) => ({ name: file.name, input: { kind: "file", file } })));
  };

  const addUrl = () => {
    const value = url.trim();
    if (!/^https?:\/\//.test(value)) {
      toast.error("http:// 또는 https:// 로 시작하는 주소를 입력해주세요");
      return;
    }
    setUrl("");
    run([{ name: value, input: { kind: "url", url: value } }]);
  };

  const addText = () => {
    if (text.trim().length < 20) {
      toast.error("본문이 너무 짧습니다 (20자 이상)");
      return;
    }
    const title = textTitle.trim() || "붙여넣은 텍스트";
    run([{ name: title, input: { kind: "text", title, text } }]);
    setTextTitle("");
    setText("");
  };

  const close = (next: boolean) => {
    if (busy) {
      toast.info("소스 처리 중에는 창을 닫을 수 없습니다");
      return;
    }
    if (!next) setQueue([]);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-extrabold">소스 추가</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="file">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file" className="gap-1.5 text-[12.5px] font-bold">
              <FileUp size={13} /> 파일
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-1.5 text-[12.5px] font-bold">
              <Link2 size={13} /> 링크
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-1.5 text-[12.5px] font-bold">
              <TextCursorInput size={13} /> 텍스트
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
              className={`flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors ${
                dragOver
                  ? "border-primary bg-secondary/60"
                  : "border-input hover:border-primary/50 hover:bg-secondary/30"
              }`}
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
                <FileUp size={18} />
              </span>
              <span className="text-[13px] font-bold">
                파일을 끌어다 놓거나 <span className="text-primary">클릭해서 선택</span>
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                PDF · DOCX · MD · TXT — 여러 개 동시 업로드 가능
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.docx,.md,.markdown,.txt,text/plain"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </TabsContent>

          <TabsContent value="url" className="mt-4">
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addUrl()}
                placeholder="https://example.com/article"
                autoFocus
              />
              <Button onClick={addUrl} disabled={busy} className="flex-none font-bold">
                가져오기
              </Button>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
              본문만 추출해 저장합니다. 로그인이 필요한 페이지는 가져올 수 없습니다.
            </p>
          </TabsContent>

          <TabsContent value="text" className="mt-4 flex flex-col gap-2.5">
            <Input
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="제목 (선택)"
            />
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="메모, 회의록, 기사 본문… 무엇이든 붙여넣으세요"
              rows={7}
              className="resize-none"
            />
            <Button onClick={addText} disabled={busy} className="self-end font-bold">
              추가
            </Button>
          </TabsContent>
        </Tabs>

        {queue.length > 0 && (
          <ul className="mt-1 flex max-h-44 flex-col gap-1 overflow-y-auto rounded-xl border border-border bg-muted/40 p-2">
            {queue.map((item, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px]">
                {item.status === "done" ? (
                  <CheckCircle2 size={14} className="flex-none text-[#16A34A]" />
                ) : item.status === "error" ? (
                  <XCircle size={14} className="flex-none text-destructive" />
                ) : (
                  <Loader2 size={14} className="flex-none animate-spin text-primary" />
                )}
                <span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>
                <span className="flex-none text-[11.5px] text-muted-foreground">
                  {item.status === "done"
                    ? "완료"
                    : item.status === "error"
                      ? (item.message ?? "실패")
                      : item.status === "waiting"
                        ? "대기"
                        : PHASE_LABEL[item.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

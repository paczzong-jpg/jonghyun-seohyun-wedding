import { useState } from "react";

import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { createArtifact } from "@/lib/notebook/db";
import { runTransform, type NotebookContext } from "@/lib/notebook/llm";
import type { Artifact } from "@/lib/notebook/types";
import { TRANSFORM_PRESETS } from "@/lib/notebook-config";

export function ReportDialog({
  open,
  onOpenChange,
  notebookId,
  getContext,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookId: string;
  getContext: () => Promise<NotebookContext>;
  onCreated: (artifact: Artifact) => Promise<void> | void;
}) {
  const [custom, setCustom] = useState("");
  const [running, setRunning] = useState<string | null>(null);

  const run = async (title: string, instruction: string, presetId: string) => {
    if (running) return;
    setRunning(presetId);
    try {
      const context = await getContext();
      const result = await runTransform(instruction, context);
      const artifact = await createArtifact({
        notebook: notebookId,
        type: "report",
        title,
        payload: { content: result.content, citations: result.citations },
      });
      onOpenChange(false);
      setCustom("");
      await onCreated(artifact);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "리포트 생성에 실패했습니다");
    } finally {
      setRunning(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !running && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-extrabold">리포트 만들기</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {TRANSFORM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={!!running}
              onClick={() => run(preset.noteTitle, preset.instruction, preset.id)}
              className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-3 text-left transition-all hover:-translate-y-px hover:border-primary/40 hover:bg-secondary/30 disabled:opacity-50"
            >
              <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg bg-secondary text-secondary-foreground">
                {running === preset.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <preset.icon size={14} />
                )}
              </span>
              <span>
                <span className="block text-[12.5px] font-bold">{preset.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {preset.desc}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-1">
          <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-extrabold text-muted-foreground">
            <PenLine size={12} /> 직접 지시하기
          </p>
          <Textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="예: 두 소스의 주장 차이를 표로 비교하고 결론을 내려줘"
            rows={2}
            className="resize-none"
            disabled={!!running}
          />
          <Button
            className="mt-2 w-full rounded-xl font-bold"
            disabled={custom.trim().length < 5 || !!running}
            onClick={() => run("커스텀 리포트", custom.trim(), "custom")}
          >
            {running === "custom" ? (
              <>
                <Loader2 size={14} className="animate-spin" /> 생성 중…
              </>
            ) : (
              "리포트 생성"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

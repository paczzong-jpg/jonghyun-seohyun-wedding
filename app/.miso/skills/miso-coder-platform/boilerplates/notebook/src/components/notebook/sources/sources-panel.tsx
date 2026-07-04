import { useState } from "react";

import { AlertCircle, FolderOpen, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { SourceIcon } from "@/components/notebook/shared/source-icon";
import { AddSourceDialog } from "@/components/notebook/sources/add-source-dialog";

import { updateSource } from "@/lib/notebook/db";
import type { ContextMode, Source } from "@/lib/notebook/types";

const MODE_LABEL: Record<ContextMode, string> = {
  full: "전문",
  summary: "요약",
  off: "제외",
};
const MODE_NEXT: Record<ContextMode, ContextMode> = {
  full: "summary",
  summary: "off",
  off: "full",
};

export function SourcesPanel({
  notebookId,
  sources,
  onChanged,
  onOpenSource,
}: {
  notebookId: string;
  sources: Source[];
  onChanged: () => Promise<Source[]>;
  onOpenSource: (source: Source) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);

  const cycleMode = async (source: Source) => {
    const next = MODE_NEXT[source.context_mode];
    await updateSource(source.id, { context_mode: next });
    await onChanged();
    toast.success(
      next === "off"
        ? `'${source.title}'을(를) 컨텍스트에서 제외했습니다`
        : `'${source.title}' — ${MODE_LABEL[next]} 모드`,
    );
  };

  return (
    <section className="nb-panel w-full">
      <header className="nb-panel-header">
        <span className="nb-panel-title">
          <FolderOpen size={15} className="text-muted-foreground" />
          소스
          {sources.length > 0 && <span className="nb-count">{sources.length}</span>}
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 rounded-full px-3 text-[12px] font-bold"
          onClick={() => setAddOpen(true)}
        >
          <Plus size={14} strokeWidth={2.6} /> 추가
        </Button>
      </header>

      <div className="nb-scroll flex-1 p-2">
        {sources.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 pb-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
              <FolderOpen size={22} strokeWidth={1.8} />
            </span>
            <p className="mt-3 text-[13.5px] font-bold">아직 소스가 없습니다</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              PDF·웹페이지·텍스트를 추가하면
              <br />
              근거 있는 대화가 시작됩니다
            </p>
            <Button
              size="sm"
              className="mt-4 rounded-full px-4 font-bold"
              onClick={() => setAddOpen(true)}
            >
              <Plus size={14} strokeWidth={2.6} /> 첫 소스 추가
            </Button>
          </div>
        ) : (
          <TooltipProvider delayDuration={300}>
            <ul className="flex flex-col gap-1">
              {sources.map((source) => (
                <li key={source.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => source.status !== "processing" && onOpenSource(source)}
                    onKeyDown={(e) => e.key === "Enter" && onOpenSource(source)}
                    className="group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <SourceIcon type={source.type} size={32} />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[13px] font-semibold ${source.context_mode === "off" ? "text-muted-foreground line-through decoration-border" : ""}`}
                      >
                        {source.title}
                      </span>
                      <span className="mt-px flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {source.status === "processing" && (
                          <>
                            <Loader2 size={10} className="animate-spin" /> 분석 중
                          </>
                        )}
                        {source.status === "failed" && (
                          <span className="flex items-center gap-1 font-semibold text-destructive">
                            <AlertCircle size={10} /> {source.error || "실패"}
                          </span>
                        )}
                        {source.status === "ready" &&
                          `${Math.max(1, Math.round(source.char_count / 1000))}천자`}
                      </span>
                    </span>
                    {source.status === "ready" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              cycleMode(source);
                            }}
                            className={`flex-none rounded-full px-2 py-0.5 text-[10.5px] font-extrabold transition-colors ${
                              source.context_mode === "full"
                                ? "bg-secondary text-secondary-foreground"
                                : source.context_mode === "summary"
                                  ? "bg-[#FFF4E0] text-[#B45309]"
                                  : "bg-muted text-muted-foreground"
                            }`}
                            aria-label="컨텍스트 모드 전환"
                          >
                            {MODE_LABEL[source.context_mode]}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-[11.5px]">
                          채팅 컨텍스트: 전문 → 요약 → 제외 순환
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </TooltipProvider>
        )}
      </div>

      <AddSourceDialog
        notebookId={notebookId}
        open={addOpen}
        onOpenChange={setAddOpen}
        onChanged={onChanged}
      />
    </section>
  );
}

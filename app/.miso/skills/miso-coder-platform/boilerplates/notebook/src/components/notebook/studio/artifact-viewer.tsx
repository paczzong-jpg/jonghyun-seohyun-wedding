import { useMemo, useState } from "react";

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  NotebookPen,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Markdown } from "@/components/notebook/shared/markdown";
import { AudioOverview } from "@/components/notebook/studio/audio-overview";
import { MindMapView } from "@/components/notebook/studio/mindmap-view";

import { createNote } from "@/lib/notebook/db";
import type { NotebookContext } from "@/lib/notebook/llm";
import type { Artifact, ArtifactPayloadMap, QuizItem } from "@/lib/notebook/types";

export function ArtifactViewer({
  artifact,
  onClose,
  getContext,
  onAsk,
  notebookId,
  onNotesChanged,
}: {
  artifact: Artifact | null;
  onClose: () => void;
  getContext: () => Promise<NotebookContext>;
  onAsk: (question: string) => void;
  notebookId: string;
  onNotesChanged: () => Promise<void> | void;
}) {
  if (!artifact) return null;

  const wide = artifact.type === "mindmap" || artifact.type === "table";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`flex max-h-[86dvh] flex-col gap-0 overflow-hidden p-0 ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}
      >
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="text-[16px] font-extrabold tracking-tight">
            {artifact.title}
          </DialogTitle>
        </DialogHeader>
        <div className="nb-scroll min-h-0 flex-1">
          {artifact.type === "report" && (
            <ReportView
              payload={artifact.payload as ArtifactPayloadMap["report"]}
              notebookId={notebookId}
              title={artifact.title}
              onNotesChanged={onNotesChanged}
            />
          )}
          {artifact.type === "table" && (
            <TableView
              payload={artifact.payload as ArtifactPayloadMap["table"]}
              title={artifact.title}
            />
          )}
          {artifact.type === "flashcards" && (
            <FlashcardsView payload={artifact.payload as ArtifactPayloadMap["flashcards"]} />
          )}
          {artifact.type === "quiz" && (
            <QuizView payload={artifact.payload as ArtifactPayloadMap["quiz"]} />
          )}
          {artifact.type === "audio" && (
            <AudioOverview
              payload={artifact.payload as ArtifactPayloadMap["audio"]}
              getContext={getContext}
            />
          )}
          {artifact.type === "mindmap" && (
            <MindMapView
              payload={artifact.payload as ArtifactPayloadMap["mindmap"]}
              onAsk={(question) => {
                onClose();
                onAsk(question);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── 리포트 ─────────────────────────────────────

function ReportView({
  payload,
  notebookId,
  title,
  onNotesChanged,
}: {
  payload: ArtifactPayloadMap["report"];
  notebookId: string;
  title: string;
  onNotesChanged: () => Promise<void> | void;
}) {
  const copyToNote = async () => {
    await createNote({
      notebook: notebookId,
      title,
      content: payload.content,
      kind: "ai",
      origin: "리포트",
    });
    await onNotesChanged();
    toast.success("노트로 복사했습니다");
  };

  return (
    <div className="px-6 py-5">
      <Markdown content={payload.content} citations={payload.citations} />
      <div className="mt-5 border-t border-border pt-3">
        <Button variant="secondary" size="sm" className="gap-1.5 font-bold" onClick={copyToNote}>
          <NotebookPen size={13} /> 노트로 복사
        </Button>
      </div>
    </div>
  );
}

// ── 데이터 테이블 ──────────────────────────────

function TableView({
  payload,
  title,
}: {
  payload: ArtifactPayloadMap["table"];
  title: string;
}) {
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);

  const rows = useMemo(() => {
    if (!sort) return payload.rows;
    const numeric = payload.rows.every(
      (r) => !Number.isNaN(parseFloat(r[sort.col]?.replace(/[^\d.-]/g, "") ?? "")),
    );
    return [...payload.rows].sort((a, b) => {
      const av = a[sort.col] ?? "";
      const bv = b[sort.col] ?? "";
      if (numeric) {
        return (
          (parseFloat(av.replace(/[^\d.-]/g, "")) - parseFloat(bv.replace(/[^\d.-]/g, ""))) *
          sort.dir
        );
      }
      return av.localeCompare(bv, "ko") * sort.dir;
    });
  }, [payload.rows, sort]);

  const downloadCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [payload.columns, ...payload.rows]
      .map((row) => row.map(esc).join(","))
      .join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="px-6 py-5">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-muted/60">
              {payload.columns.map((col, c) => (
                <th
                  key={c}
                  className="cursor-pointer select-none border-b border-border px-3.5 py-2.5 text-left font-extrabold"
                  onClick={() =>
                    setSort((s) =>
                      s?.col === c ? { col: c, dir: s.dir === 1 ? -1 : 1 } : { col: c, dir: 1 },
                    )
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {sort?.col === c &&
                      (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="odd:bg-card even:bg-muted/25">
                {row.map((cell, c) => (
                  <td key={c} className="border-b border-border/60 px-3.5 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <Button variant="secondary" size="sm" className="gap-1.5 font-bold" onClick={downloadCsv}>
          <Download size={13} /> CSV 다운로드
        </Button>
      </div>
    </div>
  );
}

// ── 플래시카드 ─────────────────────────────────

function FlashcardsView({ payload }: { payload: ArtifactPayloadMap["flashcards"] }) {
  const [order, setOrder] = useState(() => payload.cards.map((_, i) => i));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = payload.cards[order[index]];

  const go = (next: number) => {
    setFlipped(false);
    window.setTimeout(
      () => setIndex(Math.min(Math.max(next, 0), order.length - 1)),
      flipped ? 180 : 0,
    );
  };

  const shuffle = () => {
    const next = [...order].sort(() => Math.random() - 0.5);
    setOrder(next);
    setFlipped(false);
    setIndex(0);
  };

  return (
    <div className="flex flex-col items-center px-6 py-6">
      <button
        type="button"
        className="nb-flip h-56 w-full max-w-md cursor-pointer"
        data-flipped={flipped}
        onClick={() => setFlipped((v) => !v)}
        aria-label="카드 뒤집기"
      >
        <div className="nb-flip-inner">
          <div className="nb-flip-face nb-flip-front shadow-[var(--nb-shadow-card)]">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
              질문
            </span>
            <p className="text-[17px] font-bold leading-relaxed">{card.front}</p>
            <span className="text-[11.5px] text-[var(--nb-ink-faint)]">클릭해서 답 보기</span>
          </div>
          <div className="nb-flip-face nb-flip-back">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-secondary-foreground/70">
              답
            </span>
            <p className="text-[15px] font-semibold leading-relaxed text-secondary-foreground">
              {card.back}
            </p>
          </div>
        </div>
      </button>

      <div className="mt-5 flex items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-full"
          disabled={index === 0}
          onClick={() => go(index - 1)}
          aria-label="이전 카드"
        >
          <ChevronLeft size={16} />
        </Button>
        <span className="min-w-16 text-center text-[13px] font-bold tabular-nums text-muted-foreground">
          {index + 1} / {order.length}
        </span>
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-full"
          disabled={index === order.length - 1}
          onClick={() => go(index + 1)}
          aria-label="다음 카드"
        >
          <ChevronRight size={16} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[12px] font-bold text-muted-foreground"
          onClick={shuffle}
        >
          <Shuffle size={13} /> 섞기
        </Button>
      </div>
    </div>
  );
}

// ── 퀴즈 ───────────────────────────────────────

function QuizView({ payload }: { payload: ArtifactPayloadMap["quiz"] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [graded, setGraded] = useState(false);

  const answered = Object.keys(answers).length;
  const score = payload.items.filter((q, i) => answers[i] === q.answer).length;

  const optionClass = (question: QuizItem, qi: number, oi: number) => {
    const selected = answers[qi] === oi;
    if (!graded) {
      return selected
        ? "border-primary bg-secondary/60 font-bold"
        : "border-border bg-card hover:border-primary/40";
    }
    if (oi === question.answer) return "border-[#16A34A] bg-[#F0FDF4] font-bold";
    if (selected) return "border-destructive bg-[#FEF2F2]";
    return "border-border bg-card opacity-60";
  };

  return (
    <div className="px-6 py-5">
      {graded && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
          <p className="text-[14px] font-extrabold text-secondary-foreground">
            {score} / {payload.items.length} 정답
            <span className="ml-2 text-[12.5px] font-semibold opacity-70">
              {score === payload.items.length
                ? "완벽해요!"
                : score >= payload.items.length * 0.7
                  ? "훌륭해요"
                  : "해설을 확인해보세요"}
            </span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 font-bold"
            onClick={() => {
              setAnswers({});
              setGraded(false);
            }}
          >
            <RotateCcw size={13} /> 다시 풀기
          </Button>
        </div>
      )}

      <ol className="flex flex-col gap-5">
        {payload.items.map((question, qi) => (
          <li key={qi}>
            <p className="text-[14px] font-bold leading-relaxed">
              <span className="mr-1.5 text-primary">Q{qi + 1}.</span>
              {question.question}
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {question.options.map((option, oi) => (
                <button
                  key={oi}
                  type="button"
                  disabled={graded}
                  onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  className={`rounded-xl border px-3.5 py-2.5 text-left text-[13px] transition-colors ${optionClass(question, qi, oi)}`}
                >
                  <span className="mr-2 font-extrabold text-muted-foreground">
                    {String.fromCharCode(65 + oi)}
                  </span>
                  {option}
                </button>
              ))}
            </div>
            {graded && question.explanation && (
              <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-[12.5px] leading-relaxed text-muted-foreground">
                {question.explanation}
              </p>
            )}
          </li>
        ))}
      </ol>

      {!graded && (
        <Button
          className="mt-5 w-full rounded-xl font-bold"
          disabled={answered < payload.items.length}
          onClick={() => setGraded(true)}
        >
          채점하기 ({answered}/{payload.items.length})
        </Button>
      )}
    </div>
  );
}

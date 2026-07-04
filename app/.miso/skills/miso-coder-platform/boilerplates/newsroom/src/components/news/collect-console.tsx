import { useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, X, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { collectStore } from "@/lib/news/collect";
import type { CollectProgress, SourceProgress } from "@/lib/news/types";

// ────────────────────────────────────────────────
// 수집 콘솔 — 탭 상주 수집을 숨기지 않고 시그니처 모먼트로 연출.
// 피드별 행 상태 + 단계 진행. "탭 열려 있는 동안 수집" 제약을 라이브 대시보드 체감으로 전환.
// ────────────────────────────────────────────────

const PHASE_LABEL: Record<CollectProgress["phase"], string> = {
  idle: "대기",
  fetching: "피드 수집 중",
  summarizing: "AI 요약 중",
  clustering: "이슈 묶는 중",
  done: "수집 완료",
  error: "오류",
};

function StatusIcon({ status }: { status: SourceProgress["status"] }) {
  switch (status) {
    case "run":
      return <Loader2 className="size-3.5 animate-spin text-[var(--nw-accent)]" />;
    case "ok":
      return <Check className="size-3.5 text-[var(--nw-accent)]" />;
    case "empty":
      return <Minus className="size-3.5 text-[var(--nw-ink-3)]" />;
    case "error":
      return <X className="size-3.5 text-[var(--nw-live)]" />;
    default:
      return <span className="size-3.5 rounded-full border border-[var(--nw-hairline)]" />;
  }
}

export function useCollectProgress(): CollectProgress {
  const [progress, setProgress] = useState<CollectProgress>(collectStore.snapshot);
  useEffect(() => collectStore.subscribe(setProgress), []);
  return progress;
}

export function CollectConsole({ onClose }: { onClose?: () => void }) {
  const p = useCollectProgress();
  const stagePct =
    p.phase === "summarizing" && p.summarizeTotal > 0
      ? Math.round((p.summarized / p.summarizeTotal) * 100)
      : p.phase === "done"
        ? 100
        : undefined;

  return (
    <div className="rounded-lg border border-[var(--nw-hairline)] bg-[var(--nw-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(p.phase === "fetching" || p.phase === "summarizing" || p.phase === "clustering") && (
            <Loader2 className="size-4 animate-spin text-[var(--nw-accent)]" />
          )}
          <span className="font-semibold">{PHASE_LABEL[p.phase]}</span>
          {p.phase === "done" && <span className="nw-meta">새 기사 {p.totalAdded}건 · 이슈 {p.clustersTouched}개 갱신</span>}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="size-4" />
          </Button>
        )}
      </div>

      {stagePct !== undefined && <Progress value={stagePct} className="mb-3 h-1.5" />}

      <div className="max-h-52 space-y-1 overflow-y-auto">
        {p.rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2 text-sm">
            <StatusIcon status={row.status} />
            <span className="min-w-0 flex-1 truncate text-[var(--nw-ink-2)]">{row.name}</span>
            {row.status === "ok" && <span className="nw-meta shrink-0">{row.added > 0 ? `+${row.added}` : `${row.fetched}건`}</span>}
            {row.status === "error" && <span className="nw-meta shrink-0 text-[var(--nw-live)]">{row.error}</span>}
          </div>
        ))}
        {p.rows.length === 0 && <p className="nw-meta py-2 text-center">구독한 소스가 없습니다</p>}
      </div>
    </div>
  );
}

/** 상단 "새 기사 N건" pill — 자동 삽입으로 피드를 밀지 않고 클릭 시 반영 (X/Twitter 패턴) */
export function NewArticlesPill({ count, onClick }: { count: number; onClick: () => void }) {
  if (count <= 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed left-1/2 top-24 z-40 -translate-x-1/2 rounded-full border border-[var(--nw-accent)] bg-[var(--nw-surface)] px-4 py-1.5 text-sm font-semibold text-[var(--nw-accent)] shadow-sm"
    >
      <RefreshCw className="mr-1.5 inline size-3.5" />새 기사 {count}건 보기
    </button>
  );
}

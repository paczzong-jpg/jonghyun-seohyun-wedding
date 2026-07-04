import { useState } from "react";
import { Loader2, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { expandTopic, type TopicExpansion } from "@/lib/news/llm";
import { createTopic } from "@/lib/news/db";
import { TOPIC_COLORS, TOPIC_SUGGESTIONS } from "@/lib/news-config";
import type { Topic } from "@/lib/news/types";

// ────────────────────────────────────────────────
// 키워드 구독 추가 — DirectLLM 으로 검색어를 확장(동의어·연관어·제외어)한 뒤
// 사용자가 확인하고 구독을 만든다. 확장 실패 시에도 원문 키워드로 구독 가능.
// ────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCount?: number;
  onCreated?: (topic: Topic) => void;
}

export function KeywordDialog({ open, onOpenChange, existingCount = 0, onCreated }: Props) {
  const [input, setInput] = useState("");
  const [expanding, setExpanding] = useState(false);
  const [expansion, setExpansion] = useState<TopicExpansion | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setInput("");
    setExpansion(null);
    setExpanding(false);
    setSaving(false);
  }

  async function runExpand(term: string) {
    const q = term.trim();
    if (!q || expanding) return;
    setExpanding(true);
    setExpansion(null);
    try {
      const exp = await expandTopic(q);
      setExpansion(exp);
    } catch {
      // 확장 실패 — 원문 키워드로라도 구독할 수 있게 최소 형태 구성
      setExpansion({ canonical: q, queries: [q], related_keywords: [], exclude_hints: [] });
    } finally {
      setExpanding(false);
    }
  }

  async function save() {
    if (!expansion || saving) return;
    setSaving(true);
    try {
      const color = TOPIC_COLORS[existingCount % TOPIC_COLORS.length];
      const topic = await createTopic({
        name: expansion.canonical,
        queries: expansion.queries,
        related: expansion.related_keywords,
        exclude: expansion.exclude_hints,
        color,
      });
      toast.success(`"${expansion.canonical}" 키워드를 구독했어요`);
      onCreated?.(topic);
      onOpenChange(false);
      reset();
    } catch {
      toast.error("구독 추가에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="nw-serif text-xl">키워드 구독 추가</DialogTitle>
          <DialogDescription>
            관심 주제를 입력하면 AI가 검색어를 확장해 관련 기사를 폭넓게 모아드려요.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runExpand(input);
          }}
          className="flex gap-2"
        >
          <Input
            autoFocus
            placeholder="예: AI 반도체, 2차전지, 환율…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="submit" disabled={!input.trim() || expanding}>
            {expanding ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            <span className="ml-1.5">확장</span>
          </Button>
        </form>

        {!expansion && !expanding && (
          <div className="flex flex-wrap gap-1.5">
            {TOPIC_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setInput(s);
                  runExpand(s);
                }}
                className="rounded-full border border-[var(--nw-hairline)] px-3 py-1 text-sm text-[var(--nw-ink-2)] transition-colors hover:border-[var(--nw-accent)] hover:text-[var(--nw-accent)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {expanding && (
          <div className="flex items-center gap-2 py-6 text-[var(--nw-ink-2)]">
            <Loader2 className="size-4 animate-spin" /> 검색어를 확장하는 중…
          </div>
        )}

        {expansion && !expanding && (
          <div className="space-y-3 rounded-lg border border-[var(--nw-hairline)] bg-[var(--nw-surface-2)] p-3.5">
            <div>
              <div className="nw-overline mb-1">주제</div>
              <div className="nw-headline">{expansion.canonical}</div>
            </div>
            <div>
              <div className="nw-overline mb-1.5">검색어</div>
              <div className="flex flex-wrap gap-1.5">
                {expansion.queries.map((q) => (
                  <Badge key={q} variant="default">{q}</Badge>
                ))}
              </div>
            </div>
            {expansion.related_keywords.length > 0 && (
              <div>
                <div className="nw-overline mb-1.5">연관어</div>
                <div className="flex flex-wrap gap-1.5">
                  {expansion.related_keywords.map((q) => (
                    <Badge key={q} variant="secondary">{q}</Badge>
                  ))}
                </div>
              </div>
            )}
            {expansion.exclude_hints.length > 0 && (
              <div>
                <div className="nw-overline mb-1.5">제외</div>
                <div className="flex flex-wrap gap-1.5">
                  {expansion.exclude_hints.map((q) => (
                    <Badge key={q} variant="outline">−{q}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={save} disabled={!expansion || saving}>
            {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Plus className="mr-1.5 size-4" />}
            구독 추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  CrosshairIcon,
  SearchIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatClock } from "@/lib/meeting/audio";
import { speakerLabel } from "@/lib/meeting/llm";
import type { Segment } from "@/lib/meeting/types";

// ────────────────────────────────────────────────
// 트랜스크립트 동기 뷰어.
// - 재생 위치의 세그먼트를 하이라이트하고 자동 스크롤(팔로우)
// - 사용자가 스크롤하면 팔로우를 풀고 "따라가기" 버튼으로 복귀
// - 라인 클릭 → 해당 지점 재생 (click-to-seek)
// - 화자 라벨 클릭 → 이름 일괄 변경 / 검색 → 하이라이트·이전/다음 점프
// ────────────────────────────────────────────────

function speakerColor(speaker: string): string {
  const n = Number.parseInt(speaker.replace(/\D/g, ""), 10) || 1;
  return `var(--mn-speaker-${((n - 1) % 6) + 1})`;
}

function highlightText(text: string, query: string) {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: Array<string | { mark: string }> = [];
  let at = 0;
  while (at < text.length) {
    const hit = lower.indexOf(q, at);
    if (hit < 0) {
      parts.push(text.slice(at));
      break;
    }
    if (hit > at) parts.push(text.slice(at, hit));
    parts.push({ mark: text.slice(hit, hit + query.length) });
    at = hit + query.length;
  }
  return parts.map((p, i) =>
    typeof p === "string" ? (
      <span key={i}>{p}</span>
    ) : (
      <mark key={i} className="mn-mark">
        {p.mark}
      </mark>
    ),
  );
}

/** currentTime 이 속한(또는 직전) 세그먼트 인덱스 — 이진 탐색 */
function activeSegmentIndex(segments: Segment[], sec: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start <= sec) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

interface SpeakerChipProps {
  speaker: string;
  names: Record<string, string>;
  onRename?: (speaker: string, name: string) => void;
}

function SpeakerChip({ speaker, names, onRename }: SpeakerChipProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const label = speakerLabel(speaker, names);

  if (!onRename) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: speakerColor(speaker) }}>
        <span className="size-1.5 rounded-full" style={{ background: speakerColor(speaker) }} />
        {label}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={(next) => {
      setOpen(next);
      if (next) setValue(names[speaker] ?? "");
    }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 text-xs font-semibold hover:bg-muted"
          style={{ color: speakerColor(speaker) }}
          title="화자 이름 바꾸기 (전체 반영)"
        >
          <span className="size-1.5 rounded-full" style={{ background: speakerColor(speaker) }} />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            onRename(speaker, value.trim());
            setOpen(false);
          }}
        >
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`화자 ${speaker.replace(/^S/, "")} 이름`}
            className="h-8 text-sm"
          />
          <Button type="submit" size="icon" className="size-8 shrink-0">
            <CheckIcon className="size-4" />
          </Button>
        </form>
        <p className="mt-1.5 px-0.5 text-[11px] text-muted-foreground">모든 발언에 일괄 적용됩니다</p>
      </PopoverContent>
    </Popover>
  );
}

export interface TranscriptPanelProps {
  segments: Segment[];
  speakerNames: Record<string, string>;
  currentTime: number;
  playing: boolean;
  onSeek: (sec: number) => void;
  onRenameSpeaker?: (speaker: string, name: string) => void;
}

export function TranscriptPanel({
  segments,
  speakerNames,
  currentTime,
  playing,
  onSeek,
  onRenameSpeaker,
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const programmaticUntil = useRef(0);
  const [following, setFollowing] = useState(true);
  const [query, setQuery] = useState("");
  const [matchAt, setMatchAt] = useState(0);

  const activeIdx = useMemo(() => activeSegmentIndex(segments, currentTime), [segments, currentTime]);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return segments.reduce<number[]>((acc, seg, i) => {
      if (seg.text.toLowerCase().includes(q)) acc.push(i);
      return acc;
    }, []);
  }, [segments, query]);

  const scrollToSegment = useCallback((idx: number) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-seg="${idx}"]`);
    if (!el) return;
    programmaticUntil.current = Date.now() + 800;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  // 재생 팔로우 — 활성 세그먼트가 바뀔 때 중앙으로
  useEffect(() => {
    if (!following || !playing || activeIdx < 0) return;
    scrollToSegment(activeIdx);
  }, [activeIdx, following, playing, scrollToSegment]);

  // 사용자 스크롤 감지 → 팔로우 해제
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (Date.now() < programmaticUntil.current) return;
      setFollowing(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const jumpMatch = useCallback(
    (dir: 1 | -1) => {
      if (matches.length === 0) return;
      const next = (matchAt + dir + matches.length) % matches.length;
      setMatchAt(next);
      setFollowing(false);
      scrollToSegment(matches[next]);
    },
    [matches, matchAt, scrollToSegment],
  );

  const copyAll = useCallback(() => {
    const text = segments
      .map((seg) => {
        const who = seg.speaker ? `${speakerLabel(seg.speaker, speakerNames)}: ` : "";
        return `[${formatClock(seg.start)}] ${who}${seg.text}`;
      })
      .join("\n");
    void navigator.clipboard.writeText(text).then(() => toast.success("트랜스크립트를 복사했습니다"));
  }, [segments, speakerNames]);

  if (segments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
        아직 트랜스크립트가 없습니다
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* 검색 바 */}
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setMatchAt(0);
          }}
          placeholder="트랜스크립트 검색"
          className="h-7 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query ? (
          <>
            <span className="mn-clock shrink-0 text-[11px] text-muted-foreground">
              {matches.length ? `${matchAt + 1}/${matches.length}` : "0"}
            </span>
            <Button variant="ghost" size="icon" className="size-6" onClick={() => jumpMatch(-1)} disabled={!matches.length}>
              <ChevronUpIcon className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="size-6" onClick={() => jumpMatch(1)} disabled={!matches.length}>
              <ChevronDownIcon className="size-3.5" />
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="icon" className="size-6" onClick={copyAll} title="전체 복사">
            <CopyIcon className="size-3.5" />
          </Button>
        )}
      </div>

      {/* 세그먼트 목록 */}
      <div ref={scrollRef} className="mn-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {segments.map((seg, i) => {
          const showSpeaker = Boolean(seg.speaker) && (i === 0 || segments[i - 1].speaker !== seg.speaker);
          return (
            <div key={seg.id || i} data-seg={i} className={`mn-seg px-2 py-1.5 ${i === activeIdx ? "mn-seg-active" : ""}`}>
              {showSpeaker ? (
                <div className="mb-0.5 mt-1.5 flex items-center gap-2">
                  <SpeakerChip speaker={seg.speaker} names={speakerNames} onRename={onRenameSpeaker} />
                </div>
              ) : null}
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className="mn-clock mt-0.5 shrink-0 rounded px-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  onClick={() => {
                    setFollowing(true);
                    onSeek(seg.start);
                  }}
                  title="이 지점부터 재생"
                >
                  {formatClock(seg.start)}
                </button>
                <p className="min-w-0 flex-1 text-sm leading-relaxed">
                  {highlightText(seg.text, query.trim())}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 팔로우 복귀 버튼 */}
      {!following && playing ? (
        <Button
          size="sm"
          className="absolute bottom-3 left-1/2 h-7 -translate-x-1/2 gap-1.5 rounded-full px-3 text-xs shadow-lg"
          onClick={() => {
            setFollowing(true);
            if (activeIdx >= 0) scrollToSegment(activeIdx);
          }}
        >
          <CrosshairIcon className="size-3.5" />
          재생 위치 따라가기
        </Button>
      ) : null}
    </div>
  );
}

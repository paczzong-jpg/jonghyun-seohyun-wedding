import { useEffect, useMemo, useRef, useState } from "react";

import { CornerDownRight, Loader2, Pause, Play, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { isSpeechSupported, PodcastPlayer } from "@/lib/notebook/audio";
import { askPodcastQuestion, type NotebookContext } from "@/lib/notebook/llm";
import type { ArtifactPayloadMap, PodcastLine } from "@/lib/notebook/types";

const RATES = [0.9, 1, 1.2] as const;

const SPEAKER = {
  A: { name: "진행자", bg: "#EEF0FF", fg: "#4F46E5" },
  B: { name: "전문가", bg: "#E6F7F4", fg: "#0F766E" },
} as const;

export function AudioOverview({
  payload,
  getContext,
}: {
  payload: ArtifactPayloadMap["audio"];
  getContext: () => Promise<NotebookContext>;
}) {
  const [lines, setLines] = useState<PodcastLine[]>(payload.lines);
  const [activeLine, setActiveLine] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  /** 끼어들기로 삽입된 라인 인덱스 (시각 구분용) */
  const [injected, setInjected] = useState<Set<number>>(new Set());
  const playerRef = useRef<PodcastPlayer | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const supported = useMemo(isSpeechSupported, []);

  useEffect(() => {
    if (!supported) return;
    const player = new PodcastPlayer({
      onLine: setActiveLine,
      onEnd: () => setPlaying(false),
    });
    playerRef.current = player;
    player.load(payload.lines);
    return () => player.stop();
  }, [payload.lines, supported]);

  useEffect(() => {
    if (playerRef.current) playerRef.current.rate = rate;
  }, [rate]);

  useEffect(() => {
    if (activeLine >= 0) {
      listRef.current
        ?.querySelector(`[data-line="${activeLine}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeLine]);

  const toggle = () => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play(activeLine < 0 ? 0 : undefined);
      setPlaying(true);
    }
  };

  const restart = () => {
    const player = playerRef.current;
    if (!player) return;
    player.stop();
    player.play(0);
    setPlaying(true);
  };

  /** 재생 중 끼어들어 질문 — 현재 라인 뒤에 응답 대본을 삽입하고 이어서 재생 */
  const interrupt = async () => {
    const q = question.trim();
    const player = playerRef.current;
    if (!q || asking || !player) return;
    setAsking(true);
    player.pause();
    setPlaying(false);
    try {
      const context = await getContext();
      const reply = await askPodcastQuestion(lines, q, context);
      if (reply.length === 0) throw new Error("응답 대본이 비었습니다");
      const at = Math.max(activeLine, -1) + 1;
      const next = [...lines.slice(0, at), ...reply, ...lines.slice(at)];
      setLines(next);
      setInjected((prev) => {
        const set = new Set<number>();
        // 기존 삽입 위치 시프트
        prev.forEach((i) => set.add(i >= at ? i + reply.length : i));
        for (let i = 0; i < reply.length; i++) set.add(at + i);
        return set;
      });
      setQuestion("");
      await player.load(next);
      player.rate = rate;
      player.play(at);
      setPlaying(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "질문 처리에 실패했습니다");
    } finally {
      setAsking(false);
    }
  };

  if (!supported) {
    return (
      <p className="px-6 py-8 text-center text-[13.5px] text-muted-foreground">
        이 브라우저는 음성 합성을 지원하지 않아 대본만 제공됩니다.
      </p>
    );
  }

  return (
    <div className="flex h-[62dvh] flex-col">
      {/* 대본 */}
      <div ref={listRef} className="nb-scroll flex-1 px-5 py-4">
        <ol className="flex flex-col gap-3">
          {lines.map((line, i) => {
            const speaker = SPEAKER[line.speaker];
            const active = i === activeLine;
            return (
              <li
                key={`${i}-${line.text.slice(0, 8)}`}
                data-line={i}
                className={`flex gap-2.5 rounded-xl px-3 py-2.5 transition-colors ${
                  active ? "bg-secondary/70" : injected.has(i) ? "bg-[#FFFBEB]" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    playerRef.current?.play(i);
                    setPlaying(true);
                  }}
                  className="grid h-7 w-7 flex-none place-items-center rounded-full text-[11px] font-extrabold transition-transform hover:scale-110"
                  style={{ background: speaker.bg, color: speaker.fg }}
                  aria-label={`${speaker.name} 라인부터 재생`}
                >
                  {line.speaker}
                </button>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground">
                    {speaker.name}
                    {injected.has(i) && (
                      <span className="flex items-center gap-0.5 rounded-full bg-[#FDE68A] px-1.5 py-px text-[9.5px] text-[#92400E]">
                        <CornerDownRight size={9} /> 내 질문
                      </span>
                    )}
                  </p>
                  <p
                    className={`mt-0.5 text-[13.5px] leading-relaxed ${active ? "font-semibold" : ""}`}
                  >
                    {line.text}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* 컨트롤 */}
      <div className="flex-none border-t border-border bg-muted/30 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Button size="icon" className="h-11 w-11 rounded-full" onClick={toggle} aria-label={playing ? "일시정지" : "재생"}>
            {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground"
            onClick={restart}
            aria-label="처음부터"
          >
            <RotateCcw size={15} />
          </Button>

          {/* 진행 바 */}
          <div className="min-w-0 flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${activeLine < 0 ? 0 : ((activeLine + 1) / lines.length) * 100}%`,
                }}
              />
            </div>
            <p className="mt-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {Math.max(activeLine + 1, 0)} / {lines.length}
            </p>
          </div>

          <div className="flex rounded-full border border-border bg-card p-0.5">
            {RATES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRate(r)}
                className={`rounded-full px-2 py-1 text-[11px] font-extrabold ${
                  rate === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {r}×
              </button>
            ))}
          </div>
        </div>

        {/* 끼어들기 질문 */}
        <div className="mt-3 flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && interrupt()}
            placeholder="진행 중에 궁금한 걸 물어보세요 — 진행자가 답하고 이어갑니다"
            className="h-9 text-[13px]"
            disabled={asking}
          />
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 flex-none"
            onClick={interrupt}
            disabled={!question.trim() || asking}
            aria-label="질문 끼어들기"
          >
            {asking ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </Button>
        </div>
      </div>
    </div>
  );
}

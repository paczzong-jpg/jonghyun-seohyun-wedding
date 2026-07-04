import { useEffect, useRef, useState } from "react";
import { Loader2, Play, Pause, Gauge, Mail, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NewsMarkdown } from "./markdown";
import { EmailDialog } from "./email-dialog";
import {
  generateDailyBriefing,
  generateAudioScript,
  type StreamHandle,
} from "@/lib/news/llm";
import { findBriefing, createBriefing } from "@/lib/news/db";
import { BriefingSpeaker, type AudioPlayerState } from "@/lib/news/audio";
import { APP_NAME } from "@/lib/news-config";
import { kstDay } from "@/lib/news/normalize";
import type { Article, Cluster, CitationRef, Settings } from "@/lib/news/types";

// ────────────────────────────────────────────────
// 데일리 브리핑 뷰 — 오늘의 뉴스를 하나의 서사로 스트리밍 요약([n] 인용 포함).
//   · 당일 캐시(findBriefing) 재사용, 없으면 생성 후 저장(createBriefing)
//   · 오디오 낭독(Web Speech, 대본은 LLM이 [n] 없이 재작성)
//   · 이메일 브리핑 다이얼로그 진입점
// ────────────────────────────────────────────────

const RATES = [1, 1.25, 1.5, 0.85];

interface Props {
  clusters: Cluster[];
  articles: Article[];
  settings: Settings;
  keywords: string[];
  onCite?: (ref: CitationRef) => void;
}

export function BriefingView({ clusters, articles, settings, keywords, onCite }: Props) {
  const [content, setContent] = useState("");
  const [refs, setRefs] = useState<CitationRef[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "streaming" | "ready" | "error">("idle");
  const [emailOpen, setEmailOpen] = useState(false);
  const [audio, setAudio] = useState<AudioPlayerState | null>(null);
  const [preparingAudio, setPreparingAudio] = useState(false);

  const handleRef = useRef<StreamHandle | null>(null);
  const speakerRef = useRef<BriefingSpeaker | null>(null);
  const day = kstDay();

  async function generate(force = false) {
    if (status === "loading" || status === "streaming") return;
    teardownAudio();
    setStatus("loading");
    setContent("");
    setRefs([]);

    // 당일 캐시 재사용
    if (!force) {
      const cached = await findBriefing(day, "daily").catch(() => null);
      if (cached?.content_md) {
        setContent(cached.content_md);
        setRefs(cached.citations ?? []);
        setStatus("ready");
        return;
      }
    }

    if (clusters.length === 0 && articles.length === 0) {
      setStatus("idle");
      return;
    }

    try {
      const { handle, refs: liveRefs } = await generateDailyBriefing(
        clusters,
        articles,
        { tone: settings.tone, audience: settings.audience, keywords },
        {
          onChunk: (_delta, full) => {
            setStatus("streaming");
            setContent(full);
          },
          onDone: async (full) => {
            handleRef.current = null;
            setContent(full);
            setStatus("ready");
            const title = `${day} 데일리 브리핑`;
            await createBriefing({
              day,
              kind: "daily",
              title,
              content_md: full,
              citations: liveRefs.filter((r) => full.includes(`[${r.n}]`)),
              params: { tone: settings.tone, audience: settings.audience, keywords },
            }).catch(() => {});
          },
          onError: (err) => {
            handleRef.current = null;
            setStatus("error");
            toast.error(err.message || "브리핑 생성 중 오류가 발생했어요.");
          },
        },
      );
      handleRef.current = handle;
      setRefs(liveRefs);
    } catch (err) {
      setStatus("error");
      toast.error((err as Error).message || "브리핑 생성에 실패했어요.");
    }
  }

  function teardownAudio() {
    speakerRef.current?.destroy();
    speakerRef.current = null;
    setAudio(null);
  }

  async function toggleAudio() {
    if (speakerRef.current) {
      speakerRef.current.toggle();
      return;
    }
    if (!content || preparingAudio) return;
    setPreparingAudio(true);
    try {
      const script = await generateAudioScript(content, APP_NAME);
      const speaker = new BriefingSpeaker(script);
      if (!speaker.supported) {
        toast.error("이 브라우저는 음성 낭독을 지원하지 않아요.");
        speaker.destroy();
        return;
      }
      speaker.subscribe(setAudio);
      speakerRef.current = speaker;
      speaker.play();
    } catch (err) {
      toast.error((err as Error).message || "오디오 대본 생성에 실패했어요.");
    } finally {
      setPreparingAudio(false);
    }
  }

  function cycleRate() {
    const s = speakerRef.current;
    if (!s || !audio) return;
    const next = RATES[(RATES.indexOf(audio.rate) + 1) % RATES.length];
    s.setRate(next);
  }

  // 최초 진입 시 자동 생성 (코퍼스가 준비되면)
  useEffect(() => {
    if (status === "idle" && (clusters.length > 0 || articles.length > 0)) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters.length, articles.length]);

  // 언마운트 정리
  useEffect(
    () => () => {
      handleRef.current?.abort();
      speakerRef.current?.destroy();
    },
    [],
  );

  const busy = status === "loading" || status === "streaming";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* 헤더 + 액션 */}
      <div className="mb-5 flex items-end justify-between gap-3 border-b border-[var(--nw-hairline)] pb-4">
        <div>
          <div className="nw-overline mb-1 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[var(--nw-accent)]" /> AI 데일리 브리핑
          </div>
          <h1 className="nw-serif text-2xl">{day}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAudio}
            disabled={status !== "ready" || preparingAudio}
          >
            {preparingAudio ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : audio?.playing ? (
              <Pause className="mr-1.5 size-4" />
            ) : (
              <Play className="mr-1.5 size-4" />
            )}
            {audio ? `${audio.lineIndex + 1}/${audio.total}` : "듣기"}
          </Button>
          {audio && (
            <Button variant="ghost" size="sm" onClick={cycleRate} aria-label="재생 속도">
              <Gauge className="mr-1 size-4" /> {audio.rate}x
            </Button>
          )}
          <Button size="sm" onClick={() => setEmailOpen(true)} disabled={status !== "ready"}>
            <Mail className="mr-1.5 size-4" /> 메일로 만들기
          </Button>
          <Button variant="ghost" size="icon" onClick={() => generate(true)} disabled={busy} aria-label="다시 생성">
            <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 본문 */}
      {status === "loading" && (
        <div className="flex items-center gap-2 py-16 text-[var(--nw-ink-2)]">
          <Loader2 className="size-5 animate-spin" /> 오늘의 뉴스를 정리하는 중…
        </div>
      )}

      {status === "idle" && (
        <div className="py-16 text-center text-[var(--nw-ink-2)]">
          <p className="nw-meta">브리핑할 기사가 아직 없어요. 먼저 뉴스를 수집해 주세요.</p>
        </div>
      )}

      {(status === "streaming" || status === "ready") && (
        <article className="nw-article">
          <NewsMarkdown content={content} refs={refs} onCite={onCite} streaming={status === "streaming"} />
        </article>
      )}

      {status === "error" && (
        <div className="py-16 text-center">
          <p className="nw-meta mb-3 text-[var(--nw-live)]">브리핑을 만들지 못했어요.</p>
          <Button variant="outline" size="sm" onClick={() => generate(true)}>
            <RefreshCw className="mr-1.5 size-4" /> 다시 시도
          </Button>
        </div>
      )}

      <EmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        clusters={clusters}
        articles={articles}
        settings={settings}
        keywords={keywords}
      />
    </div>
  );
}

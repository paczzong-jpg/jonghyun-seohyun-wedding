import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CircleStopIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MicIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LANGUAGES,
  LIVE_TAIL_LINES,
  LIVE_WINDOW_SEC,
  resolveBrowserTranscriptLanguage,
} from "@/lib/meeting-config";
import {
  MeetingRecorder,
  audioFileName,
  describeMicError,
  formatClock,
  type MicError,
} from "@/lib/meeting/audio";
import { createMeeting, ensureTemplates } from "@/lib/meeting/db";
import { finalizeRecordedMeeting, type ProcessStage } from "@/lib/meeting/process";
import { getStt } from "@/lib/meeting/stt";
import type { MinutesTemplate, RawSegment, SttProgress } from "@/lib/meeting/types";

// ────────────────────────────────────────────────
// 녹음 화면 — 다크 스테이지 포커스 모드.
// 녹음(원본 webm)과 16kHz PCM 축적을 병행하며,
// LIVE_WINDOW_SEC 만큼 쌓일 때마다 브라우저 로컬 Whisper 로 라이브 전사한다.
// 종료 시: 회의 생성(오디오 첨부) → 화자 분리 → 세그먼트 저장 → 회의록 생성.
// ────────────────────────────────────────────────

type Phase = "setup" | "recording" | "finishing";

const STAGE_LABEL: Record<ProcessStage, string> = {
  prepare: "오디오 준비 중",
  transcribe: "남은 구간 전사 중",
  diarize: "화자 분석 중",
  save: "트랜스크립트 저장 중",
  minutes: "회의록 작성 중",
};

export function RecordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<string>(() => resolveBrowserTranscriptLanguage());
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<MinutesTemplate[]>([]);
  const [micError, setMicError] = useState<MicError | null>(null);
  const [starting, setStarting] = useState(false);

  const recorderRef = useRef<MeetingRecorder | null>(null);
  const segmentsRef = useRef<RawSegment[]>([]);
  const busyRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liveSegments, setLiveSegments] = useState<RawSegment[]>([]);
  const [sttProgress, setSttProgress] = useState<SttProgress | null>(null);
  const [sttWarning, setSttWarning] = useState("");
  const [finishStage, setFinishStage] = useState<ProcessStage>("transcribe");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureTemplates()
      .then((list) => {
        setTemplates(list);
        setTemplateId((prev) => prev || list[0]?.id || "");
      })
      .catch(() => toast.error("템플릿을 불러오지 못했습니다"));
  }, []);

  // 녹음 중 이탈 경고
  useEffect(() => {
    if (phase !== "recording") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase]);

  // STT 진행 상태 구독
  useEffect(() => {
    const stt = getStt();
    return stt.onProgress((p) => setSttProgress(p));
  }, []);

  // 라이브 라인 자동 스크롤
  useEffect(() => {
    const el = liveScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [liveSegments.length]);

  // 파형 + 타이머 + 라이브 전사 루프
  useEffect(() => {
    if (phase !== "recording") return;
    let raf = 0;
    const wave = new Uint8Array(256);

    const draw = () => {
      const recorder = recorderRef.current;
      const canvas = canvasRef.current;
      if (recorder && canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const { width, height } = canvas;
          ctx.clearRect(0, 0, width, height);
          recorder.getWaveform(wave);
          const barCount = 64;
          const step = Math.floor(wave.length / barCount);
          const barWidth = width / barCount;
          for (let i = 0; i < barCount; i++) {
            const v = Math.abs(wave[i * step] - 128) / 128;
            const barHeight = Math.max(2, v * height * 1.6);
            ctx.fillStyle = recorder.paused ? "rgba(139,148,141,0.5)" : "rgba(85,180,146,0.9)";
            ctx.fillRect(
              i * barWidth + barWidth * 0.2,
              (height - barHeight) / 2,
              barWidth * 0.6,
              barHeight,
            );
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const timer = window.setInterval(() => {
      const recorder = recorderRef.current;
      if (!recorder) return;
      setElapsed(recorder.elapsedSec);
      // 라이브 윈도우 전사 — 이전 요청이 끝난 뒤에만
      if (!recorder.paused && !busyRef.current && recorder.pendingSec() >= LIVE_WINDOW_SEC) {
        const drained = recorder.drainPcm();
        if (drained) {
          busyRef.current = true;
          getStt()
            .transcribe(drained.pcm, drained.offsetSec, language)
            .then((segments) => {
              segmentsRef.current = [...segmentsRef.current, ...segments];
              setLiveSegments(segmentsRef.current);
              setSttWarning("");
            })
            .catch((error: Error) => {
              setSttWarning(`라이브 전사 지연/실패 — 녹음은 계속 저장됩니다 (${error.message})`);
            })
            .finally(() => {
              busyRef.current = false;
              setSttProgress(null);
            });
        }
      }
    }, 500);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, [phase, language]);

  const start = useCallback(async () => {
    setStarting(true);
    setMicError(null);
    try {
      const recorder = await MeetingRecorder.start();
      recorderRef.current = recorder;
      segmentsRef.current = [];
      setLiveSegments([]);
      setElapsed(0);
      setPaused(false);
      setPhase("recording");
      // 모델 워밍업 — 무음 0.1초를 전사해 다운로드/초기화를 미리 시작한다
      busyRef.current = true;
      getStt()
        .transcribe(new Float32Array(1600), 0, language)
        .catch(() => undefined)
        .finally(() => {
          busyRef.current = false;
          setSttProgress(null);
        });
    } catch (error) {
      setMicError(describeMicError(error));
    } finally {
      setStarting(false);
    }
  }, [language]);

  const togglePause = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.paused) {
      await recorder.resume();
      setPaused(false);
    } else {
      await recorder.pause();
      setPaused(true);
    }
  }, []);

  const finish = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.elapsedSec < 3) {
      toast.error("3초 이상 녹음해주세요");
      return;
    }
    setPhase("finishing");
    setFinishStage("transcribe");
    try {
      // 진행 중인 라이브 전사가 끝날 때까지 대기
      while (busyRef.current) {
        await new Promise((r) => setTimeout(r, 200));
      }
      const { blob, mimeType, duration } = await recorder.stop();
      const fullPcm = recorder.fullPcm();

      // 잔여 구간(마지막 윈도우) 전사
      const drained = recorder.drainPcm();
      if (drained) {
        const tail = await getStt().transcribe(drained.pcm, drained.offsetSec, language);
        segmentsRef.current = [...segmentsRef.current, ...tail];
      }
      // 라이브 전사가 전부 실패했다면 전체 PCM 으로 한 번에 재시도
      if (segmentsRef.current.length === 0) {
        segmentsRef.current = await getStt().transcribe(fullPcm.slice(), 0, language);
      }

      const meeting = await createMeeting({
        title: title.trim(),
        language,
        origin: "record",
        template: templateId,
        audio: blob,
        audioName: audioFileName(mimeType),
        duration: Math.round(duration),
      });

      await finalizeRecordedMeeting(meeting, segmentsRef.current, fullPcm, {
        onStage: setFinishStage,
      });
      navigate(`/meeting/${meeting.id}`, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "회의 저장에 실패했습니다");
      setPhase("recording");
    }
  }, [language, navigate, templateId, title]);

  // ── 셋업 화면 ────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="mn-grain flex min-h-dvh flex-col items-center justify-center bg-background p-6">
        <div className="mn-card w-full max-w-md p-7">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-4 gap-1 text-muted-foreground"
            onClick={() => navigate("/")}
          >
            <ArrowLeftIcon className="size-3.5" />
            대시보드
          </Button>
          <h1 className="mn-display text-2xl">새 회의 녹음</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            음성은 서버로 전송되지 않고 이 브라우저에서 전사됩니다.
          </p>

          <div className="mt-6 space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="회의 제목 (비우면 자동 생성)"
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="언어" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="회의록 템플릿" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {micError ? (
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="text-destructive">{micError.message}</p>
              {micError.reason === "iframe-policy" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1.5"
                  onClick={() => window.open(window.location.href, "_blank")}
                >
                  <ExternalLinkIcon className="size-3.5" />
                  새 탭에서 열기
                </Button>
              ) : null}
            </div>
          ) : null}

          <Button className="mt-6 h-12 w-full gap-2 text-base" onClick={() => void start()} disabled={starting}>
            {starting ? <Loader2Icon className="size-5 animate-spin" /> : <MicIcon className="size-5" />}
            녹음 시작
          </Button>
        </div>
      </div>
    );
  }

  // ── 녹음/마무리 스테이지 ─────────────────────
  return (
    <div className="mn-stage flex min-h-dvh flex-col">
      {/* 헤더 */}
      <header className="flex items-center gap-3 px-6 py-4">
        <span className={paused ? "size-[0.7rem] rounded-full bg-[var(--mn-stage-faint)]" : "mn-rec-dot"} />
        <span className="text-sm font-medium tracking-wide text-[var(--mn-stage-faint)]">
          {paused ? "일시정지됨" : "녹음 중"}
        </span>
        <span className="ml-auto text-xs text-[var(--mn-stage-faint)]">
          {title.trim() || "제목 없는 회의"}
        </span>
      </header>

      {/* 타이머 + 파형 */}
      <div className="flex flex-col items-center gap-6 px-6 pt-6">
        <div className="mn-display mn-clock text-7xl tracking-tight">{formatClock(elapsed)}</div>
        <canvas ref={canvasRef} width={560} height={72} className="max-w-full" />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            className="gap-2 border-[var(--mn-stage-line)] bg-transparent text-[var(--mn-stage-ink)] hover:bg-[var(--mn-stage-soft)] hover:text-[var(--mn-stage-ink)]"
            onClick={() => void togglePause()}
            disabled={phase === "finishing"}
          >
            {paused ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
            {paused ? "재개" : "일시정지"}
          </Button>
          <Button
            size="lg"
            className="gap-2 bg-[var(--mn-rec)] text-white hover:bg-[var(--mn-rec)]/90"
            onClick={() => void finish()}
            disabled={phase === "finishing"}
          >
            <CircleStopIcon className="size-4" />
            녹음 종료
          </Button>
        </div>
      </div>

      {/* 라이브 트랜스크립트 */}
      <div className="mx-auto mt-8 flex w-full max-w-2xl min-h-0 flex-1 flex-col px-6 pb-6">
        <div className="mb-2 flex items-center gap-2 text-xs text-[var(--mn-stage-faint)]">
          <span className={`size-1.5 rounded-full ${busyRef.current ? "bg-[var(--mn-live)]" : "bg-[var(--mn-stage-line)]"}`} />
          라이브 트랜스크립트
          {sttProgress?.kind === "download" ? (
            <span>
              — 음성인식 모델 다운로드 {sttProgress.percent >= 0 ? `${sttProgress.percent}%` : ""} ({sttProgress.detail})
            </span>
          ) : null}
        </div>
        <div
          ref={liveScrollRef}
          className="mn-stage-card mn-scroll min-h-0 flex-1 overflow-y-auto p-4"
        >
          {liveSegments.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--mn-stage-faint)]">
              말씀을 시작하면 약 {LIVE_WINDOW_SEC}초 단위로 전사 결과가 나타납니다
            </p>
          ) : (
            <div className="space-y-2.5">
              {liveSegments.slice(-LIVE_TAIL_LINES).map((seg, i) => (
                <p key={`${seg.start}-${i}`} className="mn-line-in text-sm leading-relaxed">
                  <span className="mn-clock mr-2 text-[11px] text-[var(--mn-stage-faint)]">
                    {formatClock(seg.start)}
                  </span>
                  {seg.text}
                </p>
              ))}
            </div>
          )}
        </div>
        {sttWarning ? (
          <p className="mt-2 text-xs text-[var(--mn-rec)]">{sttWarning}</p>
        ) : null}
      </div>

      {/* 마무리 오버레이 */}
      {phase === "finishing" ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[var(--mn-stage)]/85 backdrop-blur-sm">
          <Loader2Icon className="size-8 animate-spin text-[var(--mn-live)]" />
          <p className="mn-display text-xl text-[var(--mn-stage-ink)]">{STAGE_LABEL[finishStage]}</p>
          <p className="text-sm text-[var(--mn-stage-faint)]">
            {sttProgress?.kind === "transcribe" && sttProgress.percent >= 0
              ? `전사 진행 ${sttProgress.percent}%`
              : "잠시만 기다려주세요 — 이 탭을 닫지 마세요"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

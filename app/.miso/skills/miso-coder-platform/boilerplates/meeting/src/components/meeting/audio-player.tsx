import { useCallback, useEffect, useRef, useState } from "react";
import { DownloadIcon, PauseIcon, PlayIcon, RotateCcwIcon, RotateCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatClock } from "@/lib/meeting/audio";

// ────────────────────────────────────────────────
// 오디오 플레이어 — PB 파일 URL 을 <audio> 로 프로그레시브 스트리밍 재생.
// Audio 객체는 훅이 소유하고, 재생 위치는 rAF 로 매끄럽게 갱신한다.
// MediaRecorder webm 은 duration 메타데이터가 없어 Infinity 로 뜨는
// 크롬 이슈가 있다 — 큰 값 시크로 강제 계산 + durationHint 폴백.
// ────────────────────────────────────────────────

export interface AudioPlayer {
  ready: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  toggle: () => void;
  pause: () => void;
  /** 해당 위치로 이동 — 기본으로 즉시 재생 시작 */
  seek: (sec: number, opts?: { autoplay?: boolean }) => void;
  skip: (delta: number) => void;
  cycleRate: () => void;
}

const RATES = [1, 1.25, 1.5, 2];

export function useAudioPlayer(url: string, durationHint: number): AudioPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationHint);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    if (!url) return;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = url;
    audioRef.current = audio;

    const readDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        return true;
      }
      return false;
    };

    const onLoaded = () => {
      setReady(true);
      if (!readDuration()) {
        // webm duration 강제 계산 트릭
        const onDurationChange = () => {
          if (readDuration()) {
            audio.currentTime = 0;
            audio.removeEventListener("durationchange", onDurationChange);
          }
        };
        audio.addEventListener("durationchange", onDurationChange);
        audio.currentTime = 1e7;
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(audio.duration || 0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.src = "";
      audioRef.current = null;
      setReady(false);
      setPlaying(false);
      setCurrentTime(0);
    };
  }, [url]);

  // 재생 중 rAF 로 currentTime 을 매끄럽게 갱신 (트랜스크립트 하이라이트용)
  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const seek = useCallback((sec: number, opts?: { autoplay?: boolean }) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, sec);
    setCurrentTime(Math.max(0, sec));
    if (opts?.autoplay !== false && audio.paused) void audio.play();
  }, []);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime + delta);
    setCurrentTime(audio.currentTime);
  }, []);

  const cycleRate = useCallback(() => {
    setRate((prev) => {
      const next = RATES[(RATES.indexOf(prev) + 1) % RATES.length];
      if (audioRef.current) audioRef.current.playbackRate = next;
      return next;
    });
  }, []);

  return { ready, playing, currentTime, duration, rate, toggle, pause, seek, skip, cycleRate };
}

// ── 하단 도킹 플레이어 바 ──────────────────────

export interface AudioPlayerBarProps {
  player: AudioPlayer;
  downloadUrl?: string;
  downloadName?: string;
}

export function AudioPlayerBar({ player, downloadUrl, downloadName }: AudioPlayerBarProps) {
  const { ready, playing, currentTime, duration, rate } = player;
  return (
    <div className="mn-card flex items-center gap-3 px-4 py-2.5">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={() => player.skip(-10)}
        disabled={!ready}
        title="10초 뒤로"
      >
        <RotateCcwIcon className="size-4" />
      </Button>
      <Button
        size="icon"
        className="size-10 shrink-0 rounded-full"
        onClick={player.toggle}
        disabled={!ready}
        title={playing ? "일시정지" : "재생"}
      >
        {playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4 translate-x-[1px]" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={() => player.skip(10)}
        disabled={!ready}
        title="10초 앞으로"
      >
        <RotateCwIcon className="size-4" />
      </Button>

      <span className="mn-clock w-12 shrink-0 text-right text-xs text-muted-foreground">
        {formatClock(currentTime)}
      </span>
      <Slider
        value={[Math.min(currentTime, duration || 0)]}
        max={Math.max(duration, 1)}
        step={1}
        onValueChange={([v]) => player.seek(v, { autoplay: false })}
        disabled={!ready}
        className="flex-1"
      />
      <span className="mn-clock w-12 shrink-0 text-xs text-muted-foreground">
        {formatClock(duration)}
      </span>

      <Button
        variant="outline"
        size="sm"
        className="mn-clock h-7 w-14 shrink-0 px-0 text-xs"
        onClick={player.cycleRate}
        disabled={!ready}
        title="재생 속도"
      >
        {rate}x
      </Button>
      {downloadUrl ? (
        <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild title="원본 오디오 다운로드">
          <a href={downloadUrl} download={downloadName ?? true}>
            <DownloadIcon className="size-4" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}

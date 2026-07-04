import type { PodcastLine } from "./types";

// ────────────────────────────────────────────────
// 오디오 오버뷰 재생 — Web Speech API (브라우저 네이티브 TTS).
// 두 화자를 서로 다른 보이스(없으면 피치·속도 차등)로 구분한다.
// ────────────────────────────────────────────────

export interface PodcastPlayerCallbacks {
  /** 현재 재생 중인 라인 인덱스 (-1 = 정지) */
  onLine: (index: number) => void;
  onEnd: () => void;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length > 0) return Promise.resolve(now);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(synth.getVoices()), 1500);
    synth.addEventListener(
      "voiceschanged",
      () => {
        window.clearTimeout(timer);
        resolve(synth.getVoices());
      },
      { once: true },
    );
  });
}

function pickVoices(voices: SpeechSynthesisVoice[]): {
  a: SpeechSynthesisVoice | null;
  b: SpeechSynthesisVoice | null;
} {
  const korean = voices.filter((v) => v.lang.toLowerCase().startsWith("ko"));
  const pool = korean.length > 0 ? korean : voices;
  if (pool.length === 0) return { a: null, b: null };
  return { a: pool[0], b: pool[1] ?? pool[0] };
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * 팟캐스트 대본 플레이어.
 * play/pause/stop 과 현재 라인 콜백을 제공한다.
 */
export class PodcastPlayer {
  /** 재생 속도 배율 (0.8~1.4 권장) */
  rate = 1;
  private lines: PodcastLine[] = [];
  private index = -1;
  private playing = false;
  private callbacks: PodcastPlayerCallbacks;
  private voiceA: SpeechSynthesisVoice | null = null;
  private voiceB: SpeechSynthesisVoice | null = null;
  private sameVoice = false;

  constructor(callbacks: PodcastPlayerCallbacks) {
    this.callbacks = callbacks;
  }

  async load(lines: PodcastLine[]): Promise<void> {
    this.stop();
    this.lines = lines;
    const voices = await loadVoices();
    const picked = pickVoices(voices);
    this.voiceA = picked.a;
    this.voiceB = picked.b;
    this.sameVoice = picked.a === picked.b;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  play(fromIndex?: number): void {
    if (this.lines.length === 0) return;
    if (fromIndex === undefined && window.speechSynthesis.paused && this.playing === false) {
      // 일시정지 상태 재개
      window.speechSynthesis.resume();
      this.playing = true;
      return;
    }
    window.speechSynthesis.cancel();
    this.index = fromIndex ?? Math.max(this.index, 0);
    this.playing = true;
    this.speakCurrent();
  }

  pause(): void {
    if (!this.playing) return;
    window.speechSynthesis.pause();
    this.playing = false;
  }

  stop(): void {
    window.speechSynthesis.cancel();
    this.playing = false;
    this.index = -1;
    this.callbacks.onLine(-1);
  }

  private speakCurrent(): void {
    if (this.index >= this.lines.length) {
      this.playing = false;
      this.index = -1;
      this.callbacks.onLine(-1);
      this.callbacks.onEnd();
      return;
    }
    const line = this.lines[this.index];
    this.callbacks.onLine(this.index);

    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.lang = "ko-KR";
    const isA = line.speaker === "A";
    const voice = isA ? this.voiceA : this.voiceB;
    if (voice) utterance.voice = voice;
    // 보이스가 하나뿐이면 피치·속도로 화자를 구분한다
    utterance.pitch = this.sameVoice ? (isA ? 1.12 : 0.88) : 1;
    utterance.rate = (this.sameVoice ? (isA ? 1.06 : 0.98) : 1.02) * this.rate;
    utterance.onend = () => {
      if (!this.playing) return;
      this.index += 1;
      this.speakCurrent();
    };
    utterance.onerror = () => {
      this.playing = false;
      this.callbacks.onLine(-1);
      this.callbacks.onEnd();
    };
    window.speechSynthesis.speak(utterance);
  }
}

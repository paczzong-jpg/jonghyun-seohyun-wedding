import type { AudioScript } from "./types";

// ────────────────────────────────────────────────
// 오디오 브리핑 — 브라우저 내장 Web Speech(speechSynthesis)로 대본 낭독.
// TTS 파일 API 는 플랫폼에 없다 — 재생만 제공(다운로드 아님).
// ────────────────────────────────────────────────

export interface AudioPlayerState {
  playing: boolean;
  lineIndex: number;
  total: number;
  rate: number;
}

type Listener = (state: AudioPlayerState) => void;

function pickKoVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return (
    voices.find((v) => v.lang === "ko-KR") ??
    voices.find((v) => v.lang?.startsWith("ko")) ??
    null
  );
}

export class BriefingSpeaker {
  private lines: string[];
  private idx = 0;
  private rate = 1;
  private playing = false;
  private listeners = new Set<Listener>();
  private voice: SpeechSynthesisVoice | null = null;

  constructor(script: AudioScript) {
    this.lines = script.lines.map((l) => l.text).filter(Boolean);
    this.voice = pickKoVoice();
    // 보이스 목록이 비동기 로드되는 브라우저 대응
    if (!this.voice && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.voice = pickKoVoice();
      };
    }
  }

  get supported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private get state(): AudioPlayerState {
    return { playing: this.playing, lineIndex: this.idx, total: this.lines.length, rate: this.rate };
  }

  private emit() {
    for (const fn of this.listeners) fn(this.state);
  }

  private speakCurrent() {
    if (this.idx >= this.lines.length) {
      this.playing = false;
      this.idx = 0;
      this.emit();
      return;
    }
    const utter = new SpeechSynthesisUtterance(this.lines[this.idx]);
    utter.lang = "ko-KR";
    utter.rate = this.rate;
    if (this.voice) utter.voice = this.voice;
    utter.onend = () => {
      if (!this.playing) return;
      this.idx += 1;
      this.emit();
      this.speakCurrent();
    };
    window.speechSynthesis.speak(utter);
  }

  play() {
    if (!this.supported || this.lines.length === 0) return;
    window.speechSynthesis.cancel();
    this.playing = true;
    this.emit();
    this.speakCurrent();
  }

  pause() {
    this.playing = false;
    window.speechSynthesis.cancel();
    this.emit();
  }

  toggle() {
    this.playing ? this.pause() : this.play();
  }

  seek(lineIndex: number) {
    this.idx = Math.max(0, Math.min(lineIndex, this.lines.length - 1));
    this.emit();
    if (this.playing) {
      window.speechSynthesis.cancel();
      this.speakCurrent();
    }
  }

  setRate(rate: number) {
    this.rate = rate;
    this.emit();
    if (this.playing) {
      window.speechSynthesis.cancel();
      this.speakCurrent();
    }
  }

  destroy() {
    this.playing = false;
    if (this.supported) window.speechSynthesis.cancel();
    this.listeners.clear();
  }
}

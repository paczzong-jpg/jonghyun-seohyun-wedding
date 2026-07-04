// ────────────────────────────────────────────────
// 오디오 캡처·변환 유틸.
// - 저장용: MediaRecorder(webm/opus) 원본 Blob
// - 전사용: AudioContext(16kHz) ScriptProcessor 로 mono PCM 을 함께 축적
//   (Whisper 입력은 항상 16kHz mono Float32Array)
// ────────────────────────────────────────────────

const SAMPLE_RATE = 16_000;

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

export function concatFloat32(parts: Float32Array[]): Float32Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Float32Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** 업로드 파일/Blob → 16kHz mono Float32 PCM (OfflineAudioContext 리샘플) */
export async function decodeToPcm16k(
  source: Blob,
): Promise<{ pcm: Float32Array; duration: number }> {
  const arrayBuffer = await source.arrayBuffer();
  const decodeCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  } finally {
    void decodeCtx.close();
  }
  const offline = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE)),
    SAMPLE_RATE,
  );
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return { pcm: rendered.getChannelData(0), duration: decoded.duration };
}

// ── 마이크 권한 진단 ───────────────────────────

export type MicBlockReason = "iframe-policy" | "denied" | "no-device" | "insecure" | "other";

export interface MicError {
  reason: MicBlockReason;
  message: string;
}

/**
 * getUserMedia 실패 원인 분류.
 * 코더 에디터 미리보기 iframe 은 microphone permissions policy 가 없어
 * 항상 차단된다 — 이 경우 "새 탭에서 열기"를 안내해야 한다.
 */
export function describeMicError(err: unknown): MicError {
  const name = err instanceof DOMException ? err.name : "";
  const inIframe = window.self !== window.top;
  if (!window.isSecureContext) {
    return { reason: "insecure", message: "보안 연결(https)에서만 마이크를 사용할 수 있습니다." };
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return { reason: "no-device", message: "사용 가능한 마이크 장치를 찾지 못했습니다." };
  }
  if (name === "NotAllowedError" && inIframe) {
    return {
      reason: "iframe-policy",
      message: "미리보기 화면 안에서는 마이크가 차단됩니다. 새 탭에서 열어 녹음해주세요.",
    };
  }
  if (name === "NotAllowedError") {
    return { reason: "denied", message: "마이크 권한이 거부되었습니다. 브라우저 주소창에서 허용해주세요." };
  }
  const detail = err instanceof Error && err.message ? ` (${err.message})` : "";
  return { reason: "other", message: `마이크를 열 수 없습니다${detail}. 장치·브라우저 설정을 확인해주세요.` };
}

// ── 녹음기 ─────────────────────────────────────

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function audioFileName(mimeType: string): string {
  const ext = mimeType.includes("mp4") ? "m4a" : "webm";
  return `meeting-audio.${ext}`;
}

/**
 * 마이크 녹음기 — 원본 Blob 축적과 16kHz PCM 축적을 동시에 수행한다.
 * 라이브 전사는 drainPcm() 으로 새로 쌓인 구간만 가져가 전사한다.
 */
export class MeetingRecorder {
  private stream: MediaStream;
  private recorder: MediaRecorder;
  private ctx: AudioContext;
  private processor: ScriptProcessorNode;
  private silent: GainNode;
  readonly analyser: AnalyserNode;
  readonly mimeType: string;

  private blobs: Blob[] = [];
  private pcmParts: Float32Array[] = [];
  private totalSamples = 0;
  private drainedSamples = 0;
  private stopped = false;

  private constructor(stream: MediaStream, ctx: AudioContext) {
    this.stream = stream;
    this.ctx = ctx;
    this.mimeType = pickMimeType();
    this.recorder = new MediaRecorder(
      stream,
      this.mimeType ? { mimeType: this.mimeType } : undefined,
    );
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.blobs.push(e.data);
    };

    const source = ctx.createMediaStreamSource(stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    source.connect(this.analyser);

    // ScriptProcessor 는 destination 에 연결돼야 콜백이 돈다 — gain 0 으로 무음 처리
    this.processor = ctx.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      if (this.stopped) return;
      const input = e.inputBuffer.getChannelData(0);
      this.pcmParts.push(new Float32Array(input));
      this.totalSamples += input.length;
    };
    this.silent = ctx.createGain();
    this.silent.gain.value = 0;
    source.connect(this.processor);
    this.processor.connect(this.silent);
    this.silent.connect(ctx.destination);
  }

  static async start(): Promise<MeetingRecorder> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    // 16kHz 컨텍스트 — 브라우저가 입력을 자동 리샘플한다
    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    if (ctx.state === "suspended") await ctx.resume();
    const recorder = new MeetingRecorder(stream, ctx);
    recorder.recorder.start(1000);
    return recorder;
  }

  /** 오디오 기준 경과 시간(초) — 일시정지 구간 제외 */
  get elapsedSec(): number {
    return this.totalSamples / SAMPLE_RATE;
  }

  get paused(): boolean {
    return this.recorder.state === "paused";
  }

  async pause(): Promise<void> {
    if (this.recorder.state === "recording") this.recorder.pause();
    await this.ctx.suspend();
  }

  async resume(): Promise<void> {
    if (this.recorder.state === "paused") this.recorder.resume();
    await this.ctx.resume();
  }

  /** 마지막 drain 이후 새로 쌓인 PCM 길이(초) */
  pendingSec(): number {
    return (this.totalSamples - this.drainedSamples) / SAMPLE_RATE;
  }

  /** 새로 쌓인 PCM 구간을 가져가고 오프셋(초)을 함께 반환 */
  drainPcm(): { pcm: Float32Array; offsetSec: number } | null {
    if (this.totalSamples <= this.drainedSamples) return null;
    const offsetSec = this.drainedSamples / SAMPLE_RATE;
    const full = concatFloat32(this.pcmParts);
    const pcm = full.slice(this.drainedSamples);
    this.drainedSamples = this.totalSamples;
    return { pcm, offsetSec };
  }

  /** 전체 PCM — 화자 분리 패스에 사용 */
  fullPcm(): Float32Array {
    return concatFloat32(this.pcmParts);
  }

  /** 파형 시각화용 시간영역 데이터 */
  getWaveform(target: Uint8Array): void {
    this.analyser.getByteTimeDomainData(target);
  }

  async stop(): Promise<{ blob: Blob; mimeType: string; duration: number }> {
    this.stopped = true;
    const stopped = new Promise<void>((resolve) => {
      this.recorder.onstop = () => resolve();
    });
    if (this.recorder.state !== "inactive") this.recorder.stop();
    await stopped;

    this.processor.disconnect();
    this.silent.disconnect();
    for (const track of this.stream.getTracks()) track.stop();
    await this.ctx.close();

    const type = this.mimeType || "audio/webm";
    return {
      blob: new Blob(this.blobs, { type }),
      mimeType: type,
      duration: this.totalSamples / SAMPLE_RATE,
    };
  }
}

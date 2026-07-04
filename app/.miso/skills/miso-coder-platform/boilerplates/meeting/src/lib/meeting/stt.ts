import type { RawSegment, SpeakerTurn, SttProgress } from "./types";
import type { SttWorkerRequest, SttWorkerResponse } from "./stt-worker";

// ────────────────────────────────────────────────
// STT 워커 클라이언트 — 메인스레드 파사드.
// - 워커는 앱 수명 동안 싱글턴 유지 (모델 재로딩 비용 회피)
// - 요청은 직렬화(큐) — ONNX 세션 동시 실행을 피한다
// - PCM 은 transferable 로 넘긴다 (대용량 복사 방지)
// ────────────────────────────────────────────────

type Pending =
  | { kind: "segments"; resolve: (v: RawSegment[]) => void; reject: (e: Error) => void }
  | { kind: "turns"; resolve: (v: SpeakerTurn[]) => void; reject: (e: Error) => void };

/** 유니온에 분배되는 Omit — 요청 타입에서 id 만 제거 */
type SttRequestInput = SttWorkerRequest extends infer T
  ? T extends { id: number }
    ? Omit<T, "id">
    : never
  : never;

export class SttClient {
  private worker: Worker;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private queue: Promise<unknown> = Promise.resolve();
  private progressListeners = new Set<(p: SttProgress) => void>();
  /** 워커가 보고한 실행 디바이스 — UI 배지용 */
  device: "webgpu" | "wasm" | null = null;

  constructor() {
    this.worker = new Worker(new URL("./stt-worker.ts", import.meta.url), { type: "module" });
    this.worker.addEventListener("message", (event: MessageEvent<SttWorkerResponse>) => {
      const msg = event.data;
      if (msg.type === "progress") {
        for (const listener of this.progressListeners) {
          listener({ kind: msg.kind, percent: msg.percent, detail: msg.detail });
        }
        return;
      }
      if (msg.type === "device") {
        this.device = msg.device;
        return;
      }
      const pending = this.pending.get(msg.id);
      if (!pending) return;
      this.pending.delete(msg.id);
      if (msg.type === "error") {
        pending.reject(new Error(msg.message));
      } else if (msg.type === "segments" && pending.kind === "segments") {
        pending.resolve(msg.segments);
      } else if (msg.type === "turns" && pending.kind === "turns") {
        pending.resolve(msg.turns);
      }
    });
    this.worker.addEventListener("error", (event) => {
      const error = new Error(event.message || "STT 워커 오류");
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    });
  }

  onProgress(listener: (p: SttProgress) => void): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  private enqueue<T>(run: () => Promise<T>): Promise<T> {
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private request<T extends RawSegment[] | SpeakerTurn[]>(
    kind: Pending["kind"],
    message: SttRequestInput,
    pcm: Float32Array,
  ): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { kind, resolve, reject } as Pending);
      this.worker.postMessage({ ...message, id }, [pcm.buffer]);
    });
  }

  /** PCM(16kHz mono) 전사 — offsetSec 만큼 타임스탬프가 밀린 세그먼트 반환 */
  transcribe(pcm: Float32Array, offsetSec: number, language: string): Promise<RawSegment[]> {
    return this.enqueue(() =>
      this.request<RawSegment[]>("segments", { type: "transcribe", pcm, offsetSec, language }, pcm),
    );
  }

  /** 전체 PCM 화자 분리 — 실패해도 앱은 화자 없이 계속 동작해야 한다 */
  diarize(pcm: Float32Array): Promise<SpeakerTurn[]> {
    return this.enqueue(() => this.request<SpeakerTurn[]>("turns", { type: "diarize", pcm }, pcm));
  }

  dispose(): void {
    this.worker.terminate();
    this.pending.clear();
    this.progressListeners.clear();
  }
}

let sttSingleton: SttClient | null = null;

export function getStt(): SttClient {
  if (!sttSingleton) sttSingleton = new SttClient();
  return sttSingleton;
}

// ── 화자 병합 ──────────────────────────────────

/**
 * Whisper 세그먼트에 화자 턴을 시간 겹침 최대 기준으로 매칭한다.
 * 감지된 화자가 2명 미만이면 "화자 분리 불가"로 판정하고 원본을 그대로 둔다.
 */
export function applySpeakerTurns(
  segments: RawSegment[],
  turns: SpeakerTurn[],
): { segments: RawSegment[]; speakerCount: number } {
  const speakers = new Set(turns.map((t) => t.speaker));
  if (speakers.size < 2) {
    return { segments, speakerCount: speakers.size };
  }
  const merged = segments.map((seg) => {
    let best = "";
    let bestOverlap = 0;
    for (const turn of turns) {
      const overlap = Math.min(seg.end, turn.end) - Math.max(seg.start, turn.start);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = turn.speaker;
      }
    }
    return { ...seg, speaker: best };
  });
  const used = new Set(merged.map((s) => s.speaker).filter(Boolean));
  return { segments: merged, speakerCount: used.size };
}

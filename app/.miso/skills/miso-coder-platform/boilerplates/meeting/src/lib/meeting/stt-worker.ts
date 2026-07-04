// ────────────────────────────────────────────────
// STT Web Worker — Whisper 전사 + pyannote 화자 분리.
// 모델 가중치는 워커의 fetch 로 HuggingFace CDN 에서 직접 받는다
// (워커에는 플랫폼 fetch 인터셉터가 없어 CORS 로 직접 통신, Cache API 캐시).
// 메인스레드에서 transformers.js 를 import 하지 말 것 — 반드시 이 워커 경유.
// ────────────────────────────────────────────────

import {
  AutoModelForAudioFrameClassification,
  AutoProcessor,
  env,
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
} from "@huggingface/transformers";

import {
  ASR_MODEL_ID_WASM,
  ASR_MODEL_ID_WEBGPU,
  DIARIZATION_MODEL_ID,
} from "@/lib/meeting-config";
import type { RawSegment, SpeakerTurn } from "./types";

env.allowLocalModels = false;

// ── 워커 메시지 프로토콜 ───────────────────────

interface TranscribeRequest {
  type: "transcribe";
  id: number;
  pcm: Float32Array;
  offsetSec: number;
  /** whisper 언어 코드, "auto" 는 자동 감지 */
  language: string;
}

interface DiarizeRequest {
  type: "diarize";
  id: number;
  pcm: Float32Array;
}

export type SttWorkerRequest = TranscribeRequest | DiarizeRequest;

export type SttWorkerResponse =
  | { type: "progress"; kind: "download" | "transcribe"; percent: number; detail: string }
  | { type: "device"; device: "webgpu" | "wasm" }
  | { type: "segments"; id: number; segments: RawSegment[] }
  | { type: "turns"; id: number; turns: SpeakerTurn[] }
  | { type: "error"; id: number; message: string };

const post = (message: SttWorkerResponse) =>
  (self as unknown as { postMessage(value: unknown): void }).postMessage(message);

// ── 모델 로딩 (레이지 싱글턴) ──────────────────

type ProgressItem = { status?: string; file?: string; progress?: number };

function downloadProgress(item: ProgressItem): void {
  if (item.status !== "progress" || !item.file) return;
  post({
    type: "progress",
    kind: "download",
    percent: Math.round(item.progress ?? -1),
    detail: item.file.split("/").pop() ?? item.file,
  });
}

async function detectDevice(): Promise<"webgpu" | "wasm"> {
  try {
    const gpu = (
      navigator as unknown as {
        gpu?: { requestAdapter(): Promise<{ isFallbackAdapter?: boolean } | null> };
      }
    ).gpu;
    const adapter = gpu ? await gpu.requestAdapter() : null;
    // 소프트웨어(fallback) 어댑터는 실 GPU 가 아니다 — wasm 이 더 안정적
    if (adapter && !adapter.isFallbackAdapter) return "webgpu";
  } catch {
    /* WebGPU 미지원 → wasm */
  }
  return "wasm";
}

let asrPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

/**
 * 디바이스×양자화 조합은 브라우저마다 세션 생성이 실패할 수 있다
 * (예: 소프트웨어 WebGPU 에서 q4 디코더의 MatMulNBits 스케일 오류).
 * 선호 순서대로 시도하고 처음 성공한 조합을 쓴다.
 */
async function loadAsrWithFallback(): Promise<AutomaticSpeechRecognitionPipeline> {
  const device = await detectDevice();
  const attempts: Array<{
    device: "webgpu" | "wasm";
    model: string;
    options: Record<string, unknown>;
  }> = [];
  if (device === "webgpu") {
    attempts.push({
      device: "webgpu",
      model: ASR_MODEL_ID_WEBGPU,
      options: {
        device: "webgpu",
        dtype: { encoder_model: "fp32", decoder_model_merged: "q4" },
        progress_callback: downloadProgress,
      },
    });
  }
  // wasm EP 는 graphOptimizationLevel 기본값(all)에서 whisper 디코더의
  // 양자화 embed_tokens 를 처리하는 qdq 패스(TransposeDQWeightsForMatMulNBits)가
  // 세션 생성에 실패한다 — "basic" 으로 낮추면 정상 (실측 확인).
  const wasmSession = { graphOptimizationLevel: "basic" };
  attempts.push(
    {
      device: "wasm",
      model: ASR_MODEL_ID_WASM,
      options: {
        dtype: { encoder_model: "q8", decoder_model_merged: "q8" },
        session_options: wasmSession,
        progress_callback: downloadProgress,
      },
    },
    {
      device: "wasm",
      model: ASR_MODEL_ID_WASM,
      options: {
        dtype: { encoder_model: "fp32", decoder_model_merged: "fp32" },
        session_options: wasmSession,
        progress_callback: downloadProgress,
      },
    },
  );

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      const asr = await pipeline("automatic-speech-recognition", attempt.model, attempt.options);
      post({ type: "device", device: attempt.device });
      return asr;
    } catch (error) {
      // 다음 조합으로 폴백 — 실패 조합은 진단을 위해 콘솔에 남긴다
      console.warn(
        `[stt] 로드 실패 model=${attempt.model} device=${attempt.device} dtype=${JSON.stringify(attempt.options.dtype)}, 폴백 진행:`,
        error,
      );
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function getAsr(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (!asrPromise) {
    asrPromise = loadAsrWithFallback().catch((error) => {
      asrPromise = null; // 실패는 캐시하지 않는다
      throw error;
    });
  }
  return asrPromise;
}

interface DiarizationModel {
  processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
  model: Awaited<ReturnType<typeof AutoModelForAudioFrameClassification.from_pretrained>>;
}

let diarizePromise: Promise<DiarizationModel> | null = null;

function getDiarization(): Promise<DiarizationModel> {
  if (!diarizePromise) {
    diarizePromise = (async () => {
      const [processor, model] = await Promise.all([
        AutoProcessor.from_pretrained(DIARIZATION_MODEL_ID, {
          progress_callback: downloadProgress,
        }),
        AutoModelForAudioFrameClassification.from_pretrained(DIARIZATION_MODEL_ID, {
          progress_callback: downloadProgress,
        }),
      ]);
      return { processor, model };
    })().catch((error) => {
      diarizePromise = null;
      throw error;
    });
  }
  return diarizePromise;
}

// ── 전사 ───────────────────────────────────────

const CHUNK_LENGTH_S = 30;
const STRIDE_LENGTH_S = 5;

interface WhisperChunk {
  timestamp: [number, number | null];
  text: string;
}

async function transcribe(req: TranscribeRequest): Promise<RawSegment[]> {
  const asr = await getAsr();
  const totalSec = req.pcm.length / 16_000;
  const totalChunks = Math.max(1, Math.ceil(totalSec / (CHUNK_LENGTH_S - STRIDE_LENGTH_S)));
  let doneChunks = 0;

  const output = (await asr(req.pcm, {
    language: req.language === "auto" ? undefined : req.language,
    task: "transcribe",
    chunk_length_s: CHUNK_LENGTH_S,
    stride_length_s: STRIDE_LENGTH_S,
    return_timestamps: true,
    // 긴 오디오 진행률 — 청크 단위 근사
    chunk_callback: () => {
      doneChunks += 1;
      post({
        type: "progress",
        kind: "transcribe",
        percent: Math.min(99, Math.round((doneChunks / totalChunks) * 100)),
        detail: "전사 중",
      });
    },
  })) as { text: string; chunks?: WhisperChunk[] };

  const chunks = output.chunks ?? [];
  const segments: RawSegment[] = [];
  for (const chunk of chunks) {
    const text = chunk.text.trim();
    if (!text) continue;
    const start = chunk.timestamp[0] ?? 0;
    // 마지막 청크의 end 는 null 일 수 있다 — 오디오 끝으로 보정
    const end = chunk.timestamp[1] ?? totalSec;
    segments.push({
      start: req.offsetSec + start,
      end: req.offsetSec + Math.max(end, start),
      text,
    });
  }
  // 타임스탬프 없이 전문만 온 경우(비정상) 단일 세그먼트로 보존
  if (segments.length === 0 && output.text.trim()) {
    segments.push({ start: req.offsetSec, end: req.offsetSec + totalSec, text: output.text.trim() });
  }
  return segments;
}

// ── 화자 분리 ──────────────────────────────────

interface DiarizationSegment {
  id: number;
  start: number;
  end: number;
  confidence: number;
}

async function diarize(req: DiarizeRequest): Promise<SpeakerTurn[]> {
  const { processor, model } = await getDiarization();
  const proc = processor as unknown as {
    (audio: Float32Array): Promise<Record<string, unknown>>;
    post_process_speaker_diarization(
      logits: unknown,
      numSamples: number,
    ): DiarizationSegment[][];
  };
  const inputs = await proc(req.pcm);
  const { logits } = (await (model as unknown as (i: Record<string, unknown>) => Promise<{ logits: unknown }>)(
    inputs,
  )) as { logits: unknown };
  const result = proc.post_process_speaker_diarization(logits, req.pcm.length);
  const turns: SpeakerTurn[] = [];
  for (const seg of result[0] ?? []) {
    // id < 0 또는 무음 클래스는 제외
    if (seg.id < 0 || seg.end <= seg.start) continue;
    turns.push({ start: seg.start, end: seg.end, speaker: `S${seg.id + 1}` });
  }
  return turns;
}

// ── 디스패치 ───────────────────────────────────

self.addEventListener("message", (event: MessageEvent<SttWorkerRequest>) => {
  const req = event.data;
  void (async () => {
    try {
      if (req.type === "transcribe") {
        post({ type: "segments", id: req.id, segments: await transcribe(req) });
      } else if (req.type === "diarize") {
        post({ type: "turns", id: req.id, turns: await diarize(req) });
      }
    } catch (error) {
      post({
        type: "error",
        id: req.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  })();
});

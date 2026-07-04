import {
  getMisoLLMConfig,
  invokeMisoLLM,
  streamMisoLLM,
  type DirectLlmMessage,
  type DirectLlmTargetModel,
} from "@/lib/miso-sdk/miso-llm";

import { OUTPUT_LANGUAGES } from "@/lib/meeting-config";
import { formatClock } from "./audio";
import type { ChatMessage, MinutesTemplate, TimeCitation } from "./types";

// ────────────────────────────────────────────────
// Direct LLM 오케스트레이션 — miso-sdk 공식 계약만 사용한다.
// 모든 생성은 "트랜스크립트 근거 + [mm:ss] 타임스탬프 인용" 원칙을 강제한다.
// ────────────────────────────────────────────────

/** 트랜스크립트 컨텍스트 예산(문자) */
const TRANSCRIPT_BUDGET = 30_000;
/** 첨부자료 컨텍스트 예산(문자) */
const ATTACHMENT_BUDGET = 12_000;

let cachedModel: Promise<DirectLlmTargetModel> | null = null;

/** 워크스페이스에 연결된 Direct LLM 모델 — 첫 selected model 사용, 캐시 */
export function resolveTargetModel(): Promise<DirectLlmTargetModel> {
  if (!cachedModel) {
    cachedModel = getMisoLLMConfig()
      .then((config) => {
        const model = config.selected_models[0];
        if (!model) {
          throw new Error("연결된 LLM 모델이 없습니다. MISO 앱 설정에서 모델을 연결해주세요.");
        }
        return {
          registeredProviderId: model.registered_provider_id,
          modelId: model.model_id,
        };
      })
      .catch((error) => {
        cachedModel = null; // 실패는 캐시하지 않는다
        throw error;
      });
  }
  return cachedModel;
}

// ── 컨텍스트 빌더 ──────────────────────────────

export function speakerLabel(key: string, names: Record<string, string>): string {
  if (!key) return "";
  return names[key] || `화자 ${key.replace(/^S/, "")}`;
}

/** 컨텍스트 빌더 입력 — PB Segment·RawSegment 둘 다 만족하는 최소 형태 */
export interface TranscriptLine {
  start: number;
  text: string;
  speaker?: string;
}

/**
 * 세그먼트를 "[mm:ss] 화자: 내용" 라인으로 엮는다.
 * 예산 초과 시 앞 70%·뒤 30% 를 남기고 중간을 생략한다 (회의 흐름 보존).
 */
export function buildTranscriptContext(
  segments: TranscriptLine[],
  speakerNames: Record<string, string>,
): string {
  const lines = segments.map((seg) => {
    const who = seg.speaker ? `${speakerLabel(seg.speaker, speakerNames)}: ` : "";
    return `[${formatClock(seg.start)}] ${who}${seg.text}`;
  });
  const full = lines.join("\n");
  if (full.length <= TRANSCRIPT_BUDGET) return full;

  const headBudget = Math.floor(TRANSCRIPT_BUDGET * 0.7);
  const tailBudget = TRANSCRIPT_BUDGET - headBudget;
  const head: string[] = [];
  let headLen = 0;
  for (const line of lines) {
    if (headLen + line.length + 1 > headBudget) break;
    head.push(line);
    headLen += line.length + 1;
  }
  const tail: string[] = [];
  let tailLen = 0;
  for (let i = lines.length - 1; i >= head.length; i--) {
    if (tailLen + lines[i].length + 1 > tailBudget) break;
    tail.unshift(lines[i]);
    tailLen += lines[i].length + 1;
  }
  return `${head.join("\n")}\n\n(…중간 ${lines.length - head.length - tail.length}개 발언 생략…)\n\n${tail.join("\n")}`;
}

export interface AttachmentContextInput {
  title: string;
  text: string;
}

/** 첨부자료를 "[자료 n] 제목" 블록으로 엮는다 */
export function buildAttachmentContext(attachments: AttachmentContextInput[]): string {
  const usable = attachments.filter((a) => a.text.trim());
  if (usable.length === 0) return "";
  const perDoc = Math.max(2_000, Math.floor(ATTACHMENT_BUDGET / usable.length));
  return usable
    .map((a, i) => {
      const body = a.text.length > perDoc ? `${a.text.slice(0, perDoc)}\n(…이하 생략)` : a.text;
      return `[자료 ${i + 1}] ${a.title}\n${body}`;
    })
    .join("\n\n----\n\n");
}

function outputLanguageName(code: string): string {
  return OUTPUT_LANGUAGES.find((l) => l.code === code)?.label ?? "한국어";
}

// ── 회의록 생성 ────────────────────────────────

export interface MinutesStreamHandlers {
  onChunk: (full: string) => void;
  onDone: (full: string) => void;
  onError: (error: Error) => void;
}

export interface MinutesStreamHandle {
  abort: () => void;
}

function minutesSystemPrompt(
  template: MinutesTemplate,
  transcriptCtx: string,
  attachmentCtx: string,
  outputLang: string,
): string {
  const sections = template.sections
    .map((s, i) => `${i + 1}. "## ${s.title}" — ${s.guidance}`)
    .join("\n");
  const attachmentBlock = attachmentCtx
    ? `\n──── 첨부 자료 (보조 근거) ────\n${attachmentCtx}\n`
    : "";
  return `당신은 전문 서기입니다. 아래 회의 트랜스크립트를 근거로 회의록을 작성합니다.

작성 규칙:
- ${outputLanguageName(outputLang)}(으)로 작성합니다.
- 아래 섹션 구조를 정확히 따르고, 각 섹션은 "## 섹션명" 헤딩으로 시작합니다. 다른 최상위 헤딩·서문·맺음말은 넣지 않습니다.
${sections}
- 트랜스크립트에 없는 내용은 지어내지 않습니다. 불확실하면 (확인 필요)로 표시합니다.
- 중요한 발언·결정의 근거 위치는 [mm:ss] 형식 타임스탬프로 인용합니다 (트랜스크립트 라인 앞의 시각을 그대로 사용).
- 간결하고 스캔하기 쉽게 — 목록과 굵게를 적극 활용합니다.

──── 트랜스크립트 ────
${transcriptCtx}
${attachmentBlock}`;
}

/** 템플릿 기반 회의록 생성 — 스트리밍 */
export async function generateMinutes(
  template: MinutesTemplate,
  transcriptCtx: string,
  attachmentCtx: string,
  outputLang: string,
  handlers: MinutesStreamHandlers,
): Promise<MinutesStreamHandle> {
  const targetModel = await resolveTargetModel();
  let full = "";
  const handle = streamMisoLLM(
    {
      targetModel,
      systemPrompt: minutesSystemPrompt(template, transcriptCtx, attachmentCtx, outputLang),
      messages: [{ role: "user", content: "회의록을 작성해주세요." }],
    },
    {
      onEvent: (event) => {
        if (event.event === "text_chunk" && event.answer) {
          full += event.answer;
          handlers.onChunk(full);
        } else if (event.event === "message_replace" && event.answer) {
          full = event.answer;
          handlers.onChunk(full);
        }
      },
      onError: handlers.onError,
      onDone: () => handlers.onDone(full),
    },
  );
  return { abort: handle.abort };
}

// ── AI 채팅 ────────────────────────────────────

function chatSystemPrompt(transcriptCtx: string, attachmentCtx: string): string {
  const attachmentBlock = attachmentCtx
    ? `\n──── 첨부 자료 ────\n${attachmentCtx}\n`
    : "";
  return `당신은 이 회의의 어시스턴트입니다. 아래 트랜스크립트와 첨부 자료만 근거로 답하세요.

규칙:
- 근거가 되는 발언 위치를 [mm:ss] 형식 타임스탬프로 인용합니다 (트랜스크립트 라인 앞의 시각 그대로). 여러 곳이면 [03:12][14:05] 처럼 나란히.
- 첨부 자료에서 근거를 가져오면 (자료: 제목) 으로 출처를 밝힙니다.
- 근거가 없으면 "회의록·자료에서 찾을 수 없다"고 명확히 말합니다. 일반 지식으로 보충할 때는 그 사실을 밝힙니다.
- 질문 언어로, 마크다운으로 간결하게 답합니다.

──── 트랜스크립트 ────
${transcriptCtx}
${attachmentBlock}`;
}

function toHistory(messages: ChatMessage[], limit = 12): DirectLlmMessage[] {
  return messages.slice(-limit).map((m) => ({ role: m.role, content: m.content }));
}

export interface ChatStreamHandlers {
  onChunk: (full: string) => void;
  onDone: (full: string, citations: TimeCitation[]) => void;
  onError: (error: Error) => void;
}

/** 회의 컨텍스트 기반 스트리밍 채팅 */
export async function askMeeting(
  question: string,
  history: ChatMessage[],
  transcriptCtx: string,
  attachmentCtx: string,
  durationSec: number,
  handlers: ChatStreamHandlers,
): Promise<MinutesStreamHandle> {
  const targetModel = await resolveTargetModel();
  let full = "";
  const handle = streamMisoLLM(
    {
      targetModel,
      systemPrompt: chatSystemPrompt(transcriptCtx, attachmentCtx),
      messages: [...toHistory(history), { role: "user", content: question }],
    },
    {
      onEvent: (event) => {
        if (event.event === "text_chunk" && event.answer) {
          full += event.answer;
          handlers.onChunk(full);
        } else if (event.event === "message_replace" && event.answer) {
          full = event.answer;
          handlers.onChunk(full);
        }
      },
      onError: handlers.onError,
      onDone: () => handlers.onDone(full, extractTimeCitations(full, durationSec)),
    },
  );
  return { abort: handle.abort };
}

// ── 타임스탬프 인용 ────────────────────────────

const CLOCK_RE = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;

export function parseClockLabel(label: string): number {
  const parts = label.split(":").map((p) => Number.parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return -1;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return -1;
}

/** 텍스트의 [mm:ss] 인용을 추출 — 재생 길이를 넘는 값은 버린다 */
export function extractTimeCitations(text: string, durationSec: number): TimeCitation[] {
  const seen = new Set<string>();
  const citations: TimeCitation[] = [];
  for (const match of text.matchAll(CLOCK_RE)) {
    const label = match[3] !== undefined
      ? `${match[1]}:${match[2]}:${match[3]}`
      : `${match[1]}:${match[2]}`;
    if (seen.has(label)) continue;
    const sec = parseClockLabel(label);
    if (sec < 0 || (durationSec > 0 && sec > durationSec + 5)) continue;
    seen.add(label);
    citations.push({ label, sec });
  }
  return citations;
}

// ── 제목 자동 생성 ─────────────────────────────

export async function generateMeetingTitle(transcriptHead: string): Promise<string> {
  try {
    const targetModel = await resolveTargetModel();
    const response = await invokeMisoLLM({
      targetModel,
      systemPrompt:
        "회의 트랜스크립트 도입부를 보고 16자 이내 한국어 명사구 회의 제목을 만들어 제목만 출력하세요.",
      messages: [{ role: "user", content: transcriptHead.slice(0, 2_000) }],
    });
    const title = response.answer.trim().replace(/^["'#\s]+|["'\s]+$/g, "");
    return title.slice(0, 40);
  } catch {
    return "";
  }
}

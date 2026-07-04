import {
  getMisoLLMConfig,
  invokeMisoLLM,
  streamMisoLLM,
  type DirectLlmMessage,
  type DirectLlmTargetModel,
} from "@/lib/miso-sdk/miso-llm";

import { getSourceText } from "./db";
import type {
  ChatMessage,
  CitationRef,
  Flashcard,
  MindMapNode,
  PodcastLine,
  QuizItem,
  Source,
  SourceBrief,
} from "./types";

// ────────────────────────────────────────────────
// Direct LLM 오케스트레이션 — MISO 코더 공식 계약(miso-sdk)만 사용한다.
// 모든 프롬프트는 "소스 근거 + [n] 인용" 원칙을 강제한다.
// ────────────────────────────────────────────────

/** 채팅 컨텍스트 총 예산(문자) */
const MAX_CONTEXT_CHARS = 36_000;
/** 소스당 최소/최대 예산 */
const PER_SOURCE_MIN = 4_000;
const PER_SOURCE_MAX = 16_000;
/** 브리프·변환 입력 상한 */
const BRIEF_INPUT_CHARS = 12_000;

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

export interface NotebookContext {
  text: string;
  index: CitationRef[];
  /** 컨텍스트에 전문 대신 요약이 쓰인 소스 수 */
  summarized: number;
}

/**
 * 활성 소스(context_mode != off)를 [n] 번호로 엮어 컨텍스트를 만든다.
 * 예산 초과분은 잘라내고, summary 모드 소스는 요약을 쓴다.
 */
export async function buildNotebookContext(sources: Source[]): Promise<NotebookContext> {
  const active = sources.filter((s) => s.status === "ready" && s.context_mode !== "off");
  if (active.length === 0) return { text: "", index: [], summarized: 0 };

  const perSource = Math.min(
    PER_SOURCE_MAX,
    Math.max(PER_SOURCE_MIN, Math.floor(MAX_CONTEXT_CHARS / active.length)),
  );

  const parts: string[] = [];
  const index: CitationRef[] = [];
  let summarized = 0;

  for (let i = 0; i < active.length; i++) {
    const source = active[i];
    const n = i + 1;
    index.push({ n, source_id: source.id, title: source.title });

    let body: string;
    if (source.context_mode === "summary") {
      body = source.summary || source.excerpt;
      summarized++;
    } else {
      const full = await getSourceText(source.id);
      if (full.length > perSource) {
        body = `${full.slice(0, perSource)}\n(…이하 생략)`;
      } else {
        body = full;
      }
    }
    parts.push(`[${n}] ${source.title}\n${body}`);
  }

  return { text: parts.join("\n\n----\n\n"), index, summarized };
}

// ── 채팅 ───────────────────────────────────────

function chatSystemPrompt(contextText: string): string {
  return `당신은 사용자의 리서치 어시스턴트입니다. 아래 소스만 근거로 답하세요.

규칙:
- 근거가 되는 주장·수치·사실 뒤에 반드시 해당 소스 번호를 [1], [2] 형식으로 인용합니다. 여러 소스면 [1][3] 처럼 나란히 씁니다.
- 소스에 없는 내용은 지어내지 말고 "소스에서 찾을 수 없다"고 명확히 말합니다. 일반 상식으로 보충할 때는 소스 근거가 아님을 밝힙니다.
- 한국어로, 마크다운으로 간결하고 구조적으로 답합니다. 목록·굵게를 적극 활용하되 불필요한 서론은 생략합니다.

──── 소스 ────
${contextText}`;
}

function toHistory(messages: ChatMessage[], limit = 12): DirectLlmMessage[] {
  return messages.slice(-limit).map((m) => ({ role: m.role, content: m.content }));
}

export interface ChatStreamHandlers {
  onChunk: (delta: string, full: string) => void;
  onDone: (full: string, citations: CitationRef[]) => void;
  onError: (error: Error) => void;
}

export interface ChatStreamHandle {
  abort: () => void;
}

/** 노트북 컨텍스트 기반 스트리밍 채팅 */
export async function askNotebook(
  question: string,
  history: ChatMessage[],
  context: NotebookContext,
  handlers: ChatStreamHandlers,
): Promise<ChatStreamHandle> {
  const targetModel = await resolveTargetModel();
  let full = "";

  const handle = streamMisoLLM(
    {
      targetModel,
      systemPrompt: chatSystemPrompt(context.text),
      messages: [...toHistory(history), { role: "user", content: question }],
    },
    {
      onEvent: (event) => {
        if (event.event === "text_chunk" && event.answer) {
          full += event.answer;
          handlers.onChunk(event.answer, full);
        } else if (event.event === "message_replace" && event.answer) {
          full = event.answer;
          handlers.onChunk("", full);
        }
      },
      onError: handlers.onError,
      onDone: () => handlers.onDone(full, extractCitations(full, context.index)),
    },
  );

  return { abort: handle.abort };
}

/** 응답 텍스트에서 [n] 인용을 추출해 소스에 매핑 */
export function extractCitations(answer: string, index: CitationRef[]): CitationRef[] {
  const seen = new Set<number>();
  const result: CitationRef[] = [];
  for (const match of answer.matchAll(/\[(\d{1,2})\]/g)) {
    const n = Number(match[1]);
    if (seen.has(n)) continue;
    const ref = index.find((r) => r.n === n);
    if (ref) {
      seen.add(n);
      result.push(ref);
    }
  }
  return result;
}

// ── JSON 유틸 ──────────────────────────────────

function parseJsonLoose<T>(raw: string): T {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = Math.min(
    ...[text.indexOf("{"), text.indexOf("[")].filter((i) => i >= 0),
  );
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (Number.isFinite(start) && end > start) text = text.slice(start, end + 1);
  return JSON.parse(text) as T;
}

async function invokeJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const targetModel = await resolveTargetModel();
  const response = await invokeMisoLLM({
    targetModel,
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  return parseJsonLoose<T>(response.answer);
}

// ── 소스 브리프 ────────────────────────────────

export async function generateSourceBrief(title: string, text: string): Promise<SourceBrief> {
  const brief = await invokeJson<{ summary?: string; topics?: string[]; questions?: string[] }>(
    "당신은 문서 분석가입니다. JSON만 출력합니다. 설명·코드펜스 금지.",
    `다음 문서를 분석해 JSON으로 답하세요.
형식: {"summary": "3~4문장 핵심 요약", "topics": ["핵심 토픽 3~5개"], "questions": ["이 문서에 대해 물어볼 만한 좋은 질문 3개"]}
모두 한국어.

문서 제목: ${title}
문서 내용:
${text.slice(0, BRIEF_INPUT_CHARS)}`,
  );
  return {
    summary: brief.summary?.trim() ?? "",
    topics: (brief.topics ?? []).filter(Boolean).slice(0, 5),
    questions: (brief.questions ?? []).filter(Boolean).slice(0, 3),
  };
}

/** 노트북 전체 컨텍스트 기반 추천 질문 — 채팅 빈 상태 */
export async function suggestQuestions(context: NotebookContext): Promise<string[]> {
  if (!context.text) return [];
  const result = await invokeJson<string[]>(
    "당신은 리서치 코치입니다. JSON 배열만 출력합니다.",
    `아래 소스들을 바탕으로, 사용자가 물어보면 통찰을 얻을 수 있는 서로 다른 각도의 질문 4개를 한국어 JSON 배열로 만드세요.
질문은 짧고 구체적으로 (25자 내외).

${context.text.slice(0, BRIEF_INPUT_CHARS)}`,
  );
  return result.filter((q) => typeof q === "string").slice(0, 4);
}

// ── 변환 (스튜디오) ────────────────────────────

/** 프리셋/커스텀 변환 실행 — 결과는 마크다운 (노트로 저장) */
export async function runTransform(
  instruction: string,
  context: NotebookContext,
): Promise<{ content: string; citations: CitationRef[] }> {
  const targetModel = await resolveTargetModel();
  const response = await invokeMisoLLM({
    targetModel,
    systemPrompt: chatSystemPrompt(context.text),
    messages: [{ role: "user", content: instruction }],
  });
  return {
    content: response.answer,
    citations: extractCitations(response.answer, context.index),
  };
}

// ── 오디오 오버뷰 (팟캐스트) ───────────────────

export async function generatePodcastScript(context: NotebookContext): Promise<PodcastLine[]> {
  const lines = await invokeJson<Array<{ speaker?: string; text?: string }>>(
    "당신은 팟캐스트 작가입니다. JSON 배열만 출력합니다.",
    `아래 소스를 바탕으로 두 진행자가 나누는 한국어 팟캐스트 대본을 만드세요.
- A: 진행자 — 호기심 많고 청취자 눈높이 질문을 던짐
- B: 전문가 — 소스 내용을 쉽고 정확하게 풀어줌
- 14~18턴, 한 턴은 1~3문장. 도입(주제 소개)→ 핵심 내용 3가지 → 시사점 → 마무리 인사 흐름.
- 형식: [{"speaker":"A","text":"..."}, {"speaker":"B","text":"..."}]

──── 소스 ────
${context.text.slice(0, 20_000)}`,
  );
  const script = lines
    .filter((l) => (l.speaker === "A" || l.speaker === "B") && l.text?.trim())
    .map((l) => ({ speaker: l.speaker as "A" | "B", text: l.text!.trim() }));
  if (script.length < 4) throw new Error("대본 생성에 실패했습니다. 다시 시도해주세요.");
  return script;
}

/** 오디오 오버뷰 재생 중 끼어들기 질문 — 진행자 톤의 짧은 답변 대본 */
export async function askPodcastQuestion(
  script: PodcastLine[],
  question: string,
  context: NotebookContext,
): Promise<PodcastLine[]> {
  const lines = await invokeJson<Array<{ speaker?: string; text?: string }>>(
    "당신은 진행 중인 팟캐스트의 두 진행자입니다. JSON 배열만 출력합니다.",
    `청취자가 방송 중에 질문했습니다. 지금까지의 대본 맥락과 소스를 근거로,
진행자 A가 질문을 받아주고 B가 답하는 2~4턴의 짧은 대본을 만드세요.
형식: [{"speaker":"A","text":"..."}]

청취자 질문: ${question}

지금까지의 대본(요약):
${script.slice(-6).map((l) => `${l.speaker}: ${l.text}`).join("\n")}

──── 소스 ────
${context.text.slice(0, 10_000)}`,
  );
  return lines
    .filter((l) => (l.speaker === "A" || l.speaker === "B") && l.text?.trim())
    .map((l) => ({ speaker: l.speaker as "A" | "B", text: l.text!.trim() }));
}

// ── Studio 생성기 ──────────────────────────────

export async function generateMindMap(context: NotebookContext): Promise<MindMapNode> {
  const result = await invokeJson<{ root?: MindMapNode } | MindMapNode>(
    "당신은 지식 구조화 전문가입니다. JSON만 출력합니다.",
    `아래 소스 전체를 마인드맵으로 구조화하세요.
- 루트 1개(전체 주제) → 주 가지 4~6개 → 각 가지당 하위 노드 2~4개 (최대 깊이 3)
- 노드 label은 한국어 명사구, 14자 이내
- 형식: {"root": {"label": "...", "children": [{"label": "...", "children": [...]}]}}

──── 소스 ────
${context.text.slice(0, 20_000)}`,
  );
  const root = "root" in result && result.root ? result.root : (result as MindMapNode);
  if (!root?.label) throw new Error("마인드맵 생성에 실패했습니다. 다시 시도해주세요.");
  return root;
}

export async function generateFlashcards(context: NotebookContext): Promise<Flashcard[]> {
  const cards = await invokeJson<Array<{ front?: string; back?: string }>>(
    "당신은 학습 카드 제작자입니다. JSON 배열만 출력합니다.",
    `아래 소스의 핵심 개념·용어·사실로 플래시카드 10~14장을 만드세요.
- front: 질문 또는 용어 (짧게), back: 답 1~2문장
- 형식: [{"front":"...","back":"..."}]
- 모두 한국어, 소스에 근거한 내용만.

──── 소스 ────
${context.text.slice(0, 20_000)}`,
  );
  const result = cards
    .filter((c) => c.front?.trim() && c.back?.trim())
    .map((c) => ({ front: c.front!.trim(), back: c.back!.trim() }));
  if (result.length < 4) throw new Error("플래시카드 생성에 실패했습니다. 다시 시도해주세요.");
  return result;
}

export async function generateQuiz(context: NotebookContext): Promise<QuizItem[]> {
  const items = await invokeJson<
    Array<{ question?: string; options?: string[]; answer?: number; explanation?: string }>
  >(
    "당신은 평가 문항 출제자입니다. JSON 배열만 출력합니다.",
    `아래 소스를 근거로 4지선다 퀴즈 6~8문항을 만드세요.
- 이해도를 검증하는 좋은 오답(그럴듯하지만 틀린 선택지) 포함
- answer 는 정답 인덱스(0~3), explanation 은 근거 설명 1~2문장(소스 번호 [n] 인용 포함)
- 형식: [{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]

──── 소스 ────
${context.text.slice(0, 20_000)}`,
  );
  const result = items
    .filter(
      (q) =>
        q.question?.trim() &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.answer === "number" &&
        q.answer >= 0 &&
        q.answer < 4,
    )
    .map((q) => ({
      question: q.question!.trim(),
      options: q.options!.map((o) => String(o)),
      answer: q.answer!,
      explanation: q.explanation?.trim() ?? "",
    }));
  if (result.length < 3) throw new Error("퀴즈 생성에 실패했습니다. 다시 시도해주세요.");
  return result;
}

export async function generateDataTable(
  context: NotebookContext,
): Promise<{ title: string; columns: string[]; rows: string[][] }> {
  const table = await invokeJson<{ title?: string; columns?: string[]; rows?: string[][] }>(
    "당신은 데이터 분석가입니다. JSON만 출력합니다.",
    `아래 소스에서 구조화할 가치가 가장 큰 정보를 골라 비교/정리 표를 만드세요.
- 열 3~6개, 행 4~12개. 셀은 간결한 한국어(수치는 단위 포함).
- 형식: {"title":"표 제목","columns":["..."],"rows":[["..."]]}

──── 소스 ────
${context.text.slice(0, 20_000)}`,
  );
  const columns = (table.columns ?? []).map(String);
  const rows = (table.rows ?? []).map((r) => r.map(String));
  if (columns.length < 2 || rows.length < 2) {
    throw new Error("표 생성에 실패했습니다. 다시 시도해주세요.");
  }
  return { title: table.title?.trim() || "데이터 테이블", columns, rows };
}

/** 채팅 세션 제목 자동 생성 */
export async function generateSessionTitle(firstQuestion: string): Promise<string> {
  try {
    const targetModel = await resolveTargetModel();
    const response = await invokeMisoLLM({
      targetModel,
      systemPrompt: "질문을 12자 이내 한국어 명사구 제목으로 요약해 제목만 출력하세요.",
      messages: [{ role: "user", content: firstQuestion }],
    });
    const title = response.answer.trim().replace(/^["']|["']$/g, "");
    return title.slice(0, 20) || firstQuestion.slice(0, 20);
  } catch {
    return firstQuestion.slice(0, 20);
  }
}

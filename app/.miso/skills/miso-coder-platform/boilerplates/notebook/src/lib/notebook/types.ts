// ────────────────────────────────────────────────
// 노트북 도메인 타입 — PocketBase 컬렉션 스키마와 1:1.
// 필드명은 PB 레코드 필드와 동일(snake_case)하게 유지한다.
// ────────────────────────────────────────────────

export type SourceType = "pdf" | "url" | "text" | "markdown" | "docx";
export type SourceStatus = "processing" | "ready" | "failed";
/** 채팅 컨텍스트에 소스를 어떻게 넣을지 — NotebookLM의 소스 체크박스 대응 */
export type ContextMode = "full" | "summary" | "off";

export interface Notebook {
  id: string;
  name: string;
  description: string;
  /** 카드 커버 색 키 — notebook-config.ts NOTEBOOK_COLORS 참조 */
  color: string;
  archived: boolean;
  created: string;
  updated: string;
}

export interface Source {
  id: string;
  notebook: string;
  title: string;
  type: SourceType;
  /** type=url 일 때 원본 주소 */
  url: string;
  status: SourceStatus;
  /** LLM 생성 요약 (context_mode=summary 에서 컨텍스트로 사용) */
  summary: string;
  /** LLM 추출 핵심 토픽 */
  topics: string[];
  /** LLM 생성 추천 질문 — 소스 뷰어·채팅 빈 상태에서 사용 */
  questions: string[];
  /** 목록 미리보기용 첫 부분 발췌 */
  excerpt: string;
  char_count: number;
  context_mode: ContextMode;
  /** status=failed 일 때 사유 */
  error: string;
  created: string;
  updated: string;
}

export interface SourceChunk {
  id: string;
  source: string;
  notebook: string;
  idx: number;
  text: string;
}

export interface ChatSession {
  id: string;
  notebook: string;
  title: string;
  created: string;
  updated: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  session: string;
  notebook: string;
  role: ChatRole;
  content: string;
  /** 응답에 등장한 인용 번호(컨텍스트 인덱스) → 소스 id 매핑 */
  citations: CitationRef[];
  created: string;
}

export interface CitationRef {
  n: number;
  source_id: string;
  title: string;
}

export type NoteKind = "manual" | "ai";

export interface Note {
  id: string;
  notebook: string;
  title: string;
  content: string;
  kind: NoteKind;
  /** AI 노트의 출처 라벨 — "채팅 저장", "요약", "학습 가이드" 등 */
  origin: string;
  created: string;
  updated: string;
}

/** 소스 인제스트 입력 — 추가 다이얼로그에서 생성 */
export type SourceInput =
  | { kind: "file"; file: File }
  | { kind: "url"; url: string }
  | { kind: "text"; title: string; text: string };

/** LLM이 소스마다 생성하는 브리프 */
export interface SourceBrief {
  summary: string;
  topics: string[];
  questions: string[];
}

/** 팟캐스트(오디오 오버뷰) 대본 한 줄 */
export interface PodcastLine {
  speaker: "A" | "B";
  text: string;
}

// ── Studio 아티팩트 ─────────────────────────────

export type ArtifactType = "audio" | "mindmap" | "flashcards" | "quiz" | "table" | "report";

export interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizItem {
  question: string;
  options: string[];
  /** 정답 인덱스 (0-based) */
  answer: number;
  explanation: string;
}

export interface ArtifactPayloadMap {
  audio: { lines: PodcastLine[] };
  mindmap: { root: MindMapNode };
  flashcards: { cards: Flashcard[] };
  quiz: { items: QuizItem[] };
  table: { columns: string[]; rows: string[][] };
  report: { content: string; citations: CitationRef[] };
}

export interface Artifact<T extends ArtifactType = ArtifactType> {
  id: string;
  notebook: string;
  type: T;
  title: string;
  payload: ArtifactPayloadMap[T];
  created: string;
  updated: string;
}

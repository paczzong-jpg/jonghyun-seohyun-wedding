// ────────────────────────────────────────────────
// 도메인 타입 — PocketBase 컬렉션 필드와 1:1 로 맞춘다.
// ────────────────────────────────────────────────

/**
 * 회의 상태 흐름:
 * transcribing(전사·화자분석) → summarizing(회의록 작성) → ready.
 * 처리 도중 오류는 failed + error 메시지.
 */
export type MeetingStatus = "transcribing" | "summarizing" | "ready" | "failed";

export interface Meeting {
  id: string;
  title: string;
  status: MeetingStatus;
  /** PB file 필드 — 원본 오디오(webm/opus 또는 업로드 원본) */
  audio: string;
  /** 재생 길이(초) */
  duration: number;
  /** 전사 언어 코드 ("auto" 포함) */
  language: string;
  participants: string[];
  tags: string[];
  /** 회의록 마크다운 — 템플릿 섹션 구조(## 섹션) */
  minutes_md: string;
  /** 사용한 템플릿 레코드 id */
  template: string;
  /** 사용자가 직접 쓰는 노트 (AI 산출물과 시각적으로 분리) */
  my_notes: string;
  /** 화자 rename 매핑 — {"S1": "김철수"} */
  speaker_names: Record<string, string>;
  /** 회의 소스 종류 — 녹음/업로드 */
  origin: "record" | "upload";
  /** 대시보드 카드 커버색 */
  color: string;
  error: string;
  created: string;
  updated: string;
}

export interface Segment {
  id: string;
  meeting: string;
  idx: number;
  /** 초 단위 시작/끝 */
  start: number;
  end: number;
  text: string;
  /** 화자 키 ("S1", "S2"…) — 화자 분리 불가 시 빈 문자열 */
  speaker: string;
  created: string;
}

export interface TemplateSection {
  title: string;
  guidance: string;
}

export interface MinutesTemplate {
  id: string;
  name: string;
  description: string;
  sections: TemplateSection[];
  builtin: boolean;
  created: string;
  updated: string;
}

export type AttachmentStatus = "processing" | "ready" | "failed";

export interface Attachment {
  id: string;
  meeting: string;
  title: string;
  /** PB file 필드 — 원본 파일 (재다운로드용) */
  file: string;
  status: AttachmentStatus;
  char_count: number;
  error: string;
  created: string;
}

export interface AttachmentChunk {
  id: string;
  attachment: string;
  meeting: string;
  idx: number;
  text: string;
}

/** 타임스탬프 인용 — 채팅·회의록의 [mm:ss] 칩 */
export interface TimeCitation {
  /** 원문 라벨 ("12:34" | "1:02:03") */
  label: string;
  /** 초 */
  sec: number;
}

export interface ChatMessage {
  id: string;
  meeting: string;
  role: "user" | "assistant";
  content: string;
  citations: TimeCitation[];
  created: string;
}

export interface Share {
  id: string;
  meeting: string;
  token: string;
  created: string;
}

// ── STT 파이프라인 (워커 ↔ 클라이언트) ─────────

/** 전사 결과 세그먼트 (저장 전 — PB 레코드 아님) */
export interface RawSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

/** 화자 분리 턴 */
export interface SpeakerTurn {
  start: number;
  end: number;
  /** 화자 키 "S1"… */
  speaker: string;
}

/** 모델 다운로드/처리 진행 상태 */
export interface SttProgress {
  /** "download" = 모델 파일 다운로드, "transcribe" = 오디오 처리 */
  kind: "download" | "transcribe";
  /** 0~100 (알 수 없으면 -1) */
  percent: number;
  detail: string;
}

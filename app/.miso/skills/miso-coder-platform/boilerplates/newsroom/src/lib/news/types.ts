// ────────────────────────────────────────────────
// newsroom 도메인 타입 — PB 컬렉션(nw_*) 필드와 1:1
// ────────────────────────────────────────────────

/** 키워드 구독 */
export interface Topic {
  id: string;
  name: string;
  /** 검색 질의(Google News RSS q=) 3~5개 */
  queries: string[];
  /** 연관 키워드 (추가 구독 제안 칩) */
  related: string[];
  /** 동음이의 제외어 (q에 -단어 로 부착) */
  exclude: string[];
  color: string;
  active: boolean;
  created: string;
  updated: string;
}

export type MediaType = "종합지" | "경제지" | "IT전문지" | "방송" | "글로벌" | "커뮤니티";

/** RSS 소스 */
export interface Source {
  id: string;
  name: string;
  url: string;
  site_url: string;
  category: string;
  media_type: MediaType | string;
  active: boolean;
  last_fetched: string;
  /** ok | error | empty */
  last_status: string;
  last_error: string;
  created: string;
  updated: string;
}

export type ArticleOrigin = "feed" | "gnews";
export type AiStatus = "" | "pending" | "ready" | "failed";
export type ReaderStatus = "" | "full" | "partial" | "feed-only" | "blocked" | "unavailable";

/** 수집된 기사 */
export interface Article {
  id: string;
  /** canonical dedup 키 (URL 정규화 해시 또는 guid) */
  key: string;
  url: string;
  origin: ArticleOrigin;
  title: string;
  source: string;
  source_name: string;
  media_type: string;
  topic_ids: string[];
  author: string;
  published: string;
  /** 피드 description (텍스트화) */
  desc_src: string;
  /** 피드 content:encoded (정제된 HTML) */
  content_src: string;
  image_url: string;
  // ── AI 산출물 (요약 배치) ──
  one_liner: string;
  summary: string;
  key_points: string[];
  entities: string[];
  /** 본문에서 그대로 복사된 인용문 (원문 includes 검증 통과분만) */
  quote: string;
  ai_status: AiStatus;
  // ── 리더 모드 ──
  reader_status: ReaderStatus;
  reader_html: string;
  reader_text: string;
  /** 요약 스타일 토글 캐시 { easy?: string; facts?: string; oneline?: string } */
  summary_variants: Record<string, string>;
  /** 소속 클러스터 ckey */
  cluster: string;
  bookmarked: boolean;
  created: string;
  updated: string;
}

/** Kite식 구조화 스토리 브리핑 (nw_clusters.brief) */
export interface StoryBrief {
  headline: string;
  short_summary: string;
  talking_points: string[];
  quote?: { text: string; attribution: string; article: number };
  timeline?: Array<{ date: string; content: string }>;
  perspectives?: Array<{ stakeholder: string; stance: string }>;
  did_you_know?: string;
  future_outlook?: string;
  suggested_qna: string[];
}

/** 이슈 클러스터 */
export interface Cluster {
  id: string;
  ckey: string;
  label: string;
  /** YYYY-MM-DD (KST) */
  day: string;
  category: string;
  /** 대표 기사 record id */
  rep: string;
  article_ids: string[];
  size: number;
  brief: StoryBrief | null;
  brief_status: AiStatus;
  created: string;
  updated: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created: string;
  updated: string;
}

/** [n] 인용 → 기사 매핑 */
export interface CitationRef {
  n: number;
  article_id: string;
  title: string;
  source_name: string;
  published: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  session: string;
  role: "user" | "assistant";
  content: string;
  citations: CitationRef[];
  created: string;
  updated: string;
}

/** 이메일 브리핑 구조 (LLM JSON — HTML은 결정적 렌더러가 조립) */
export interface EmailBrief {
  subject: string;
  preheader: string;
  intro: string;
  top_stories: Array<{
    headline: string;
    what: string;
    why_it_matters: string;
    bullets: string[];
    citations: number[];
  }>;
  shorts: Array<{ line: string; citations: number[] }>;
  closing: string;
}

export interface AudioScript {
  lines: Array<{ text: string; citations: number[] }>;
}

export interface Briefing {
  id: string;
  day: string;
  kind: "daily" | "email";
  title: string;
  content_md: string;
  citations: CitationRef[];
  email: EmailBrief | null;
  audio: AudioScript | null;
  params: Record<string, unknown>;
  created: string;
  updated: string;
}

export type Tone = "newsletter" | "press";

export interface Settings {
  id: string;
  tone: Tone;
  audience: string;
  mute: string[];
  created: string;
  updated: string;
}

// ────────────────────────────────────────────────
// 수집 파이프라인 타입
// ────────────────────────────────────────────────

/** 피드에서 파싱된 원시 아이템 (정규화 전) */
export interface FeedItem {
  title: string;
  link: string;
  guid: string;
  guidIsPermalink: boolean;
  published: Date | null;
  author: string;
  description: string;
  contentHtml: string;
  imageUrl: string;
  /** Google News <source> 텍스트 (매체명) */
  gnSource: string;
}

export interface ParsedFeed {
  title: string;
  siteUrl: string;
  items: FeedItem[];
}

export type CollectPhase =
  | "idle"
  | "fetching"
  | "summarizing"
  | "clustering"
  | "done"
  | "error";

export interface SourceProgress {
  /** source record id 또는 topic:{id}:{qIdx} */
  key: string;
  name: string;
  kind: "source" | "topic";
  status: "wait" | "run" | "ok" | "error" | "empty";
  fetched: number;
  added: number;
  error?: string;
}

export interface CollectProgress {
  phase: CollectPhase;
  startedAt: number;
  rows: SourceProgress[];
  totalAdded: number;
  summarized: number;
  summarizeTotal: number;
  clustersTouched: number;
  error?: string;
}

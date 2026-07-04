import {
  getMisoLLMConfig,
  invokeMisoLLM,
  streamMisoLLM,
  type DirectLlmMessage,
  type DirectLlmTargetModel,
} from "@/lib/miso-sdk/miso-llm";

import { TONES, DEFAULT_AUDIENCE } from "@/lib/news-config";
import type {
  Article,
  AudioScript,
  ChatMessage,
  CitationRef,
  Cluster,
  EmailBrief,
  StoryBrief,
  Tone,
} from "./types";

// ────────────────────────────────────────────────
// Direct LLM 오케스트레이션 — miso-sdk 공식 계약만 사용.
// 원칙(리서치 확정):
//  · 사람이 읽는 출력=markdown 스트리밍 / 기계가 읽는 출력=JSON(NDJSON)
//  · LLM에는 PB record id 대신 호출 스코프 정수 인덱스만 — [n] 인용과 일치
//  · 캐스케이드 압축: 요약 → 클러스터(제목+한줄) → 브리핑(산출물만)
//  · 수치·인용문은 원문 그대로, 계산 금지 · 모든 사실 문장에 [n]
// ────────────────────────────────────────────────

let cachedModel: Promise<DirectLlmTargetModel> | null = null;

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

// ── JSON 유틸 ───────────────────────────────────

function parseJsonLoose<T>(raw: string): T {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = Math.min(...[text.indexOf("{"), text.indexOf("[")].filter((i) => i >= 0));
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (Number.isFinite(start) && end > start) text = text.slice(start, end + 1);
  return JSON.parse(text) as T;
}

/** JSON 강제 호출 — 파싱 실패 시 에러를 붙여 1회 재시도 */
async function invokeJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const targetModel = await resolveTargetModel();
  const first = await invokeMisoLLM({
    targetModel,
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  try {
    return parseJsonLoose<T>(first.answer);
  } catch (err) {
    const retry = await invokeMisoLLM({
      targetModel,
      systemPrompt,
      messages: [
        { role: "user", content: userPrompt },
        { role: "assistant", content: first.answer },
        {
          role: "user",
          content: `이전 응답이 유효한 JSON이 아니었습니다 (${(err as Error).message}). 설명 없이 JSON만 다시 출력하세요.`,
        },
      ],
    });
    return parseJsonLoose<T>(retry.answer);
  }
}

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

// ── 공통 인용 규칙 (Perplexity 규율) ─────────────

const CITATION_RULES = `[인용 규칙 — 반드시 준수]
- 아래 "기사 자료"에 포함된 내용만 사실의 근거로 사용합니다. 사전 지식으로 사실·수치를 보충하지 않습니다.
- 사실을 서술하는 모든 문장 끝에 근거 기사 번호를 [n] 형식으로 붙입니다. 마지막 글자와 [n] 사이 공백 없음.
- 한 문장에 인용은 최대 3개, 각 번호는 개별 대괄호. 옳음: [1][3] / 틀림: [1, 3]
- 자료에 있는 번호만 사용합니다. 없는 번호를 만들지 않습니다.
- 답변 끝에 "참고 기사"·"출처" 목록을 만들지 않습니다. (UI가 자동 생성)
- 수치·날짜·고유명사·인용문은 기사 원문 표기 그대로. 단위 환산·반올림·합산 등 계산 금지.
- 기사들이 서로 모순되면 두 주장을 병기하고 각각 출처를 붙입니다.
- 근거가 자료에 없으면 "수집된 기사에서 찾지 못했습니다"라고 밝힙니다.
- "검색 결과에 따르면" 같은 서두를 쓰지 않습니다.`;

function toneRule(tone: Tone): string {
  return TONES[tone]?.instruction ?? TONES.newsletter.instruction;
}

function today(): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${now.toISOString().slice(0, 10)} (Asia/Seoul)`;
}

// ── 인용 컨텍스트 빌더 ──────────────────────────

export interface CitationIndex {
  refs: CitationRef[];
  block: string;
}

/** 기사 배열 → "[n] 제목|매체|발행 / 요약 / 본문(발췌)" 블록 + 역매핑 인덱스 */
export function buildCitationContext(articles: Article[], perBodyChars = 1500): CitationIndex {
  const refs: CitationRef[] = [];
  const parts: string[] = [];
  articles.forEach((a, i) => {
    const n = i + 1;
    refs.push({
      n,
      article_id: a.id,
      title: a.title,
      source_name: a.source_name,
      published: a.published,
      url: a.url,
    });
    const body = a.reader_text || a.content_src || a.desc_src || "";
    const lines = [
      `[${n}] 제목: ${a.title} | 매체: ${a.source_name || "미상"} | 발행: ${a.published?.slice(0, 16) || "미상"}`,
    ];
    if (a.summary) lines.push(`요약: ${a.summary}`);
    if (body) lines.push(`본문(발췌): ${cut(body, i < 2 ? Math.round(perBodyChars * 1.6) : perBodyChars)}`);
    else if (a.desc_src) lines.push(`설명: ${cut(a.desc_src, 400)}`);
    parts.push(lines.join("\n"));
  });
  return { refs, block: parts.join("\n---\n") };
}

/** 응답 속 [n] 마커 → 자료 범위 내 인용만 추출 */
export function extractCitations(content: string, refs: CitationRef[]): CitationRef[] {
  const seen = new Set<number>();
  for (const m of content.matchAll(/\[(\d{1,2})\]/g)) {
    seen.add(Number(m[1]));
  }
  return refs.filter((r) => seen.has(r.n));
}

// ── 1. 기사 요약 배치 (NDJSON) ───────────────────

export interface ArticleBriefResult {
  idx: number;
  one_liner: string;
  summary: string;
  key_points: string[];
  entities: string[];
  quote: string;
}

const SUMMARY_SYSTEM = `당신은 뉴스 데스크의 요약 에디터입니다. 기사들을 각각 요약합니다.

[출력 형식 — 반드시 준수]
- 기사당 정확히 한 줄의 JSON 객체(NDJSON). 마크다운 펜스·설명·빈 줄 금지. 각 줄의 첫 글자는 {
- 스키마: {"id": <입력 정수 id>, "one_liner": "<60자 이내 한 문장>", "summary": "<2~3문장, 300자 이내>", "key_points": ["<핵심 사실>", ...2~4개], "entities": ["<기업·인물·기관명>", ...최대 5개], "quote": "<본문에서 그대로 복사한 가장 중요한 문장, 없으면 빈 문자열>"}

[요약 규칙]
- 기사에 명시된 내용만. 수치·날짜는 원문 표기 그대로.
- 구체적 엔티티(기업·인물·수치) 중심의 밀도 높은 문장. "~에 대한 논의가 있었다" 같은 빈 문장 금지.
- quote는 본문에 실제로 존재하는 연속 문자열이어야 합니다.
- 광고·구독 안내·기자 소개·관련기사 목록 등 본문이 아닌 텍스트는 무시.
- 문체: 신문 기사체(…다/…했다).`;

/** 8~12건 배치 요약. 반환은 입력 순서와 무관한 idx 매핑 — quote 원문 검증 포함 */
export async function summarizeArticles(articles: Article[]): Promise<Map<string, ArticleBriefResult>> {
  const targetModel = await resolveTargetModel();
  const blocks = articles.map((a, i) => {
    const body = a.reader_text || a.content_src || a.desc_src || "";
    return `id=${i + 1} | 제목: ${a.title} | 매체: ${a.source_name || "미상"} | 발행: ${a.published?.slice(0, 16) || "미상"}\n본문: ${cut(body || "(본문 없음 — 제목만으로 최소한만 작성)", 1600)}`;
  });
  const response = await invokeMisoLLM({
    targetModel,
    systemPrompt: SUMMARY_SYSTEM,
    messages: [{ role: "user", content: `오늘 날짜: ${today()}\n\n[기사]\n${blocks.join("\n---\n")}` }],
  });

  const out = new Map<string, ArticleBriefResult>();
  for (const line of response.answer.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const row = JSON.parse(trimmed) as { id: number } & Omit<ArticleBriefResult, "idx">;
      const article = articles[row.id - 1];
      if (!article) continue;
      const bodyNorm = (article.reader_text || article.content_src || article.desc_src || "").replace(/\s+/g, " ");
      const quoteNorm = (row.quote || "").replace(/\s+/g, " ").trim();
      out.set(article.id, {
        idx: row.id,
        one_liner: row.one_liner || "",
        summary: row.summary || "",
        key_points: Array.isArray(row.key_points) ? row.key_points.slice(0, 4) : [],
        entities: Array.isArray(row.entities) ? row.entities.slice(0, 5) : [],
        // 인용문은 원문의 연속 부분 문자열일 때만 채택 (환각 인용 차단)
        quote: quoteNorm && bodyNorm.includes(quoteNorm) ? row.quote.trim() : "",
      });
    } catch {
      /* 깨진 줄은 건너뜀 — 누락분은 ai_status "" 로 남아 다음 배치에서 재시도 */
    }
  }
  return out;
}

// ── 2. 토픽 클러스터링 (전체/증분) ───────────────

interface ClusterFullResponse {
  clusters: Array<{ label: string; rep: number; ids: number[] }>;
}

const CLUSTER_CRITERIA = `[클러스터링 기준]
- 같은 클러스터 = 같은 구체적 사건·발표·보도. 넓은 주제(예: "반도체 산업 동향")로 묶지 않습니다.
- 판단 근거는 제목·요약·매체·발행시각. 발행시각이 72시간 이상 떨어지면 특별한 근거 없이 같은 사건이 아닙니다.
- 어느 클러스터에도 속하지 않는 기사는 단독(1건) 클러스터로 둡니다. 억지로 묶지 않습니다.`;

function articleLine(a: Article, n: number): string {
  const time = a.published ? a.published.slice(5, 16).replace("T", " ") : "??";
  return `${n} | ${time} | ${cut(a.source_name || "미상", 12)} | ${cut(a.title, 80)}${a.one_liner ? ` | ${cut(a.one_liner, 60)}` : ""}`;
}

/** 전체 클러스터링 — id 커버리지는 클라이언트가 검증(누락→단독, 중복→첫 등장) */
export async function clusterAll(
  articles: Article[],
): Promise<Array<{ label: string; repId: string; articleIds: string[] }>> {
  const result = await invokeJson<ClusterFullResponse>(
    `당신은 뉴스 편집자입니다. 기사 목록에서 같은 사건을 다루는 기사끼리 묶습니다.

${CLUSTER_CRITERIA}

[출력 — JSON 객체 하나만. 마크다운 펜스·설명 금지. 첫 글자는 {]
{"clusters": [{"label": "<20자 이내 사건 라벨(명사구, 매체명 금지)>", "rep": <대표 기사 id>, "ids": [<포함 기사 id 전부>]}]}
- 모든 입력 id는 정확히 하나의 클러스터에만 나타나야 합니다(누락·중복 금지).
- rep은 ids 중 가장 정보량이 많고 중립적인 기사.
- 출력 전에 모든 id가 정확히 한 번씩 포함됐는지 스스로 확인합니다.`,
    `[기사 목록 — id | 발행 | 매체 | 제목 | 한줄요약]\n${articles.map((a, i) => articleLine(a, i + 1)).join("\n")}`,
  );

  const assigned = new Set<number>();
  const clusters: Array<{ label: string; repId: string; articleIds: string[] }> = [];
  for (const c of result.clusters ?? []) {
    const ids = (c.ids ?? [])
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= articles.length && !assigned.has(n));
    if (ids.length === 0) continue;
    ids.forEach((n) => assigned.add(n));
    const rep = ids.includes(c.rep) ? c.rep : ids[0];
    clusters.push({
      label: cut(String(c.label ?? "").trim() || articles[rep - 1].title, 40),
      repId: articles[rep - 1].id,
      articleIds: ids.map((n) => articles[n - 1].id),
    });
  }
  // 누락 id → 단독 클러스터
  articles.forEach((a, i) => {
    if (!assigned.has(i + 1)) clusters.push({ label: cut(a.title, 40), repId: a.id, articleIds: [a.id] });
  });
  return clusters;
}

interface ClusterIncrementalResponse {
  assign: Array<{ id: number; cluster: string }>;
  new_clusters: Array<{ label: string; rep: number; ids: number[] }>;
}

/**
 * 증분 배정 — 기존 클러스터의 라벨·구성은 절대 변경하지 않는다 (UI 리셔플 방지).
 * 전체 재클러스터는 일자 롤오버·사용자 명시 요청 시에만.
 */
export async function clusterIncremental(
  existing: Cluster[],
  fresh: Article[],
  repTitles: Map<string, string[]>,
): Promise<{ assign: Map<string, string>; created: Array<{ label: string; repId: string; articleIds: string[] }> }> {
  const existingBlock = existing
    .map((c) => `${c.ckey} | ${c.label} | ${(repTitles.get(c.id) ?? []).slice(0, 2).map((t) => cut(t, 60)).join(" / ")}`)
    .join("\n");
  const result = await invokeJson<ClusterIncrementalResponse>(
    `기존 클러스터 목록과 새 기사 목록이 주어집니다. 새 기사를 기존 클러스터에 배정하거나, 맞는 클러스터가 없으면 새로 만듭니다.

[절대 규칙]
- 기존 클러스터의 라벨·구성(기존 기사)은 절대 변경하지 않습니다. 새 기사의 배정만 결정합니다.
- 같은 구체적 사건일 때만 기존 클러스터에 배정합니다. 애매하면 새 클러스터를 만듭니다.
${CLUSTER_CRITERIA}

[출력 — JSON 객체 하나만. 첫 글자는 {]
{"assign": [{"id": <기사 id>, "cluster": "<기존 cluster_id>"}], "new_clusters": [{"label": "<20자 이내>", "rep": <id>, "ids": [<id들>]}]}
- 모든 새 기사 id는 assign 또는 new_clusters 중 정확히 한 곳에 나타나야 합니다.`,
    `[기존 클러스터 — cluster_id | 라벨 | 대표 제목]\n${existingBlock || "(없음)"}\n\n[새 기사 — id | 발행 | 매체 | 제목 | 한줄요약]\n${fresh.map((a, i) => articleLine(a, i + 1)).join("\n")}`,
  );

  const validCkeys = new Set(existing.map((c) => c.ckey));
  const assigned = new Set<number>();
  const assign = new Map<string, string>();
  for (const row of result.assign ?? []) {
    if (!Number.isInteger(row.id) || row.id < 1 || row.id > fresh.length || assigned.has(row.id)) continue;
    if (!validCkeys.has(row.cluster)) continue;
    assigned.add(row.id);
    assign.set(fresh[row.id - 1].id, row.cluster);
  }
  const created: Array<{ label: string; repId: string; articleIds: string[] }> = [];
  for (const c of result.new_clusters ?? []) {
    const ids = (c.ids ?? []).filter((n) => Number.isInteger(n) && n >= 1 && n <= fresh.length && !assigned.has(n));
    if (ids.length === 0) continue;
    ids.forEach((n) => assigned.add(n));
    const rep = ids.includes(c.rep) ? c.rep : ids[0];
    created.push({
      label: cut(String(c.label ?? "").trim() || fresh[rep - 1].title, 40),
      repId: fresh[rep - 1].id,
      articleIds: ids.map((n) => fresh[n - 1].id),
    });
  }
  fresh.forEach((a, i) => {
    if (!assigned.has(i + 1)) created.push({ label: cut(a.title, 40), repId: a.id, articleIds: [a.id] });
  });
  return { assign, created };
}

// ── 3. Kite식 스토리 브리핑 ──────────────────────

const CATEGORY_LENS: Record<string, string> = {
  경제: `- "economic_lens": 시장·투자 관점의 시사점 1~2문장 (기사에 근거한 것만)`,
  "IT/테크": `- "tech_lens": 기술적 디테일과 업계 영향 1~2문장`,
  AI: `- "tech_lens": 기술적 디테일과 업계 영향 1~2문장`,
};

/** 클러스터 → 구조화 스토리 브리핑 (모든 문장 [n] 인용) */
export async function generateStoryBrief(
  cluster: { label: string; category: string },
  articles: Article[],
  tone: Tone,
): Promise<{ brief: StoryBrief; refs: CitationRef[] }> {
  const ctx = buildCitationContext(articles, 1200);
  const lens = CATEGORY_LENS[cluster.category] ?? "";
  const brief = await invokeJson<StoryBrief>(
    `당신은 이슈를 구조화해 브리핑하는 뉴스 에디터입니다. 아래 기사 자료만 근거로 JSON을 작성합니다.
오늘 날짜: ${today()}

[출력 — JSON 객체 하나만. 첫 글자는 {]
{
 "headline": "<클릭베이트 없는 사실 중심 헤드라인, 30자 이내>",
 "short_summary": "<이 사건의 핵심 3~4문장. 각 문장 끝 [n]>",
 "talking_points": ["<핵심 논점, 각 항목 끝 [n]>", ...3~5개],
 "quote": {"text": "<기사 속 실제 인용문(따옴표 발언) 원문 그대로>", "attribution": "<발언자>", "article": <기사 번호>} 또는 생략,
 "timeline": [{"date": "<M/D 또는 시기>", "content": "<전개 내용 [n]>"}] — 시간 전개가 있으면 2~5개, 없으면 생략,
 "perspectives": [{"stakeholder": "<이해관계자>", "stance": "<입장·주장 [n]>"}] — 입장 차이가 드러나면 2~3개, 없으면 생략,
 "did_you_know": "<맥락을 넓히는 흥미로운 사실 1문장 [n], 없으면 생략>",
 "future_outlook": "<기사에 언급된 향후 일정·전망 1~2문장 [n], 없으면 생략>",
 "suggested_qna": ["<이 이슈에 대해 물어볼 만한 좋은 질문>", ...3개]${lens ? `,\n ${lens}` : ""}
}

[규칙]
- ${toneRule(tone)}
- 기사에 없는 내용을 만들지 않습니다. 확인되지 않은 섹션은 생략합니다.
- quote.text는 기사 본문에 실제로 존재하는 연속 문자열이어야 합니다.
${CITATION_RULES}`,
    `[이슈] ${cluster.label}\n\n[기사 자료]\n${ctx.block}`,
  );

  // quote 원문 검증
  if (brief.quote?.text) {
    const target = articles[(brief.quote.article ?? 1) - 1];
    const bodyNorm = (target ? target.reader_text || target.content_src || target.desc_src : articles.map((a) => a.reader_text || a.content_src || a.desc_src).join(" ")).replace(/\s+/g, " ");
    const quoteNorm = brief.quote.text.replace(/\s+/g, " ").trim();
    if (!bodyNorm.includes(quoteNorm)) delete brief.quote;
  }
  brief.suggested_qna = Array.isArray(brief.suggested_qna) ? brief.suggested_qna.slice(0, 4) : [];
  return { brief, refs: ctx.refs };
}

// ── 4. 데일리 브리핑 (markdown 스트리밍) ─────────

export interface StreamHandlers {
  onChunk: (delta: string, full: string) => void;
  onDone: (full: string) => void;
  onError: (error: Error) => void;
}

export interface StreamHandle {
  abort: () => void;
}

function clustersBlock(clusters: Cluster[], articleMap: Map<string, Article>, refs: CitationRef[]): string {
  const idByArticle = new Map(refs.map((r) => [r.article_id, r.n]));
  return clusters
    .map((c) => {
      const members = c.article_ids
        .map((id) => articleMap.get(id))
        .filter((a): a is Article => Boolean(a))
        .slice(0, 5)
        .map((a) => `  [${idByArticle.get(a.id)}] ${cut(a.title, 70)}${a.one_liner ? ` — ${cut(a.one_liner, 60)}` : ""}`)
        .join("\n");
      return `클러스터: ${c.label} (기사 ${c.size}건)\n${members}`;
    })
    .join("\n\n");
}

/** 오늘 클러스터 산출물만 입력으로 브리핑 마크다운을 스트리밍 생성 */
export async function generateDailyBriefing(
  clusters: Cluster[],
  articles: Article[],
  options: { tone: Tone; audience: string; keywords: string[] },
  handlers: StreamHandlers,
): Promise<{ handle: StreamHandle; refs: CitationRef[] }> {
  const targetModel = await resolveTargetModel();
  const articleMap = new Map(articles.map((a) => [a.id, a]));
  const ctx = buildCitationContext(articles, 0); // 본문 없이 번호 인덱스만
  const block = clustersBlock(clusters, articleMap, ctx.refs);
  const keywords = options.keywords.length > 0 ? options.keywords.join(", ") : "전체 뉴스";

  let full = "";
  const handle = streamMisoLLM(
    {
      targetModel,
      systemPrompt: `당신은 ${options.audience || DEFAULT_AUDIENCE}를 위한 아침 뉴스 브리핑을 쓰는 베테랑 에디터입니다.
오늘 날짜: ${today()} / 구독 키워드: ${keywords}

[중요도 판단 — 이 순서대로]
1) 영향 범위(산업·시장 전체 > 개별 기업) 2) 새로움 3) 구독 키워드 직접성 4) 다룬 매체 수(기사 수가 많은 클러스터 = 큰 뉴스)

[구성 — markdown, 전체 1,200~2,000자]
> **한 줄 요약**: 오늘 가장 중요한 흐름 1문장[n]

## 톱 스토리
가장 중요한 클러스터 1개. "무슨 일이야?" 2~3문장[n] → "**왜 중요해:** " 1~2문장[n] → "**앞으로는:** " 1문장[n] (뉴닉 3단 문법)

## <테마 섹션 2~3개 — 섹션명은 개별 사건이 아니라 흐름>
클러스터당: **볼드 리드 문장**[n] 뒤 1~2문장 부연[n]

## 짧게 볼 뉴스
나머지 중 가치 있는 것 3~6개, "- " 한 줄씩[n]

## 내일 볼 것
예고된 일정·발표가 자료에 있을 때만. 없으면 이 섹션 생략.

[문체]
- ${toneRule(options.tone)}
- 사실과 해석을 구분합니다. 해석은 "~로 해석돼요/~라는 전망이 나와요"로 명시합니다. 자료에 없는 전망·투자 조언 금지.
${CITATION_RULES}`,
      messages: [{ role: "user", content: `[입력 자료 — 클러스터와 소속 기사]\n${block}` }],
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
      onDone: () => handlers.onDone(full),
    },
  );
  return { handle, refs: ctx.refs };
}

// ── 5. 이메일 브리핑 (JSON — HTML은 결정적 렌더러 담당) ──

export async function generateEmailBrief(
  clusters: Cluster[],
  articles: Article[],
  options: { tone: Tone; audience: string; keywords: string[]; appName: string },
): Promise<{ email: EmailBrief; refs: CitationRef[] }> {
  const articleMap = new Map(articles.map((a) => [a.id, a]));
  const ctx = buildCitationContext(articles, 0);
  const block = clustersBlock(clusters, articleMap, ctx.refs);
  const email = await invokeJson<EmailBrief>(
    `당신은 뉴스레터 에디터입니다. 클러스터 자료로 이메일 브리핑을 JSON으로 작성합니다.
오늘 날짜: ${today()} / 발신 뉴스레터: ${options.appName} / 구독 키워드: ${options.keywords.join(", ") || "전체"}

[출력 — JSON 객체 하나만. HTML 금지. 첫 글자는 {]
{
 "subject": "<[${options.appName}] M/D 브리핑 — 핵심 12자 이내>",
 "preheader": "<받은편지함 미리보기 문장, 40자 이내>",
 "intro": "<인사 없이 오늘의 요약 2~3문장>",
 "top_stories": [{"headline": "<헤드라인>", "what": "<무슨 일이야 2~3문장>", "why_it_matters": "<왜 중요해 1~2문장>", "bullets": ["<디테일>", ...0~3개], "citations": [<기사 번호>]}] — 2~3개,
 "shorts": [{"line": "<한 줄 뉴스>", "citations": [<기사 번호>]}] — 3~6개,
 "closing": "<한 줄 마무리>"
}

[규칙]
- ${toneRule(options.tone)}
- 문단은 3문장 이내(모바일 가독성). 수치·날짜는 원문 그대로. 계산 금지.
- citations의 번호는 자료의 [n] 번호만 사용합니다.`,
    `[입력 자료]\n${block}`,
  );
  email.top_stories = (email.top_stories ?? []).slice(0, 3);
  email.shorts = (email.shorts ?? []).slice(0, 6);
  return { email, refs: ctx.refs };
}

// ── 6. Grounded Q&A (스트리밍) ───────────────────

function toHistory(messages: ChatMessage[], limit = 6): DirectLlmMessage[] {
  return messages.slice(-limit).map((m) => ({ role: m.role, content: m.content }));
}

export async function askNews(
  question: string,
  contextArticles: Article[],
  history: ChatMessage[],
  options: { tone: Tone; keywords: string[] },
  handlers: StreamHandlers,
): Promise<{ handle: StreamHandle; refs: CitationRef[] }> {
  const targetModel = await resolveTargetModel();
  const ctx = buildCitationContext(contextArticles, 1500);
  let full = "";
  const handle = streamMisoLLM(
    {
      targetModel,
      systemPrompt: `당신은 수집된 뉴스 기사를 근거로 질문에 답하는 뉴스 리서치 어시스턴트입니다.
오늘 날짜: ${today()} / 사용자 구독 키워드: ${options.keywords.join(", ") || "없음"}

[기사 자료 — 번호가 인용 마커가 됩니다]
${ctx.block}

[답변 규칙]
- ${toneRule(options.tone)}
- 첫 1~2문장에서 질문에 대한 직접적인 결론을 먼저 말하고, 그 다음 근거를 설명합니다.
- 목록 비교가 유용하면 markdown 불릿, 3개 이상 항목 비교에만 표를 씁니다.
- 발행시각을 활용해 최신 상황과 과거 보도를 구분합니다("7월 3일 보도 기준").
- 자료 밖 일반 상식은 용어 설명에만 제한적으로 사용하고 사실 주장에는 쓰지 않습니다.
${CITATION_RULES}`,
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
      onDone: () => handlers.onDone(full),
    },
  );
  return { handle, refs: ctx.refs };
}

/** 채팅 세션 제목 (12자) */
export async function generateSessionTitle(firstQuestion: string): Promise<string> {
  try {
    const targetModel = await resolveTargetModel();
    const response = await invokeMisoLLM({
      targetModel,
      systemPrompt: "사용자 질문을 요약한 12자 이내 제목만 출력합니다. 따옴표·마침표 없이.",
      messages: [{ role: "user", content: firstQuestion }],
    });
    return cut(response.answer.trim().replace(/["'.?!]/g, ""), 16) || cut(firstQuestion, 16);
  } catch {
    return cut(firstQuestion, 16);
  }
}

// ── 7. 키워드 온보딩 (주제 → 질의 확장) ──────────

export interface TopicExpansion {
  canonical: string;
  queries: string[];
  related_keywords: string[];
  exclude_hints: string[];
}

export async function expandTopic(userTopic: string): Promise<TopicExpansion> {
  const result = await invokeJson<TopicExpansion>(
    `사용자가 입력한 뉴스 구독 주제를 한국 뉴스 검색에 적합한 형태로 확장합니다.
오늘 날짜: ${today()}

[출력 — JSON 객체 하나만. 첫 글자는 {]
{"canonical": "<정규화된 주제명>", "queries": ["<뉴스 검색 질의 3~4개>"], "related_keywords": ["<연관 구독 키워드 5~8개>"], "exclude_hints": ["<동음이의 노이즈 제외어 0~3개>"]}

[규칙]
- queries는 서로 다른 측면(산업 동향/주요 기업/정책·규제/기술)을 커버합니다. 각 질의는 조사 없는 명사 2~4어. "정확한 구문"과 OR 연산자 사용 가능.
- 실제 한국 언론 표기를 병기합니다(예: "2차전지" OR "이차전지").
- related_keywords는 하위 주제·대표 기업명·핵심 기술명·관련 정책명을 섞습니다.
- 존재가 불확실한 고유명사를 지어내지 않습니다.`,
    `[사용자 입력]\n${userTopic}`,
  );
  result.queries = (result.queries ?? []).slice(0, 4);
  if (result.queries.length === 0) result.queries = [userTopic];
  result.related_keywords = (result.related_keywords ?? []).slice(0, 8);
  result.exclude_hints = (result.exclude_hints ?? []).slice(0, 3);
  result.canonical = result.canonical || userTopic;
  return result;
}

// ── 8. 요약 스타일 토글 ─────────────────────────

const STYLE_PROMPTS: Record<string, string> = {
  easy: "중학생도 이해할 수 있게 쉬운 말로 3~4문장. 전문용어는 괄호로 풀이.",
  facts: "5W(누가/무엇을/언제/어디서/왜) 형식의 markdown 불릿 5개. 각 줄은 '- **누가**: ...' 형태. 기사에 없는 항목은 생략.",
  oneline: "가장 중요한 사실 하나만 담은 한 문장(60자 이내).",
};

export async function restyleSummary(article: Article, style: string): Promise<string> {
  const targetModel = await resolveTargetModel();
  const body = article.reader_text || article.content_src || article.desc_src || article.summary;
  const response = await invokeMisoLLM({
    targetModel,
    systemPrompt: `기사를 다음 형식으로 다시 요약합니다: ${STYLE_PROMPTS[style] ?? STYLE_PROMPTS.easy}
수치·고유명사는 원문 그대로. 기사에 없는 내용 금지. 형식 외 다른 텍스트 금지.`,
    messages: [{ role: "user", content: `제목: ${article.title}\n본문: ${cut(body, 4000)}` }],
  });
  return response.answer.trim();
}

// ── 9. 오디오 브리핑 대본 ────────────────────────

export async function generateAudioScript(briefingMd: string, appName: string): Promise<AudioScript> {
  const result = await invokeJson<{ lines: Array<{ text: string; citations?: number[] }> }>(
    `아침 뉴스 브리핑 문서를 라디오 앵커 낭독 대본으로 변환합니다.

[출력 — JSON 객체 하나만. 첫 글자는 {]
{"lines": [{"text": "<한 문장씩. 낭독용이므로 markdown·[n] 마커·괄호 금지>"}]}

[규칙]
- 오프닝("좋은 아침입니다, ${appName} 브리핑입니다") → 스토리 사이 자연스러운 전환 멘트 → 클로징 1문장.
- 문서의 사실만 사용. 숫자는 낭독하기 좋게 그대로 유지.
- 전체 12~20문장.`,
    briefingMd,
  );
  const lines = (result.lines ?? [])
    .map((l) => ({ text: String(l.text ?? "").replace(/\[(\d+)\]/g, "").trim(), citations: [] as number[] }))
    .filter((l) => l.text.length > 0);
  return { lines };
}

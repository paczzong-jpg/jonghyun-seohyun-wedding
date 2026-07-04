import pb from "@/lib/miso-sdk/runtime-client";

import type {
  Article,
  Briefing,
  ChatMessage,
  ChatSession,
  CitationRef,
  Cluster,
  EmailBrief,
  AudioScript,
  Settings,
  Source,
  StoryBrief,
  Tone,
  Topic,
} from "./types";
import { DEFAULT_AUDIENCE, DEFAULT_TONE } from "@/lib/news-config";

// ────────────────────────────────────────────────
// PocketBase CRUD 레이어 (nw_*)
// - 모든 동시 요청은 $autoCancel:false (PB SDK auto-cancellation 회피)
// - nw_articles.key 는 unique index — 동시 수집 race 는 create 충돌로 안전하게 수렴
// ────────────────────────────────────────────────

const NC = {
  topics: "nw_topics",
  sources: "nw_sources",
  articles: "nw_articles",
  clusters: "nw_clusters",
  sessions: "nw_chat_sessions",
  messages: "nw_messages",
  briefings: "nw_briefings",
  settings: "nw_settings",
} as const;

export { NC as NEWS_COLLECTIONS };

function esc(value: string): string {
  return value.replace(/(["\\])/g, "\\$1");
}

const NO_CANCEL = { $autoCancel: false } as const;

// ── Topics ─────────────────────────────────────

export async function listTopics(): Promise<Topic[]> {
  return pb.collection(NC.topics).getFullList<Topic>({ sort: "created", ...NO_CANCEL });
}

export async function createTopic(data: {
  name: string;
  queries: string[];
  related: string[];
  exclude: string[];
  color: string;
}): Promise<Topic> {
  return pb.collection(NC.topics).create<Topic>({ ...data, active: true }, NO_CANCEL);
}

export async function updateTopic(id: string, patch: Partial<Topic>): Promise<Topic> {
  return pb.collection(NC.topics).update<Topic>(id, patch, NO_CANCEL);
}

export async function deleteTopic(id: string): Promise<void> {
  await pb.collection(NC.topics).delete(id, NO_CANCEL);
}

// ── Sources ────────────────────────────────────

export async function listSources(): Promise<Source[]> {
  return pb.collection(NC.sources).getFullList<Source>({ sort: "category,name", ...NO_CANCEL });
}

export async function createSource(data: {
  name: string;
  url: string;
  site_url: string;
  category: string;
  media_type: string;
  active: boolean;
}): Promise<Source> {
  return pb.collection(NC.sources).create<Source>(data, NO_CANCEL);
}

export async function updateSource(id: string, patch: Partial<Source>): Promise<Source> {
  return pb.collection(NC.sources).update<Source>(id, patch, NO_CANCEL);
}

export async function deleteSource(id: string): Promise<void> {
  await pb.collection(NC.sources).delete(id, NO_CANCEL);
}

// ── Articles ───────────────────────────────────

export interface NewArticle {
  key: string;
  url: string;
  origin: "feed" | "gnews";
  title: string;
  source: string;
  source_name: string;
  media_type: string;
  topic_ids: string[];
  author: string;
  published: string;
  desc_src: string;
  content_src: string;
  image_url: string;
}

/**
 * unique index(key) 기반 upsert.
 * - 이미 있으면: topic_ids 병합만 수행 (재수집 시 메타 덮어쓰기 방지)
 * - 동시 수집 race: create 가 unique 충돌(400)로 떨어지면 기존 레코드에 병합
 */
export async function upsertArticle(data: NewArticle): Promise<{ article: Article; isNew: boolean }> {
  const existing = await findArticleByKey(data.key);
  if (existing) {
    const merged = await mergeTopicIds(existing, data.topic_ids);
    return { article: merged, isNew: false };
  }
  try {
    const created = await pb.collection(NC.articles).create<Article>(
      {
        ...data,
        one_liner: "",
        summary: "",
        key_points: [],
        entities: [],
        quote: "",
        ai_status: "",
        reader_status: "",
        reader_html: "",
        reader_text: "",
        summary_variants: {},
        cluster: "",
        bookmarked: false,
      },
      NO_CANCEL,
    );
    return { article: created, isNew: true };
  } catch (err) {
    // unique 충돌 → 다른 탭/사용자가 먼저 넣음
    const raced = await findArticleByKey(data.key);
    if (raced) {
      const merged = await mergeTopicIds(raced, data.topic_ids);
      return { article: merged, isNew: false };
    }
    throw err;
  }
}

async function mergeTopicIds(article: Article, topicIds: string[]): Promise<Article> {
  if (topicIds.length === 0) return article;
  const current = article.topic_ids ?? [];
  const merged = [...new Set([...current, ...topicIds])];
  if (merged.length === current.length) return article;
  return pb.collection(NC.articles).update<Article>(article.id, { topic_ids: merged }, NO_CANCEL);
}

export async function findArticleByKey(key: string): Promise<Article | null> {
  try {
    return await pb
      .collection(NC.articles)
      .getFirstListItem<Article>(`key = "${esc(key)}"`, NO_CANCEL);
  } catch {
    return null;
  }
}

export async function getArticle(id: string): Promise<Article> {
  return pb.collection(NC.articles).getOne<Article>(id, NO_CANCEL);
}

export async function updateArticle(id: string, patch: Partial<Article>): Promise<Article> {
  return pb.collection(NC.articles).update<Article>(id, patch, NO_CANCEL);
}

/** 최근 기사 (수집 시간창 내, 발행 역순) */
export async function listRecentArticles(sinceIso: string, limit = 500): Promise<Article[]> {
  const result = await pb.collection(NC.articles).getList<Article>(1, limit, {
    filter: `published >= "${esc(sinceIso)}"`,
    sort: "-published",
    ...NO_CANCEL,
  });
  return result.items;
}

export async function listArticlesByIds(ids: string[]): Promise<Article[]> {
  if (ids.length === 0) return [];
  const filter = ids.map((id) => `id = "${esc(id)}"`).join(" || ");
  return pb.collection(NC.articles).getFullList<Article>({ filter, ...NO_CANCEL });
}

export async function listBookmarked(): Promise<Article[]> {
  return pb
    .collection(NC.articles)
    .getFullList<Article>({ filter: "bookmarked = true", sort: "-published", ...NO_CANCEL });
}

/** 요약 대기 기사 */
export async function listPendingSummaries(sinceIso: string, limit: number): Promise<Article[]> {
  const result = await pb.collection(NC.articles).getList<Article>(1, limit, {
    filter: `published >= "${esc(sinceIso)}" && ai_status = ""`,
    sort: "-published",
    ...NO_CANCEL,
  });
  return result.items;
}

// ── Clusters ───────────────────────────────────

export async function listClusters(day?: string): Promise<Cluster[]> {
  return pb.collection(NC.clusters).getFullList<Cluster>({
    ...(day ? { filter: `day = "${esc(day)}"` } : {}),
    sort: "-size,-updated",
    ...NO_CANCEL,
  });
}

export async function getCluster(id: string): Promise<Cluster> {
  return pb.collection(NC.clusters).getOne<Cluster>(id, NO_CANCEL);
}

export async function findClusterByCkey(ckey: string): Promise<Cluster | null> {
  try {
    return await pb
      .collection(NC.clusters)
      .getFirstListItem<Cluster>(`ckey = "${esc(ckey)}"`, NO_CANCEL);
  } catch {
    return null;
  }
}

export async function createCluster(data: {
  ckey: string;
  label: string;
  day: string;
  category: string;
  rep: string;
  article_ids: string[];
}): Promise<Cluster> {
  return pb
    .collection(NC.clusters)
    .create<Cluster>({ ...data, size: data.article_ids.length, brief: null, brief_status: "" }, NO_CANCEL);
}

export async function updateCluster(id: string, patch: Partial<Omit<Cluster, "brief">> & { brief?: StoryBrief | null }): Promise<Cluster> {
  return pb.collection(NC.clusters).update<Cluster>(id, patch, NO_CANCEL);
}

// ── Chat ───────────────────────────────────────

export async function listSessions(): Promise<ChatSession[]> {
  return pb.collection(NC.sessions).getFullList<ChatSession>({ sort: "-updated", ...NO_CANCEL });
}

export async function createSession(title: string): Promise<ChatSession> {
  return pb.collection(NC.sessions).create<ChatSession>({ title }, NO_CANCEL);
}

export async function renameSession(id: string, title: string): Promise<ChatSession> {
  return pb.collection(NC.sessions).update<ChatSession>(id, { title }, NO_CANCEL);
}

export async function deleteSession(id: string): Promise<void> {
  await pb.collection(NC.sessions).delete(id, NO_CANCEL);
}

export async function listMessages(sessionId: string): Promise<ChatMessage[]> {
  return pb.collection(NC.messages).getFullList<ChatMessage>({
    filter: `session = "${esc(sessionId)}"`,
    sort: "created",
    ...NO_CANCEL,
  });
}

export async function createMessage(data: {
  session: string;
  role: "user" | "assistant";
  content: string;
  citations: CitationRef[];
}): Promise<ChatMessage> {
  return pb.collection(NC.messages).create<ChatMessage>(data, NO_CANCEL);
}

// ── Briefings ──────────────────────────────────

export async function listBriefings(kind?: string): Promise<Briefing[]> {
  return pb.collection(NC.briefings).getFullList<Briefing>({
    ...(kind ? { filter: `kind = "${esc(kind)}"` } : {}),
    sort: "-created",
    ...NO_CANCEL,
  });
}

export async function findBriefing(day: string, kind: string): Promise<Briefing | null> {
  try {
    return await pb
      .collection(NC.briefings)
      .getFirstListItem<Briefing>(`day = "${esc(day)}" && kind = "${esc(kind)}"`, {
        sort: "-created",
        ...NO_CANCEL,
      });
  } catch {
    return null;
  }
}

export async function createBriefing(data: {
  day: string;
  kind: "daily" | "email";
  title: string;
  content_md: string;
  citations: CitationRef[];
  params: Record<string, unknown>;
}): Promise<Briefing> {
  return pb.collection(NC.briefings).create<Briefing>({ ...data, email: null, audio: null }, NO_CANCEL);
}

export async function updateBriefing(
  id: string,
  patch: Partial<Omit<Briefing, "email" | "audio">> & { email?: EmailBrief | null; audio?: AudioScript | null },
): Promise<Briefing> {
  return pb.collection(NC.briefings).update<Briefing>(id, patch, NO_CANCEL);
}

// ── Settings (단일 레코드) ──────────────────────

export async function getSettings(): Promise<Settings> {
  const list = await pb.collection(NC.settings).getList<Settings>(1, 1, NO_CANCEL);
  if (list.items.length > 0) return list.items[0];
  return pb.collection(NC.settings).create<Settings>(
    { tone: DEFAULT_TONE as Tone, audience: DEFAULT_AUDIENCE, mute: [] },
    NO_CANCEL,
  );
}

export async function updateSettings(id: string, patch: Partial<Settings>): Promise<Settings> {
  return pb.collection(NC.settings).update<Settings>(id, patch, NO_CANCEL);
}

// ── 읽음 상태 (기기별 — localStorage) ────────────

const READ_KEY = "nw:read";
const READ_LIMIT = 3000;

export function loadReadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function markRead(id: string): Set<string> {
  const set = loadReadSet();
  set.add(id);
  const arr = [...set];
  localStorage.setItem(READ_KEY, JSON.stringify(arr.slice(-READ_LIMIT)));
  return set;
}

import pb from "@/lib/miso-sdk/runtime-client";

import type {
  Artifact,
  ArtifactPayloadMap,
  ArtifactType,
  ChatMessage,
  ChatSession,
  ContextMode,
  Note,
  Notebook,
  Source,
  SourceChunk,
  SourceStatus,
} from "./types";

// ────────────────────────────────────────────────
// PocketBase CRUD 레이어.
// - 모든 동시 요청은 $autoCancel:false (PB SDK auto-cancellation 회피)
// - notebook 관계는 cascadeDelete 로 생성되어 노트북 삭제 시 하위 레코드가 함께 지워진다
// ────────────────────────────────────────────────

const NC = {
  notebooks: "nb_notebooks",
  sources: "nb_sources",
  chunks: "nb_source_chunks",
  sessions: "nb_chat_sessions",
  messages: "nb_messages",
  notes: "nb_notes",
  artifacts: "nb_artifacts",
} as const;

export { NC as NOTEBOOK_COLLECTIONS };

function esc(value: string): string {
  return value.replace(/(["\\])/g, "\\$1");
}

// ── Notebooks ──────────────────────────────────

export async function listNotebooks(): Promise<Notebook[]> {
  return pb.collection(NC.notebooks).getFullList<Notebook>({
    sort: "-updated",
    $autoCancel: false,
  });
}

export async function getNotebook(id: string): Promise<Notebook> {
  return pb.collection(NC.notebooks).getOne<Notebook>(id, { $autoCancel: false });
}

export async function createNotebook(data: {
  name: string;
  description?: string;
  color: string;
}): Promise<Notebook> {
  return pb.collection(NC.notebooks).create<Notebook>({
    name: data.name,
    description: data.description ?? "",
    color: data.color,
    archived: false,
  });
}

export async function updateNotebook(
  id: string,
  data: Partial<Pick<Notebook, "name" | "description" | "color" | "archived">>,
): Promise<Notebook> {
  return pb.collection(NC.notebooks).update<Notebook>(id, data);
}

export async function deleteNotebook(id: string): Promise<void> {
  await pb.collection(NC.notebooks).delete(id);
}

// ── Sources ────────────────────────────────────

export async function listSources(notebookId: string): Promise<Source[]> {
  return pb.collection(NC.sources).getFullList<Source>({
    filter: `notebook = "${esc(notebookId)}"`,
    sort: "-created",
    $autoCancel: false,
  });
}

export async function createSource(data: {
  notebook: string;
  title: string;
  type: Source["type"];
  url?: string;
}): Promise<Source> {
  return pb.collection(NC.sources).create<Source>({
    notebook: data.notebook,
    title: data.title,
    type: data.type,
    url: data.url ?? "",
    status: "processing" satisfies SourceStatus,
    summary: "",
    topics: [],
    questions: [],
    excerpt: "",
    char_count: 0,
    context_mode: "full" satisfies ContextMode,
    error: "",
  });
}

export async function updateSource(
  id: string,
  data: Partial<
    Pick<
      Source,
      | "title"
      | "status"
      | "summary"
      | "topics"
      | "questions"
      | "excerpt"
      | "char_count"
      | "context_mode"
      | "error"
    >
  >,
): Promise<Source> {
  return pb.collection(NC.sources).update<Source>(id, data);
}

export async function deleteSource(id: string): Promise<void> {
  await pb.collection(NC.sources).delete(id);
}

// ── Source chunks ──────────────────────────────

export async function createChunks(
  sourceId: string,
  notebookId: string,
  texts: string[],
): Promise<void> {
  // 청크 수는 수십 개 수준 — 순차 생성으로 단순·안전하게
  for (let i = 0; i < texts.length; i++) {
    await pb.collection(NC.chunks).create(
      { source: sourceId, notebook: notebookId, idx: i, text: texts[i] },
      { $autoCancel: false },
    );
  }
}

export async function listChunks(sourceId: string): Promise<SourceChunk[]> {
  return pb.collection(NC.chunks).getFullList<SourceChunk>({
    filter: `source = "${esc(sourceId)}"`,
    sort: "idx",
    $autoCancel: false,
  });
}

/** 소스 전문 — 청크를 idx 순으로 이어붙인다 */
export async function getSourceText(sourceId: string): Promise<string> {
  const chunks = await listChunks(sourceId);
  return chunks.map((c) => c.text).join("\n");
}

// ── Chat sessions & messages ───────────────────

export async function listSessions(notebookId: string): Promise<ChatSession[]> {
  return pb.collection(NC.sessions).getFullList<ChatSession>({
    filter: `notebook = "${esc(notebookId)}"`,
    sort: "-updated",
    $autoCancel: false,
  });
}

export async function createSession(notebookId: string, title: string): Promise<ChatSession> {
  return pb.collection(NC.sessions).create<ChatSession>({ notebook: notebookId, title });
}

export async function renameSession(id: string, title: string): Promise<ChatSession> {
  return pb.collection(NC.sessions).update<ChatSession>(id, { title });
}

export async function touchSession(id: string): Promise<void> {
  // updated autodate 갱신용 — 정렬(최근 세션 우선) 유지
  await pb.collection(NC.sessions).update(id, {}, { $autoCancel: false });
}

export async function deleteSession(id: string): Promise<void> {
  await pb.collection(NC.sessions).delete(id);
}

export async function listMessages(sessionId: string): Promise<ChatMessage[]> {
  return pb.collection(NC.messages).getFullList<ChatMessage>({
    filter: `session = "${esc(sessionId)}"`,
    sort: "created",
    $autoCancel: false,
  });
}

export async function createMessage(data: {
  session: string;
  notebook: string;
  role: ChatMessage["role"];
  content: string;
  citations?: ChatMessage["citations"];
}): Promise<ChatMessage> {
  return pb.collection(NC.messages).create<ChatMessage>(
    {
      session: data.session,
      notebook: data.notebook,
      role: data.role,
      content: data.content,
      citations: data.citations ?? [],
    },
    { $autoCancel: false },
  );
}

export async function deleteMessage(id: string): Promise<void> {
  await pb.collection(NC.messages).delete(id);
}

// ── Notes ──────────────────────────────────────

export async function listNotes(notebookId: string): Promise<Note[]> {
  return pb.collection(NC.notes).getFullList<Note>({
    filter: `notebook = "${esc(notebookId)}"`,
    sort: "-updated",
    $autoCancel: false,
  });
}

export async function createNote(data: {
  notebook: string;
  title: string;
  content: string;
  kind: Note["kind"];
  origin?: string;
}): Promise<Note> {
  return pb.collection(NC.notes).create<Note>({
    notebook: data.notebook,
    title: data.title,
    content: data.content,
    kind: data.kind,
    origin: data.origin ?? "",
  });
}

export async function updateNote(
  id: string,
  data: Partial<Pick<Note, "title" | "content">>,
): Promise<Note> {
  return pb.collection(NC.notes).update<Note>(id, data);
}

export async function deleteNote(id: string): Promise<void> {
  await pb.collection(NC.notes).delete(id);
}

// ── Studio artifacts ───────────────────────────

export async function listArtifacts(notebookId: string): Promise<Artifact[]> {
  return pb.collection(NC.artifacts).getFullList<Artifact>({
    filter: `notebook = "${esc(notebookId)}"`,
    sort: "-created",
    $autoCancel: false,
  });
}

export async function createArtifact<T extends ArtifactType>(data: {
  notebook: string;
  type: T;
  title: string;
  payload: ArtifactPayloadMap[T];
}): Promise<Artifact<T>> {
  return pb.collection(NC.artifacts).create<Artifact<T>>({
    notebook: data.notebook,
    type: data.type,
    title: data.title,
    payload: data.payload,
  });
}

export async function deleteArtifact(id: string): Promise<void> {
  await pb.collection(NC.artifacts).delete(id);
}

// ── Search ─────────────────────────────────────

export interface SearchHit {
  kind: "source" | "note" | "message";
  id: string;
  notebook: string;
  title: string;
  snippet: string;
}

function makeSnippet(text: string, query: string, width = 90): string {
  const lower = text.toLowerCase();
  const at = lower.indexOf(query.toLowerCase());
  if (at < 0) return text.slice(0, width);
  const start = Math.max(0, at - Math.floor(width / 3));
  const raw = text.slice(start, start + width);
  return `${start > 0 ? "…" : ""}${raw}${start + width < text.length ? "…" : ""}`;
}

/** 노트북 범위(또는 전체) 전문 검색 — 소스 청크·노트·메시지를 훑는다 */
export async function searchAll(query: string, notebookId?: string): Promise<SearchHit[]> {
  const q = esc(query);
  const scope = notebookId ? ` && notebook = "${esc(notebookId)}"` : "";
  const [chunks, notes, messages] = await Promise.all([
    pb.collection(NC.chunks).getList<SourceChunk & { expand?: { source?: Source } }>(1, 8, {
      filter: `text ~ "${q}"${scope}`,
      expand: "source",
      $autoCancel: false,
    }),
    pb.collection(NC.notes).getList<Note>(1, 8, {
      filter: `(title ~ "${q}" || content ~ "${q}")${scope}`,
      $autoCancel: false,
    }),
    pb.collection(NC.messages).getList<ChatMessage>(1, 8, {
      filter: `content ~ "${q}"${scope}`,
      $autoCancel: false,
    }),
  ]);

  const hits: SearchHit[] = [];
  const seenSources = new Set<string>();
  for (const c of chunks.items) {
    if (seenSources.has(c.source)) continue;
    seenSources.add(c.source);
    hits.push({
      kind: "source",
      id: c.source,
      notebook: c.notebook,
      title: c.expand?.source?.title ?? "소스",
      snippet: makeSnippet(c.text, query),
    });
  }
  for (const n of notes.items) {
    hits.push({
      kind: "note",
      id: n.id,
      notebook: n.notebook,
      title: n.title || "제목 없는 노트",
      snippet: makeSnippet(n.content, query),
    });
  }
  for (const m of messages.items) {
    hits.push({
      kind: "message",
      id: m.session,
      notebook: m.notebook,
      title: "채팅",
      snippet: makeSnippet(m.content, query),
    });
  }
  return hits;
}

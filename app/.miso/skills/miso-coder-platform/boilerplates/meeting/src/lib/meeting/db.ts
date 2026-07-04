import pb from "@/lib/miso-sdk/runtime-client";

import { MEETING_COLORS, TEMPLATE_PRESETS } from "@/lib/meeting-config";
import type {
  Attachment,
  AttachmentChunk,
  ChatMessage,
  Meeting,
  MinutesTemplate,
  RawSegment,
  Segment,
  Share,
} from "./types";

// ────────────────────────────────────────────────
// PocketBase CRUD 레이어.
// - 모든 동시 요청은 $autoCancel:false (PB SDK auto-cancellation 회피)
// - meeting 관계는 cascadeDelete — 회의 삭제 시 하위 레코드가 함께 지워진다
// - 세그먼트 대량 쓰기는 PB batch API 를 50개 단위로 나눠 보낸다
// ────────────────────────────────────────────────

const MC = {
  meetings: "mn_meetings",
  segments: "mn_segments",
  templates: "mn_templates",
  attachments: "mn_attachments",
  attachmentChunks: "mn_attachment_chunks",
  messages: "mn_chat_messages",
  shares: "mn_shares",
} as const;

export { MC as MEETING_COLLECTIONS };

function esc(value: string): string {
  return value.replace(/(["\\])/g, "\\$1");
}

// ── Meetings ───────────────────────────────────

export async function listMeetings(): Promise<Meeting[]> {
  return pb.collection(MC.meetings).getFullList<Meeting>({
    sort: "-created",
    $autoCancel: false,
  });
}

export async function getMeeting(id: string): Promise<Meeting> {
  return pb.collection(MC.meetings).getOne<Meeting>(id, { $autoCancel: false });
}

export async function createMeeting(data: {
  title: string;
  language: string;
  origin: Meeting["origin"];
  template: string;
  audio?: File | Blob;
  audioName?: string;
  duration?: number;
}): Promise<Meeting> {
  // 오디오는 PB file 필드 — FormData 로 보낸다 (파일 레시피 계약)
  const form = new FormData();
  form.append("title", data.title);
  form.append("status", "transcribing");
  form.append("language", data.language);
  form.append("origin", data.origin);
  form.append("template", data.template);
  form.append("duration", String(data.duration ?? 0));
  form.append("participants", "[]");
  form.append("tags", "[]");
  form.append("speaker_names", "{}");
  form.append("minutes_md", "");
  form.append("my_notes", "");
  form.append("error", "");
  form.append("color", MEETING_COLORS[Math.floor(Math.random() * MEETING_COLORS.length)]);
  if (data.audio) {
    form.append("audio", data.audio, data.audioName ?? "meeting-audio.webm");
  }
  return pb.collection(MC.meetings).create<Meeting>(form);
}

export async function updateMeeting(
  id: string,
  data: Partial<
    Pick<
      Meeting,
      | "title"
      | "status"
      | "duration"
      | "language"
      | "participants"
      | "tags"
      | "minutes_md"
      | "template"
      | "my_notes"
      | "speaker_names"
      | "error"
    >
  >,
): Promise<Meeting> {
  return pb.collection(MC.meetings).update<Meeting>(id, data, { $autoCancel: false });
}

/** 녹음 종료 후 오디오 파일 첨부 (원본 보존) */
export async function attachMeetingAudio(
  id: string,
  audio: Blob,
  fileName: string,
  duration: number,
): Promise<Meeting> {
  const form = new FormData();
  form.append("audio", audio, fileName);
  form.append("duration", String(duration));
  return pb.collection(MC.meetings).update<Meeting>(id, form, { $autoCancel: false });
}

export async function deleteMeeting(id: string): Promise<void> {
  await pb.collection(MC.meetings).delete(id);
}

/** 오디오 스트리밍 재생 URL — <audio src> 로 그대로 사용(브라우저 range 스트리밍) */
export function meetingAudioUrl(meeting: Meeting): string {
  if (!meeting.audio) return "";
  return pb.files.getURL(meeting, meeting.audio);
}

// ── Segments ───────────────────────────────────

export async function listSegments(meetingId: string): Promise<Segment[]> {
  return pb.collection(MC.segments).getFullList<Segment>({
    filter: `meeting = "${esc(meetingId)}"`,
    sort: "idx",
    batch: 500,
    $autoCancel: false,
  });
}

/**
 * 세그먼트 일괄 저장 — PB batch API(50개 단위).
 * 전사 완료 시 한 번만 호출한다.
 */
export async function createSegments(meetingId: string, segments: RawSegment[]): Promise<void> {
  const BATCH = 50;
  for (let at = 0; at < segments.length; at += BATCH) {
    const batch = pb.createBatch();
    for (let i = at; i < Math.min(at + BATCH, segments.length); i++) {
      const seg = segments[i];
      batch.collection(MC.segments).create({
        meeting: meetingId,
        idx: i,
        start: seg.start,
        end: seg.end,
        text: seg.text,
        speaker: seg.speaker ?? "",
      });
    }
    await batch.send();
  }
}

export async function deleteSegments(meetingId: string): Promise<void> {
  const existing = await listSegments(meetingId);
  const BATCH = 50;
  for (let at = 0; at < existing.length; at += BATCH) {
    const batch = pb.createBatch();
    for (const seg of existing.slice(at, at + BATCH)) {
      batch.collection(MC.segments).delete(seg.id);
    }
    await batch.send();
  }
}

// ── Templates ──────────────────────────────────

export async function listTemplates(): Promise<MinutesTemplate[]> {
  return pb.collection(MC.templates).getFullList<MinutesTemplate>({
    sort: "created",
    $autoCancel: false,
  });
}

/** 비어 있으면 기본 프리셋을 시드하고 전체 목록을 돌려준다 */
export async function ensureTemplates(): Promise<MinutesTemplate[]> {
  const existing = await listTemplates();
  if (existing.length > 0) return existing;
  for (const preset of TEMPLATE_PRESETS) {
    await pb.collection(MC.templates).create(
      {
        name: preset.name,
        description: preset.description,
        sections: preset.sections,
        builtin: true,
      },
      { $autoCancel: false },
    );
  }
  return listTemplates();
}

export async function createTemplate(data: {
  name: string;
  description: string;
  sections: MinutesTemplate["sections"];
}): Promise<MinutesTemplate> {
  return pb.collection(MC.templates).create<MinutesTemplate>({ ...data, builtin: false });
}

export async function updateTemplate(
  id: string,
  data: Partial<Pick<MinutesTemplate, "name" | "description" | "sections">>,
): Promise<MinutesTemplate> {
  return pb.collection(MC.templates).update<MinutesTemplate>(id, data);
}

export async function deleteTemplate(id: string): Promise<void> {
  await pb.collection(MC.templates).delete(id);
}

// ── Attachments ────────────────────────────────

export async function listAttachments(meetingId: string): Promise<Attachment[]> {
  return pb.collection(MC.attachments).getFullList<Attachment>({
    filter: `meeting = "${esc(meetingId)}"`,
    sort: "-created",
    $autoCancel: false,
  });
}

export async function createAttachment(meetingId: string, file: File): Promise<Attachment> {
  const form = new FormData();
  form.append("meeting", meetingId);
  form.append("title", file.name);
  form.append("status", "processing");
  form.append("char_count", "0");
  form.append("error", "");
  form.append("file", file);
  return pb.collection(MC.attachments).create<Attachment>(form);
}

export async function updateAttachment(
  id: string,
  data: Partial<Pick<Attachment, "status" | "char_count" | "error">>,
): Promise<Attachment> {
  return pb.collection(MC.attachments).update<Attachment>(id, data, { $autoCancel: false });
}

export async function deleteAttachment(id: string): Promise<void> {
  await pb.collection(MC.attachments).delete(id);
}

/** 첨부 원본 다운로드 URL */
export function attachmentFileUrl(attachment: Attachment): string {
  return pb.files.getURL(attachment, attachment.file);
}

export async function createAttachmentChunks(
  attachmentId: string,
  meetingId: string,
  texts: string[],
): Promise<void> {
  for (let i = 0; i < texts.length; i++) {
    await pb.collection(MC.attachmentChunks).create(
      { attachment: attachmentId, meeting: meetingId, idx: i, text: texts[i] },
      { $autoCancel: false },
    );
  }
}

/** 첨부 전문 — 청크를 idx 순으로 이어붙인다 */
export async function getAttachmentText(attachmentId: string): Promise<string> {
  const chunks = await pb.collection(MC.attachmentChunks).getFullList<AttachmentChunk>({
    filter: `attachment = "${esc(attachmentId)}"`,
    sort: "idx",
    $autoCancel: false,
  });
  return chunks.map((c) => c.text).join("\n");
}

// ── Chat ───────────────────────────────────────

export async function listChatMessages(meetingId: string): Promise<ChatMessage[]> {
  return pb.collection(MC.messages).getFullList<ChatMessage>({
    filter: `meeting = "${esc(meetingId)}"`,
    sort: "created",
    $autoCancel: false,
  });
}

export async function createChatMessage(data: {
  meeting: string;
  role: ChatMessage["role"];
  content: string;
  citations?: ChatMessage["citations"];
}): Promise<ChatMessage> {
  return pb.collection(MC.messages).create<ChatMessage>(
    { ...data, citations: data.citations ?? [] },
    { $autoCancel: false },
  );
}

export async function clearChat(meetingId: string): Promise<void> {
  const messages = await listChatMessages(meetingId);
  for (const message of messages) {
    await pb.collection(MC.messages).delete(message.id, { $autoCancel: false });
  }
}

// ── Shares ─────────────────────────────────────

export async function getShareForMeeting(meetingId: string): Promise<Share | null> {
  try {
    return await pb
      .collection(MC.shares)
      .getFirstListItem<Share>(`meeting = "${esc(meetingId)}"`, { $autoCancel: false });
  } catch {
    return null;
  }
}

export async function createShare(meetingId: string): Promise<Share> {
  const token = crypto.randomUUID().replace(/-/g, "");
  return pb.collection(MC.shares).create<Share>({ meeting: meetingId, token });
}

export async function deleteShare(id: string): Promise<void> {
  await pb.collection(MC.shares).delete(id);
}

/** 공유 토큰으로 회의 조회 — 공유 뷰 전용 */
export async function getMeetingByShareToken(token: string): Promise<Meeting | null> {
  try {
    const share = await pb
      .collection(MC.shares)
      .getFirstListItem<Share & { expand?: { meeting?: Meeting } }>(
        `token = "${esc(token)}"`,
        { expand: "meeting", $autoCancel: false },
      );
    return share.expand?.meeting ?? null;
  } catch {
    return null;
  }
}

// ── Realtime ───────────────────────────────────

/** 회의 레코드 변경 구독 — cleanup 함수 반환 */
export function subscribeMeeting(
  meetingId: string,
  onChange: (meeting: Meeting) => void,
): () => void {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;
  pb.collection(MC.meetings)
    .subscribe<Meeting>(meetingId, (event) => {
      if (event.action === "update") onChange(event.record);
    })
    .then((fn) => {
      if (cancelled) fn();
      else unsubscribe = fn;
    })
    .catch(() => {
      /* realtime 실패는 폴백 없이 무시 — 조회는 일반 fetch 로 동작 */
    });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

/** 회의 목록 변경 구독 (대시보드 라이브 갱신) */
export function subscribeMeetings(onChange: () => void): () => void {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;
  pb.collection(MC.meetings)
    .subscribe("*", () => onChange())
    .then((fn) => {
      if (cancelled) fn();
      else unsubscribe = fn;
    })
    .catch(() => {
      /* 무시 */
    });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

// ── Search ─────────────────────────────────────

export interface MeetingSearchHit {
  meetingId: string;
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

/** 트랜스크립트·회의록 본문 검색 — 대시보드 전역 검색용 */
export async function searchMeetingContent(query: string): Promise<MeetingSearchHit[]> {
  const q = esc(query);
  const [segments, meetings] = await Promise.all([
    pb.collection(MC.segments).getList<Segment>(1, 10, {
      filter: `text ~ "${q}"`,
      $autoCancel: false,
    }),
    pb.collection(MC.meetings).getList<Meeting>(1, 10, {
      filter: `minutes_md ~ "${q}"`,
      $autoCancel: false,
    }),
  ]);

  const hits: MeetingSearchHit[] = [];
  const seen = new Set<string>();
  for (const seg of segments.items) {
    if (seen.has(seg.meeting)) continue;
    seen.add(seg.meeting);
    hits.push({ meetingId: seg.meeting, snippet: makeSnippet(seg.text, query) });
  }
  for (const meeting of meetings.items) {
    if (seen.has(meeting.id)) continue;
    seen.add(meeting.id);
    hits.push({ meetingId: meeting.id, snippet: makeSnippet(meeting.minutes_md, query) });
  }
  return hits;
}

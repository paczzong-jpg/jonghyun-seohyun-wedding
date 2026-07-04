import { MAX_DIARIZE_SEC, resolveMeetingOutputLanguage } from "@/lib/meeting-config";
import { decodeToPcm16k } from "./audio";
import {
  createSegments,
  deleteSegments,
  ensureTemplates,
  getAttachmentText,
  listAttachments,
  meetingAudioUrl,
  updateMeeting,
} from "./db";
import {
  buildAttachmentContext,
  buildTranscriptContext,
  generateMeetingTitle,
  generateMinutes,
  type AttachmentContextInput,
} from "./llm";
import { applySpeakerTurns, getStt } from "./stt";
import type { Meeting, MinutesTemplate, RawSegment, SttProgress } from "./types";

// ────────────────────────────────────────────────
// 회의 처리 파이프라인 — 전사(업로드) → 화자 분리 → 저장 → 회의록.
// 처리는 시작한 브라우저 탭이 소유한다 (STT 는 브라우저 로컬 실행).
// 각 단계 실패는 status=failed + error 로 남기되,
// 화자 분리 실패만은 치명적이지 않으므로 화자 없이 계속 진행한다.
// ────────────────────────────────────────────────

export type ProcessStage = "prepare" | "transcribe" | "diarize" | "save" | "minutes";

export interface ProcessCallbacks {
  onStage?: (stage: ProcessStage) => void;
  onProgress?: (p: SttProgress) => void;
  /** 회의록 스트리밍 중간 결과 (UI 표시용) */
  onMinutesChunk?: (markdown: string) => void;
}

async function resolveTemplate(templateId: string): Promise<MinutesTemplate> {
  const templates = await ensureTemplates();
  return templates.find((t) => t.id === templateId) ?? templates[0];
}

/** ready 상태 첨부의 본문을 모아 컨텍스트 입력으로 만든다 */
export async function collectAttachmentContext(meetingId: string): Promise<string> {
  const attachments = await listAttachments(meetingId);
  const inputs: AttachmentContextInput[] = [];
  for (const attachment of attachments) {
    if (attachment.status !== "ready") continue;
    inputs.push({ title: attachment.title, text: await getAttachmentText(attachment.id) });
  }
  return buildAttachmentContext(inputs);
}

async function markFailed(meetingId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  try {
    await updateMeeting(meetingId, { status: "failed", error: message.slice(0, 500) });
  } catch {
    /* 상태 기록 실패는 무시 — UI 는 로컬 에러를 이미 표시한다 */
  }
}

/**
 * 공용 마무리 단계 — 화자 분리 → 세그먼트 저장 → 제목 → 회의록 생성.
 * fullPcm 이 null 이면 화자 분리를 건너뛴다.
 */
async function completeMeeting(
  meeting: Meeting,
  rawSegments: RawSegment[],
  fullPcm: Float32Array | null,
  cb: ProcessCallbacks,
): Promise<void> {
  const stt = getStt();
  let segments = rawSegments;

  // 화자 분리 — "가능하다고 판별되는 경우"에만 결과를 반영한다:
  // 모델 실패·화자 1명 이하·과도한 길이는 조용히 화자 없이 진행.
  if (fullPcm && fullPcm.length / 16_000 <= MAX_DIARIZE_SEC && rawSegments.length > 0) {
    cb.onStage?.("diarize");
    try {
      const turns = await stt.diarize(fullPcm);
      ({ segments } = applySpeakerTurns(rawSegments, turns));
    } catch {
      segments = rawSegments;
    }
  }

  cb.onStage?.("save");
  await deleteSegments(meeting.id); // 재처리 대비 멱등
  await createSegments(meeting.id, segments);

  const transcriptCtx = buildTranscriptContext(segments, meeting.speaker_names ?? {});

  // 제목이 비어 있으면 트랜스크립트 도입부로 자동 생성
  let title = meeting.title.trim();
  if (!title) {
    title = (await generateMeetingTitle(transcriptCtx)) || "제목 없는 회의";
  }

  await updateMeeting(meeting.id, { status: "summarizing", title });

  cb.onStage?.("minutes");
  const template = await resolveTemplate(meeting.template);
  const attachmentCtx = await collectAttachmentContext(meeting.id);
  const outputLanguage = resolveMeetingOutputLanguage(meeting.language);

  const minutes = await new Promise<string>((resolve, reject) => {
    void generateMinutes(template, transcriptCtx, attachmentCtx, outputLanguage, {
      onChunk: (full) => cb.onMinutesChunk?.(full),
      onDone: resolve,
      onError: reject,
    });
  });

  await updateMeeting(meeting.id, {
    status: "ready",
    minutes_md: minutes,
    template: template.id,
    error: "",
  });
}

/**
 * 업로드/재개 경로 — PB 의 오디오 파일을 받아 전체 전사부터 시작한다.
 * (MeetingPage 가 소유. status=transcribing 인데 세그먼트가 없으면 이 함수로 재개)
 */
export async function processMeetingAudio(meeting: Meeting, cb: ProcessCallbacks): Promise<void> {
  const stt = getStt();
  const offProgress = cb.onProgress ? stt.onProgress(cb.onProgress) : null;
  try {
    cb.onStage?.("prepare");
    const url = meetingAudioUrl(meeting);
    if (!url) throw new Error("오디오 파일이 없습니다.");
    const response = await fetch(url);
    if (!response.ok) throw new Error(`오디오를 불러오지 못했습니다 (${response.status})`);
    const { pcm, duration } = await decodeToPcm16k(await response.blob());
    if (Math.abs((meeting.duration ?? 0) - duration) > 1) {
      await updateMeeting(meeting.id, { duration: Math.round(duration) });
    }

    cb.onStage?.("transcribe");
    // diarize 에서 원본 PCM 을 다시 쓰므로 전사에는 복사본을 transferable 로 넘긴다
    const segments = await stt.transcribe(pcm.slice(), 0, meeting.language || "auto");
    await completeMeeting(meeting, segments, pcm, cb);
  } catch (error) {
    await markFailed(meeting.id, error);
    throw error;
  } finally {
    offProgress?.();
  }
}

/**
 * 녹음 종료 경로 — 라이브 세그먼트는 이미 확보된 상태.
 * RecordPage 가 meeting 생성(오디오 포함) 직후 호출한다.
 */
export async function finalizeRecordedMeeting(
  meeting: Meeting,
  liveSegments: RawSegment[],
  fullPcm: Float32Array,
  cb: ProcessCallbacks,
): Promise<void> {
  const stt = getStt();
  const offProgress = cb.onProgress ? stt.onProgress(cb.onProgress) : null;
  try {
    await completeMeeting(meeting, liveSegments, fullPcm, cb);
  } catch (error) {
    await markFailed(meeting.id, error);
    throw error;
  } finally {
    offProgress?.();
  }
}

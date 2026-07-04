import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  Link2Icon,
  Link2OffIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  PaperclipIcon,
  PlayIcon,
  ScrollTextIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttachmentsPanel } from "@/components/meeting/attachments-panel";
import { AudioPlayerBar, useAudioPlayer } from "@/components/meeting/audio-player";
import { ChatPanel } from "@/components/meeting/chat-panel";
import { MinutesPanel } from "@/components/meeting/minutes-panel";
import { TemplateDialog } from "@/components/meeting/template-dialog";
import { TranscriptPanel } from "@/components/meeting/transcript-panel";
import { formatClock } from "@/lib/meeting/audio";
import { resolveMeetingOutputLanguage } from "@/lib/meeting-config";
import {
  createShare,
  deleteMeeting,
  deleteShare,
  ensureTemplates,
  getMeeting,
  getShareForMeeting,
  listAttachments,
  listSegments,
  meetingAudioUrl,
  subscribeMeeting,
  updateMeeting,
} from "@/lib/meeting/db";
import { buildTranscriptContext, generateMinutes } from "@/lib/meeting/llm";
import {
  collectAttachmentContext,
  processMeetingAudio,
  type ProcessStage,
} from "@/lib/meeting/process";
import type {
  Attachment,
  Meeting,
  MinutesTemplate,
  Segment,
  Share,
  SttProgress,
} from "@/lib/meeting/types";
import { getStt } from "@/lib/meeting/stt";

// ────────────────────────────────────────────────
// 회의 상세 — 좌: 회의록 문서 / 우: 트랜스크립트·AI 채팅·자료 /
// 하단: 도킹 오디오 플레이어. 전사 처리(업로드/재개)는 이 페이지가 소유한다.
// ────────────────────────────────────────────────

const STAGE_LABEL: Record<ProcessStage, string> = {
  prepare: "오디오 준비 중",
  transcribe: "브라우저에서 전사 중",
  diarize: "화자 분석 중",
  save: "트랜스크립트 저장 중",
  minutes: "회의록 작성 중",
};

/** 대시보드 업로드 직후 자동 처리 핸드오프 키 */
export function markForProcessing(meetingId: string): void {
  sessionStorage.setItem(`mn-process-${meetingId}`, "1");
}

function shareUrl(token: string): string {
  const base =
    (window as unknown as { __MISO_BASE_PATH__?: string }).__MISO_BASE_PATH__ ?? "";
  return `${window.location.origin}${base}/share/${token}`;
}

export function MeetingPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [templates, setTemplates] = useState<MinutesTemplate[]>([]);
  const [notFound, setNotFound] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<ProcessStage | null>(null);
  const [progress, setProgress] = useState<SttProgress | null>(null);
  const [streamingMd, setStreamingMd] = useState<string | null>(null);
  const [regenBusy, setRegenBusy] = useState(false);

  const [templateDialog, setTemplateDialog] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [share, setShare] = useState<Share | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [metaDraft, setMetaDraft] = useState({ participants: "", tags: "" });

  const processingRef = useRef(false);

  const audioUrl = meeting ? meetingAudioUrl(meeting) : "";
  const player = useAudioPlayer(audioUrl, meeting?.duration ?? 0);

  const refreshSegments = useCallback(() => {
    listSegments(id).then(setSegments).catch(() => undefined);
  }, [id]);

  const refreshAttachments = useCallback(() => {
    listAttachments(id).then(setAttachments).catch(() => undefined);
  }, [id]);

  // 초기 로드
  useEffect(() => {
    let alive = true;
    Promise.all([getMeeting(id), listSegments(id), listAttachments(id), ensureTemplates()])
      .then(([m, segs, atts, tpls]) => {
        if (!alive) return;
        setMeeting(m);
        setSegments(segs);
        setAttachments(atts);
        setTemplates(tpls);
      })
      .catch(() => setNotFound(true));
    return () => {
      alive = false;
    };
  }, [id]);

  // 회의 레코드 realtime — 다른 탭 처리 상태가 실시간 반영된다
  useEffect(() => {
    return subscribeMeeting(id, (record) => {
      setMeeting(record);
      if (record.status === "ready") refreshSegments();
    });
  }, [id, refreshSegments]);

  // 전사 처리 시작 (업로드 직후 자동 / 재개 버튼)
  const startProcessing = useCallback(
    (target: Meeting, onSettled?: () => void) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setProcessing(true);
      setStreamingMd(null);
      const stt = getStt();
      const offProgress = stt.onProgress(setProgress);
      processMeetingAudio(target, {
        onStage: setStage,
        onProgress: setProgress,
        onMinutesChunk: (md) => setStreamingMd(md),
      })
        .then(async () => {
          setMeeting(await getMeeting(id));
          refreshSegments();
        })
        .catch((error: Error) => {
          toast.error(`처리 실패: ${error.message}`);
          getMeeting(id).then(setMeeting).catch(() => undefined);
        })
        .finally(() => {
          processingRef.current = false;
          setProcessing(false);
          setStage(null);
          setProgress(null);
          setStreamingMd(null);
          offProgress();
          onSettled?.();
        });
    },
    [id, refreshSegments],
  );

  // 업로드 핸드오프 — 이 탭이 처리를 소유.
  // 키는 처리가 "끝난 뒤" 지운다: dev 서버의 최초 의존성 최적화 리로드처럼
  // 처리 도중 페이지가 재로드돼도 자동으로 이어서 시작된다
  // (실패 시 status=failed 가 되어 재시작 루프는 생기지 않는다).
  useEffect(() => {
    if (!meeting) return;
    const key = `mn-process-${meeting.id}`;
    if (sessionStorage.getItem(key) && meeting.status === "transcribing" && meeting.audio) {
      startProcessing(meeting, () => sessionStorage.removeItem(key));
    }
  }, [meeting, startProcessing]);

  const onSeek = useCallback((sec: number) => player.seek(sec), [player]);

  const renameSpeaker = useCallback(
    async (speaker: string, name: string) => {
      if (!meeting) return;
      const next = { ...(meeting.speaker_names ?? {}) };
      if (name) next[speaker] = name;
      else delete next[speaker];
      try {
        setMeeting(await updateMeeting(meeting.id, { speaker_names: next }));
      } catch {
        toast.error("화자 이름 저장에 실패했습니다");
      }
    },
    [meeting],
  );

  const regenerate = useCallback(
    async (templateId: string) => {
      if (!meeting || segments.length === 0) {
        toast.error("트랜스크립트가 있어야 회의록을 생성할 수 있습니다");
        return;
      }
      const template = templates.find((t) => t.id === templateId) ?? templates[0];
      if (!template) return;
      setRegenBusy(true);
      setStreamingMd("");
      try {
        const transcriptCtx = buildTranscriptContext(segments, meeting.speaker_names ?? {});
        const attachmentCtx = await collectAttachmentContext(meeting.id);
        const outputLanguage = resolveMeetingOutputLanguage(meeting.language);
        const minutes = await new Promise<string>((resolve, reject) => {
          void generateMinutes(template, transcriptCtx, attachmentCtx, outputLanguage, {
            onChunk: (full) => setStreamingMd(full),
            onDone: resolve,
            onError: reject,
          });
        });
        setMeeting(await updateMeeting(meeting.id, { minutes_md: minutes, template: template.id }));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "회의록 생성에 실패했습니다");
      } finally {
        setRegenBusy(false);
        setStreamingMd(null);
      }
    },
    [meeting, segments, templates],
  );

  const openShare = useCallback(async () => {
    if (!meeting) return;
    setShareOpen(true);
    setShareBusy(true);
    try {
      setShare(await getShareForMeeting(meeting.id));
    } finally {
      setShareBusy(false);
    }
  }, [meeting]);

  const toggleShare = useCallback(async () => {
    if (!meeting) return;
    setShareBusy(true);
    try {
      if (share) {
        await deleteShare(share.id);
        setShare(null);
        toast.success("공유 링크를 해제했습니다");
      } else {
        setShare(await createShare(meeting.id));
      }
    } catch {
      toast.error("공유 설정에 실패했습니다");
    } finally {
      setShareBusy(false);
    }
  }, [meeting, share]);

  const saveMeta = useCallback(async () => {
    if (!meeting) return;
    const participants = metaDraft.participants.split(",").map((s) => s.trim()).filter(Boolean);
    const tags = metaDraft.tags.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      setMeeting(await updateMeeting(meeting.id, { participants, tags }));
    } catch {
      toast.error("저장에 실패했습니다");
    }
  }, [meeting, metaDraft]);

  if (notFound) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">회의를 찾을 수 없습니다</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/">대시보드로</Link>
        </Button>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const busy = processing || regenBusy || meeting.status === "summarizing";
  const attachmentsKey = attachments.map((a) => `${a.id}:${a.status}`).join(",");

  return (
    <div className="mn-grain flex h-dvh flex-col bg-background">
      {/* 헤더 */}
      <header className="flex items-center gap-2.5 border-b border-border bg-card/60 px-4 py-2.5 backdrop-blur">
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => navigate("/")}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        {titleDraft === null ? (
          <button
            type="button"
            className="mn-display min-w-0 truncate text-left text-lg hover:opacity-70"
            onClick={() => setTitleDraft(meeting.title)}
            title="제목 편집"
          >
            {meeting.title || "제목 없는 회의"}
          </button>
        ) : (
          <form
            className="flex min-w-0 flex-1 items-center gap-1.5"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                setMeeting(await updateMeeting(meeting.id, { title: titleDraft.trim() }));
              } catch {
                toast.error("제목 저장에 실패했습니다");
              }
              setTitleDraft(null);
            }}
          >
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => setTitleDraft(null)}
              className="h-8 max-w-md text-sm"
            />
            <Button type="submit" size="icon" className="size-8 shrink-0" onMouseDown={(e) => e.preventDefault()}>
              <CheckIcon className="size-4" />
            </Button>
          </form>
        )}

        <span className="mn-clock hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {new Date(meeting.created).toLocaleDateString("ko-KR")} · {formatClock(meeting.duration)}
        </span>

        {/* 참석자·태그 */}
        <Popover
          onOpenChange={(open) => {
            if (open)
              setMetaDraft({
                participants: meeting.participants.join(", "),
                tags: meeting.tags.join(", "),
              });
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden h-8 gap-1.5 text-xs text-muted-foreground md:flex">
              <UsersIcon className="size-3.5" />
              {meeting.participants.length ? meeting.participants.slice(0, 3).join(", ") : "참석자"}
              {meeting.participants.length > 3 ? ` 외 ${meeting.participants.length - 3}` : ""}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-2 p-3" align="end">
            <div>
              <p className="mb-1 text-xs font-medium">참석자 (쉼표로 구분)</p>
              <Input
                value={metaDraft.participants}
                onChange={(e) => setMetaDraft({ ...metaDraft, participants: e.target.value })}
                placeholder="김철수, 이영희"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium">태그 (쉼표로 구분)</p>
              <Input
                value={metaDraft.tags}
                onChange={(e) => setMetaDraft({ ...metaDraft, tags: e.target.value })}
                placeholder="주간회의, 제품"
                className="h-8 text-sm"
              />
            </div>
            <Button size="sm" className="w-full" onClick={() => void saveMeta()}>
              저장
            </Button>
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => void openShare()}>
            <Link2Icon className="size-3.5" />
            공유
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive">
                <Trash2Icon className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>회의를 삭제할까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  오디오·트랜스크립트·회의록·첨부가 모두 삭제되며 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    await deleteMeeting(meeting.id).catch(() => toast.error("삭제에 실패했습니다"));
                    navigate("/", { replace: true });
                  }}
                >
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* 처리 상태 배너 */}
      {processing || meeting.status === "transcribing" || meeting.status === "failed" ? (
        <div
          className={`flex items-center gap-2.5 border-b px-4 py-2 text-sm ${
            meeting.status === "failed" && !processing
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-border bg-secondary/60 text-secondary-foreground"
          }`}
        >
          {processing ? (
            <>
              <Loader2Icon className="size-4 shrink-0 animate-spin" />
              <span className="font-medium">{stage ? STAGE_LABEL[stage] : "처리 중"}</span>
              {progress ? (
                <span className="text-xs opacity-80">
                  {progress.kind === "download"
                    ? `모델 다운로드 ${progress.percent >= 0 ? `${progress.percent}%` : ""} (${progress.detail})`
                    : progress.percent >= 0
                      ? `${progress.percent}%`
                      : progress.detail}
                </span>
              ) : null}
              <span className="ml-auto text-xs opacity-70">이 탭을 닫지 마세요</span>
            </>
          ) : meeting.status === "failed" ? (
            <>
              <TriangleAlertIcon className="size-4 shrink-0" />
              <span className="min-w-0 truncate">{meeting.error || "처리에 실패했습니다"}</span>
              {meeting.audio ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto h-7 shrink-0 text-xs"
                  onClick={() => startProcessing(meeting)}
                >
                  다시 시도
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <PlayIcon className="size-4 shrink-0" />
              <span>전사가 아직 시작되지 않았습니다.</span>
              {meeting.audio ? (
                <Button
                  size="sm"
                  className="ml-auto h-7 shrink-0 text-xs"
                  onClick={() => startProcessing(meeting)}
                >
                  이 브라우저에서 전사 시작
                </Button>
              ) : (
                <span className="ml-auto text-xs opacity-70">오디오가 없어 진행할 수 없습니다</span>
              )}
            </>
          )}
        </div>
      ) : null}

      {/* 본문 */}
      <main className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="mn-card min-h-0 overflow-hidden">
          <MinutesPanel
            meeting={meeting}
            templates={templates}
            streamingMd={streamingMd}
            busy={busy}
            onSeek={onSeek}
            onRegenerate={(templateId) => void regenerate(templateId)}
            onSaveMinutes={async (md) => {
              setMeeting(await updateMeeting(meeting.id, { minutes_md: md }));
            }}
            onSaveNotes={async (notes) => {
              await updateMeeting(meeting.id, { my_notes: notes });
            }}
            onManageTemplates={() => setTemplateDialog(true)}
          />
        </section>

        <section className="mn-card min-h-0 overflow-hidden">
          <Tabs defaultValue="transcript" className="flex h-full min-h-0 flex-col gap-0">
            <TabsList className="m-2 mb-0 grid w-auto grid-cols-3">
              <TabsTrigger value="transcript" className="gap-1 text-xs">
                <ScrollTextIcon className="size-3.5" />
                트랜스크립트
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-1 text-xs">
                <MessageSquareTextIcon className="size-3.5" />
                AI 채팅
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-1 text-xs">
                <PaperclipIcon className="size-3.5" />
                자료 {attachments.length ? `(${attachments.length})` : ""}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="transcript" className="mt-0 min-h-0 flex-1">
              <TranscriptPanel
                segments={segments}
                speakerNames={meeting.speaker_names ?? {}}
                currentTime={player.currentTime}
                playing={player.playing}
                onSeek={onSeek}
                onRenameSpeaker={(s, n) => void renameSpeaker(s, n)}
              />
            </TabsContent>
            <TabsContent value="chat" className="mt-0 min-h-0 flex-1">
              <ChatPanel
                meeting={meeting}
                segments={segments}
                attachmentsKey={attachmentsKey}
                onSeek={onSeek}
              />
            </TabsContent>
            <TabsContent value="files" className="mt-0 min-h-0 flex-1">
              <AttachmentsPanel meeting={meeting} attachments={attachments} onChanged={refreshAttachments} />
            </TabsContent>
          </Tabs>
        </section>
      </main>

      {/* 하단 플레이어 */}
      {meeting.audio ? (
        <div className="px-3 pb-3">
          <AudioPlayerBar player={player} downloadUrl={audioUrl} downloadName={`${meeting.title || "meeting"}-audio`} />
        </div>
      ) : null}

      {/* 공유 다이얼로그 */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="mn-display">회의록 공유</DialogTitle>
            <DialogDescription>
              링크를 아는 사람은 누구나 <strong>회의록 렌더 결과만</strong> 볼 수 있습니다
              (트랜스크립트·오디오·채팅은 비공개).
            </DialogDescription>
          </DialogHeader>
          {shareBusy ? (
            <div className="flex justify-center py-4">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : share ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Input readOnly value={shareUrl(share.token)} className="h-9 text-xs" />
                <Button
                  size="icon"
                  className="size-9 shrink-0"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(shareUrl(share.token))
                      .then(() => toast.success("링크를 복사했습니다"))
                  }
                >
                  <CopyIcon className="size-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => void toggleShare()}>
                <Link2OffIcon className="size-3.5" />
                공유 해제
              </Button>
            </div>
          ) : (
            <Button className="w-full gap-1.5" onClick={() => void toggleShare()} disabled={!meeting.minutes_md}>
              <Link2Icon className="size-4" />
              {meeting.minutes_md ? "공유 링크 만들기" : "회의록이 준비되면 공유할 수 있습니다"}
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <TemplateDialog
        open={templateDialog}
        onOpenChange={setTemplateDialog}
        templates={templates}
        onChanged={() => void ensureTemplates().then(setTemplates)}
      />

      {/* 상태 배지 (헤더 아래 우측 고정 대신 문서 상태로 노출) */}
      {meeting.status === "summarizing" && !processing && !regenBusy ? (
        <div className="pointer-events-none fixed bottom-20 left-1/2 -translate-x-1/2">
          <Badge variant="secondary" className="gap-1.5 shadow-md">
            <Loader2Icon className="size-3 animate-spin" />
            회의록 작성 중
          </Badge>
        </div>
      ) : null}
    </div>
  );
}

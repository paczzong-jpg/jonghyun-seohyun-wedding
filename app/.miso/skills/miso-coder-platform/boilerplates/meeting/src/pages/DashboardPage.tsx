import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileAudioIcon,
  LayoutTemplateIcon,
  Loader2Icon,
  MicIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TemplateDialog } from "@/components/meeting/template-dialog";
import { APP_NAME, APP_TAGLINE, resolveBrowserTranscriptLanguage } from "@/lib/meeting-config";
import { formatClock } from "@/lib/meeting/audio";
import {
  createMeeting,
  ensureTemplates,
  listMeetings,
  searchMeetingContent,
  subscribeMeetings,
} from "@/lib/meeting/db";
import { markForProcessing } from "@/pages/MeetingPage";
import { useTheme } from "@/lib/meeting/use-theme";
import type { Meeting, MinutesTemplate } from "@/lib/meeting/types";

// ────────────────────────────────────────────────
// 대시보드 — 회의 라이브러리.
// 전역 검색은 제목·참석자·태그(로컬) + 트랜스크립트·회의록 본문(PB)을 함께 훑는다.
// PB realtime 구독으로 다른 탭의 처리 상태가 실시간 반영된다.
// ────────────────────────────────────────────────

function StatusBadge({ meeting }: { meeting: Meeting }) {
  if (meeting.status === "ready") return null;
  if (meeting.status === "failed") {
    return (
      <Badge variant="destructive" className="h-5 gap-1 px-1.5 text-[10px]">
        <TriangleAlertIcon className="size-3" />
        실패
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
      <Loader2Icon className="size-3 animate-spin" />
      {meeting.status === "transcribing" ? "전사 중" : "회의록 작성 중"}
    </Badge>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [templates, setTemplates] = useState<MinutesTemplate[]>([]);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [query, setQuery] = useState("");
  const [contentHits, setContentHits] = useState<Map<string, string>>(new Map());
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    listMeetings()
      .then(setMeetings)
      .catch(() => toast.error("회의 목록을 불러오지 못했습니다"));
  }, []);

  useEffect(() => {
    refresh();
    ensureTemplates().then(setTemplates).catch(() => undefined);
  }, [refresh]);

  // 다른 탭의 상태 변화 실시간 반영 (과도한 refetch 방지 위해 짧게 디바운스)
  useEffect(() => {
    let timer = 0;
    const unsubscribe = subscribeMeetings(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, 300);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [refresh]);

  // 본문 검색 (디바운스)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setContentHits(new Map());
      return;
    }
    const timer = window.setTimeout(() => {
      searchMeetingContent(q)
        .then((hits) => setContentHits(new Map(hits.map((h) => [h.meetingId, h.snippet]))))
        .catch(() => undefined);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const visible = useMemo(() => {
    if (!meetings) return [];
    const q = query.trim().toLowerCase();
    if (!q) return meetings;
    return meetings.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.participants.some((p) => p.toLowerCase().includes(q)) ||
        m.tags.some((t) => t.toLowerCase().includes(q)) ||
        contentHits.has(m.id),
    );
  }, [meetings, query, contentHits]);

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const meeting = await createMeeting({
          title: file.name.replace(/\.[^.]+$/, ""),
          language: resolveBrowserTranscriptLanguage(),
          origin: "upload",
          template: templates[0]?.id ?? "",
          audio: file,
          audioName: file.name,
        });
        markForProcessing(meeting.id);
        navigate(`/meeting/${meeting.id}`);
      } catch {
        toast.error("업로드에 실패했습니다");
        setUploading(false);
      }
    },
    [navigate, templates],
  );

  return (
    <div className="mn-grain min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl px-5 pb-16">
        {/* 헤더 */}
        <header className="flex items-center gap-3 py-6">
          <h1 className="mn-display text-2xl tracking-tight">{APP_NAME}</h1>
          <span className="mt-1 hidden text-xs text-muted-foreground sm:inline">{APP_TAGLINE}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground"
              onClick={() => setTemplateDialog(true)}
            >
              <LayoutTemplateIcon className="size-3.5" />
              템플릿
            </Button>
            <Button variant="ghost" size="icon" className="size-8" onClick={toggle} title="다크모드">
              {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
            </Button>
          </div>
        </header>

        {/* CTA */}
        <section className="mn-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h2 className="mn-display text-lg">회의를 기록하세요</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              음성은 브라우저 안에서만 처리됩니다 — 서버로 전송되지 않습니다.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="lg" className="gap-2" onClick={() => navigate("/record")}>
              <MicIcon className="size-4" />
              새 회의 녹음
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              disabled={uploading}
              onClick={() => uploadRef.current?.click()}
            >
              {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <FileAudioIcon className="size-4" />}
              오디오 업로드
            </Button>
            <input
              ref={uploadRef}
              type="file"
              accept="audio/*,video/webm,.m4a,.mp3,.wav,.ogg,.webm"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
          </div>
        </section>

        {/* 검색 */}
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-input bg-card px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·참석자·태그·회의 내용 검색"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* 목록 */}
        {meetings === null ? (
          <div className="flex justify-center py-16">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {query ? "검색 결과가 없습니다" : "첫 회의를 녹음하거나 오디오를 업로드해보세요"}
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {visible.map((meeting) => {
              const snippet = contentHits.get(meeting.id);
              return (
                <li key={meeting.id}>
                  <button
                    type="button"
                    className="mn-card group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-shadow hover:shadow-[var(--mn-shadow-pop)]"
                    onClick={() => navigate(`/meeting/${meeting.id}`)}
                  >
                    <span
                      className="h-10 w-1 shrink-0 rounded-full"
                      style={{ background: meeting.color || "var(--color-primary)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="mn-display truncate text-[15px] group-hover:text-primary">
                        {meeting.title || "제목 없는 회의"}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="mn-clock">
                          {new Date(meeting.created).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            weekday: "short",
                          })}
                        </span>
                        {meeting.duration > 0 ? (
                          <span className="mn-clock">{formatClock(meeting.duration)}</span>
                        ) : null}
                        {meeting.participants.length > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <UsersIcon className="size-3" />
                            {meeting.participants.length}
                          </span>
                        ) : null}
                        {meeting.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full bg-muted px-1.5 py-px text-[10px]">
                            {tag}
                          </span>
                        ))}
                      </p>
                      {snippet ? (
                        <p className="mt-1 truncate text-xs text-muted-foreground">…{snippet}…</p>
                      ) : null}
                    </div>
                    <StatusBadge meeting={meeting} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <TemplateDialog
        open={templateDialog}
        onOpenChange={setTemplateDialog}
        templates={templates}
        onChanged={() => void ensureTemplates().then(setTemplates)}
      />
    </div>
  );
}

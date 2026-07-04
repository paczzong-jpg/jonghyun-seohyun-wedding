import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2Icon } from "lucide-react";

import { Markdown } from "@/components/meeting/markdown";
import { APP_NAME } from "@/lib/meeting-config";
import { formatClock } from "@/lib/meeting/audio";
import { getMeetingByShareToken } from "@/lib/meeting/db";
import type { Meeting } from "@/lib/meeting/types";

// ────────────────────────────────────────────────
// 공유 뷰 — 회의록 렌더 결과만 보여준다 (앱 크롬·트랜스크립트·오디오 없음).
// 타임스탬프 칩은 재생 대상이 없으므로 비활성 표시로만 남는다.
// ────────────────────────────────────────────────

export function SharePage() {
  const { token = "" } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    getMeetingByShareToken(token)
      .then((m) => {
        if (m) {
          setMeeting(m);
          setState("ready");
        } else {
          setState("missing");
        }
      })
      .catch(() => setState("missing"));
  }, [token]);

  if (state === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === "missing" || !meeting) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-background p-6 text-center">
        <p className="mn-display text-xl">공유가 만료되었거나 존재하지 않습니다</p>
        <p className="text-sm text-muted-foreground">링크를 다시 확인해주세요.</p>
      </div>
    );
  }

  return (
    <div className="mn-grain min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <header className="border-b border-border pb-6">
          <p className="text-xs font-medium tracking-widest text-primary uppercase">{APP_NAME}</p>
          <h1 className="mn-display mt-2 text-3xl leading-snug">
            {meeting.title || "제목 없는 회의"}
          </h1>
          <p className="mn-clock mt-2 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
            <span>
              {new Date(meeting.created).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </span>
            {meeting.duration > 0 ? <span>{formatClock(meeting.duration)}</span> : null}
            {meeting.participants.length > 0 ? <span>{meeting.participants.join(" · ")}</span> : null}
          </p>
        </header>

        <main className="py-8">
          {meeting.minutes_md ? (
            <Markdown>{meeting.minutes_md}</Markdown>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              공유된 회의록이 아직 준비되지 않았습니다.
            </p>
          )}
        </main>

        <footer className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
          {APP_NAME} 로 작성된 회의록입니다
        </footer>
      </div>
    </div>
  );
}

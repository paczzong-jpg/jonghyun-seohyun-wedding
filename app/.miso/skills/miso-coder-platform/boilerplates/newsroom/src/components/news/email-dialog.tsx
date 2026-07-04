import { useEffect, useState } from "react";
import { Loader2, Copy, ClipboardType, Download, FileCode2, RefreshCw, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateEmailBrief } from "@/lib/news/llm";
import {
  renderEmailHtml,
  renderEmailText,
  copyRichEmail,
  copyPlain,
  buildEml,
  buildStandaloneHtml,
  downloadBlob,
} from "@/lib/news/email";
import { APP_NAME } from "@/lib/news-config";
import { kstDay } from "@/lib/news/normalize";
import type { Article, Cluster, CitationRef, EmailBrief, Settings } from "@/lib/news/types";

// ────────────────────────────────────────────────
// 이메일 브리핑 다이얼로그 — LLM(EmailBrief JSON) → 결정적 HTML 렌더 → 미리보기 + 내보내기.
//   · 리치 복사(Gmail/Outlook 붙여넣기) · 텍스트 복사 · .eml 초안 · standalone HTML
//   · LLM은 HTML을 만들지 않는다(email.ts 렌더러가 조립). 전송은 하지 않고 본문만 생성.
// ────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusters: Cluster[];
  articles: Article[];
  settings: Settings;
  keywords: string[];
}

export function EmailDialog({ open, onOpenChange, clusters, articles, settings, keywords }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ email: EmailBrief; refs: CitationRef[] } | null>(null);
  const day = kstDay();

  async function generate() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      const out = await generateEmailBrief(clusters, articles, {
        tone: settings.tone,
        audience: settings.audience,
        keywords,
        appName: APP_NAME,
      });
      setResult(out);
    } catch (err) {
      toast.error((err as Error).message || "이메일 본문 생성에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  // 열릴 때 1회 생성 (닫으면 결과 유지 — 재열람 시 재생성 안 함)
  useEffect(() => {
    if (open && !result && !loading) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const html = result ? renderEmailHtml({ email: result.email, refs: result.refs, appName: APP_NAME, day }) : "";
  const text = result ? renderEmailText({ email: result.email, refs: result.refs, appName: APP_NAME, day }) : "";
  const subject = result?.email.subject || `${APP_NAME} · ${day}`;
  const fileBase = `${APP_NAME}-${day}`;

  async function onCopyRich() {
    const ok = await copyRichEmail(html, text);
    ok ? toast.success("서식 포함으로 복사했어요. 메일 창에 붙여넣으세요.") : toast.error("복사에 실패했어요.");
  }
  async function onCopyText() {
    const ok = await copyPlain(text);
    ok ? toast.success("텍스트를 복사했어요.") : toast.error("복사에 실패했어요.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-[var(--nw-hairline)] px-5 py-4">
          <DialogTitle className="nw-serif flex items-center gap-2 text-xl">
            <Mail className="size-5 text-[var(--nw-accent)]" />
            이메일 브리핑
          </DialogTitle>
          <DialogDescription>
            오늘의 주요 뉴스를 메일 본문으로 만들어요. 서식 그대로 복사하거나 초안 파일로 내려받으세요.
          </DialogDescription>
        </DialogHeader>

        {/* 미리보기 */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--nw-surface-2)] p-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-20 text-[var(--nw-ink-2)]">
              <Loader2 className="size-5 animate-spin" /> 이메일 본문을 작성하는 중…
            </div>
          )}
          {!loading && !result && (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-[var(--nw-ink-2)]">
              <p className="nw-meta">생성된 본문이 없어요.</p>
              <Button variant="outline" size="sm" onClick={generate}>
                <RefreshCw className="mr-1.5 size-4" /> 다시 생성
              </Button>
            </div>
          )}
          {!loading && result && (
            // email.ts 는 전 요소 inline-style 의 결정적 렌더(텍스트는 esc 처리) — 신뢰 가능한 자체 HTML
            <div className="mx-auto" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>

        {/* 액션 바 */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--nw-hairline)] bg-[var(--nw-surface)] px-5 py-3">
          <Button onClick={onCopyRich} disabled={!result || loading}>
            <Copy className="mr-1.5 size-4" /> 서식 복사
          </Button>
          <Button variant="secondary" onClick={onCopyText} disabled={!result || loading}>
            <ClipboardType className="mr-1.5 size-4" /> 텍스트 복사
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadBlob(buildEml(subject, html), `${fileBase}.eml`)}
            disabled={!result || loading}
          >
            <Download className="mr-1.5 size-4" /> .eml 초안
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadBlob(buildStandaloneHtml(subject, html), `${fileBase}.html`)}
            disabled={!result || loading}
          >
            <FileCode2 className="mr-1.5 size-4" /> HTML 저장
          </Button>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={generate} disabled={loading} aria-label="다시 생성">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

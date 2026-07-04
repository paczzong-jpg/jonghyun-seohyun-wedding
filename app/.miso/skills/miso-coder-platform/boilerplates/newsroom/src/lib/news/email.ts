import type { CitationRef, EmailBrief } from "./types";

// ────────────────────────────────────────────────
// 이메일 본문 — LLM JSON(EmailBrief) → paste-safe HTML.
// 원칙(리서치 확정): LLM은 HTML을 만들지 않는다. 결정적 렌더러가 조립한다.
//  · 테이블 레이아웃 + 전 요소 inline style + 600px + hex 리터럴
//  · <style>·클래스·CSS변수 금지 (Gmail 붙여넣기에서 유실)
//  · word-break:keep-all, <90KB (Gmail 102KB 클리핑 마진)
// ────────────────────────────────────────────────

// 웜페이퍼 팔레트 (디자인 A안, 이메일은 라이트 고정)
const C = {
  bg: "#FAF6EF",
  surface: "#FFFDF9",
  ink: "#262119",
  ink2: "#6B6257",
  hairline: "#E8E0D2",
  accent: "#0D7680",
  live: "#990F3D",
};
const FONT = `'Apple SD Gothic Neo','Malgun Gothic',AppleGothic,-apple-system,sans-serif`;

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** [n] 마커를 위첨자 각주 번호로 (이메일엔 칩이 없으므로 sup) */
function marks(citations: number[]): string {
  if (!citations || citations.length === 0) return "";
  const nums = citations.map((n) => `<sup style="color:${C.accent};font-size:11px;">[${n}]</sup>`).join("");
  return ` ${nums}`;
}

function cell(inner: string, padding = "0 28px"): string {
  return `<tr><td style="padding:${padding};font-family:${FONT};color:${C.ink};word-break:keep-all;overflow-wrap:break-word;">${inner}</td></tr>`;
}

function hr(): string {
  return `<tr><td style="padding:0 28px;"><div style="border-top:1px solid ${C.hairline};height:1px;line-height:1px;font-size:0;">&nbsp;</div></td></tr>`;
}

export interface EmailRenderInput {
  email: EmailBrief;
  refs: CitationRef[];
  appName: string;
  day: string;
}

/** paste-safe HTML fragment (table) */
export function renderEmailHtml({ email, refs, appName, day }: EmailRenderInput): string {
  const rows: string[] = [];

  // 마스트헤드
  rows.push(
    cell(
      `<div style="font-family:${FONT};font-size:13px;letter-spacing:0.08em;color:${C.ink2};text-transform:uppercase;">${esc(appName)} · ${esc(day)}</div>`,
      "28px 28px 4px",
    ),
  );
  // preheader (프리뷰 텍스트)
  if (email.preheader) {
    rows.push(cell(`<div style="font-size:14px;color:${C.ink2};line-height:1.6;">${esc(email.preheader)}</div>`, "0 28px 8px"));
  }
  // intro
  if (email.intro) {
    rows.push(cell(`<p style="margin:12px 0 4px;font-size:16px;line-height:1.7;color:${C.ink};"><strong>오늘의 요약</strong><br>${esc(email.intro)}</p>`));
  }
  rows.push(hr());

  // 톱 스토리
  for (const story of email.top_stories ?? []) {
    const bullets = (story.bullets ?? []).length
      ? `<ul style="margin:8px 0 0;padding-left:20px;">${story.bullets
          .map((b) => `<li style="font-size:15px;line-height:1.65;color:${C.ink2};margin:2px 0;">${esc(b)}</li>`)
          .join("")}</ul>`
      : "";
    rows.push(
      cell(
        `<h2 style="margin:18px 0 6px;font-size:20px;line-height:1.35;color:${C.ink};">${esc(story.headline)}</h2>` +
          `<p style="margin:0 0 8px;font-size:16px;line-height:1.7;color:${C.ink};">${esc(story.what)}${marks(story.citations)}</p>` +
          `<p style="margin:0;font-size:15px;line-height:1.65;color:${C.accent};"><strong>왜 중요해:</strong> ${esc(story.why_it_matters)}</p>` +
          bullets,
      ),
    );
  }

  // 짧게 볼 뉴스
  if ((email.shorts ?? []).length) {
    rows.push(hr());
    rows.push(cell(`<h3 style="margin:16px 0 6px;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:${C.ink2};">짧게 볼 뉴스</h3>`));
    const items = email.shorts
      .map((s) => `<li style="font-size:15px;line-height:1.7;color:${C.ink};margin:4px 0;">${esc(s.line)}${marks(s.citations)}</li>`)
      .join("");
    rows.push(cell(`<ul style="margin:0;padding-left:20px;">${items}</ul>`));
  }

  // 클로징
  if (email.closing) {
    rows.push(cell(`<p style="margin:16px 0 0;font-size:15px;color:${C.ink2};line-height:1.65;">${esc(email.closing)}</p>`));
  }

  // 인용 각주 목록 (이메일엔 칩이 없으므로 명시적 출처 섹션)
  if (refs.length) {
    rows.push(hr());
    rows.push(cell(`<h3 style="margin:16px 0 6px;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:${C.ink2};">이 브리핑에 인용된 기사</h3>`));
    const list = refs
      .map(
        (r) =>
          `<div style="font-size:13px;line-height:1.6;color:${C.ink2};margin:3px 0;">[${r.n}] <a href="${esc(r.url)}" style="color:${C.accent};text-decoration:none;">${esc(r.title)}</a> — ${esc(r.source_name || "")}</div>`,
      )
      .join("");
    rows.push(cell(list, "0 28px 24px"));
  }

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;background-color:${C.surface};border:1px solid ${C.hairline};border-radius:8px;">` +
    rows.join("") +
    `</table>`
  );
}

/** 붙여넣기 폴백용 plain text */
export function renderEmailText({ email, refs, appName, day }: EmailRenderInput): string {
  const lines: string[] = [`[${appName}] ${day}`, ""];
  if (email.intro) lines.push(`오늘의 요약: ${email.intro}`, "");
  for (const s of email.top_stories ?? []) {
    lines.push(`■ ${s.headline}`, s.what, `  왜 중요해: ${s.why_it_matters}`);
    for (const b of s.bullets ?? []) lines.push(`  - ${b}`);
    lines.push("");
  }
  if ((email.shorts ?? []).length) {
    lines.push("짧게 볼 뉴스");
    for (const s of email.shorts) lines.push(`- ${s.line}`);
    lines.push("");
  }
  if (email.closing) lines.push(email.closing, "");
  if (refs.length) {
    lines.push("인용된 기사");
    for (const r of refs) lines.push(`[${r.n}] ${r.title} — ${r.source_name} ${r.url}`);
  }
  return lines.join("\n");
}

// ── 클립보드 (text/html + text/plain 이중 flavor) ──

export async function copyRichEmail(html: string, text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && "write" in navigator.clipboard && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
  } catch {
    /* 폴백으로 진행 */
  }
  // execCommand 폴백 — 렌더된 rich text 를 선택해 복사 (구형 포함)
  try {
    const holder = document.createElement("div");
    holder.setAttribute("contenteditable", "true");
    holder.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
    holder.innerHTML = html;
    document.body.appendChild(holder);
    const range = document.createRange();
    range.selectNodeContents(holder);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    const ok = document.execCommand("copy");
    sel?.removeAllRanges();
    document.body.removeChild(holder);
    return ok;
  } catch {
    return false;
  }
}

export async function copyPlain(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ── .eml 다운로드 (X-Unsent 편집 가능 초안) ──

/** RFC2047 Q-encoding (제목 UTF-8) */
function encodeSubject(subject: string): string {
  const b64 = btoa(unescape(encodeURIComponent(subject)));
  return `=?UTF-8?B?${b64}?=`;
}

export function buildEml(subject: string, html: string): Blob {
  const eml = [
    "X-Unsent: 1",
    `Subject: ${encodeSubject(subject)}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light"></head><body style="margin:0;background-color:${C.bg};padding:24px 0;">${html}</body></html>`,
  ].join("\r\n");
  return new Blob([eml], { type: "message/rfc822" });
}

/** standalone .html (사내 포털 게시·아카이브) */
export function buildStandaloneHtml(subject: string, html: string): Blob {
  const page = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head><body style="margin:0;background-color:${C.bg};padding:24px 12px;">${html}</body></html>`;
  return new Blob([page], { type: "text/html" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

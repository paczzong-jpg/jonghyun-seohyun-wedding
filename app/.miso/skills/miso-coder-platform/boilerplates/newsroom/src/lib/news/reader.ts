import DOMPurify from "dompurify";
import type { ReaderStatus } from "./types";
import { fetchBytes, bytesToDoc } from "./ingest";

// ────────────────────────────────────────────────
// 리더 모드 — 원문 HTML → Readability 전문 추출 → DOMPurify 정제.
// DOMPurify 는 리더 뷰가 동기 렌더에 쓰므로 정적 import(어차피 메인 번들).
// Readability 만 extractReader 시점에 dynamic import(초기 번들 무관).
// ────────────────────────────────────────────────

export interface ReaderResult {
  status: ReaderStatus;
  html: string;
  text: string;
  title: string;
  byline: string;
}

/** 페이월·봇차단·SPA 감지 휴리스틱 */
function detectBlock(doc: Document, upstreamStatus: number): ReaderStatus | null {
  if (upstreamStatus === 403 || upstreamStatus === 503 || upstreamStatus === 429) return "blocked";
  const title = (doc.title || "").toLowerCase();
  if (title.includes("just a moment") || doc.documentElement.innerHTML.includes("cf-chl")) return "blocked";

  // JSON-LD isAccessibleForFree:false — 페이월 최고 신뢰 신호
  for (const el of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    if (/"isAccessibleForFree"\s*:\s*(false|"False")/i.test(el.textContent || "")) return "blocked";
  }
  const bodyHtml = doc.body?.innerHTML || "";
  if (/\b(paywall|meteredContent|tp-modal|piano|regwall|subscriber-only)\b/i.test(bodyHtml)) return "blocked";

  // SPA — 스크립트만 있고 본문 텍스트가 거의 없음
  if ((doc.body?.textContent || "").trim().length < 400 && doc.scripts.length > 8) return "unavailable";
  return null;
}

/** lazy 이미지 src 승격 (한국 CMS 변종) */
function promoteLazyImages(root: Document) {
  for (const img of Array.from(root.querySelectorAll("img"))) {
    const lazy = img.getAttribute("data-src") || img.getAttribute("data-original") || img.getAttribute("data-lazy-src") || img.getAttribute("data-echo");
    if (lazy && !img.getAttribute("src")) img.setAttribute("src", lazy);
  }
}

/**
 * 원문 크롤 + 전문 추출.
 * 실패 사다리: 전문 추출 → content:encoded → description 은 호출부(collect/UI)가 처리.
 * 여기서는 크롤·추출·정제까지만 담당하고 상태를 명확히 반환.
 */
export async function extractReader(url: string, timeoutMs = 15_000): Promise<ReaderResult> {
  const { Readability, isProbablyReaderable } = await import("@mozilla/readability");

  const { buf, contentType, status } = await fetchBytes(url, timeoutMs);
  if (status >= 400) return { status: status === 403 || status === 429 ? "blocked" : "unavailable", html: "", text: "", title: "", byline: "" };

  const html = bytesToDoc(buf, contentType);
  const doc = new DOMParser().parseFromString(html, "text/html");

  const blocked = detectBlock(doc, status);
  if (blocked) return { status: blocked, html: "", text: "", title: "", byline: "" };

  // <base> 주입 — DOMParser 문서는 baseURI 가 SPA origin 이라 상대 링크/이미지가 깨진다
  if (!doc.querySelector("base")) {
    const base = doc.createElement("base");
    base.href = url;
    doc.head?.insertBefore(base, doc.head.firstChild);
  }
  promoteLazyImages(doc);

  // CJK 는 정보밀도가 높아 minContentLength 하향
  const readerable = isProbablyReaderable(doc, { minContentLength: 80 });

  const article = new Readability(doc.cloneNode(true) as Document, { charThreshold: 300 }).parse();
  if (!article || (article.textContent || "").trim().length < 200) {
    return { status: readerable ? "partial" : "feed-only", html: "", text: "", title: article?.title || "", byline: article?.byline || "" };
  }

  const clean = DOMPurify.sanitize(article.content, {
    ALLOWED_TAGS: [
      "p", "a", "b", "strong", "i", "em", "u", "s", "blockquote", "q", "cite", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "img", "figure", "figcaption", "picture", "source", "br", "hr",
      "table", "thead", "tbody", "tr", "td", "th", "pre", "code", "span", "div", "sup", "sub", "mark", "time",
    ],
    ALLOWED_ATTR: ["href", "src", "srcset", "sizes", "alt", "title", "width", "height", "colspan", "rowspan", "datetime"],
    FORBID_TAGS: ["style", "svg", "math", "form", "input", "iframe", "video", "audio", "script"],
    ALLOWED_URI_REGEXP: /^(?:https?:|data:image\/)/i,
  });

  return {
    status: "full",
    html: clean,
    text: (article.textContent || "").replace(/\s+/g, " ").trim(),
    title: article.title || "",
    byline: article.byline || "",
  };
}

/** 렌더 직전 sanitize 훅 설정 (target/rel, lazy, no-referrer). 앱 부팅 시 1회 호출 */
export function configureSanitizer() {
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    const el = node as Element;
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer nofollow");
    }
    if (el.tagName === "IMG") {
      el.setAttribute("loading", "lazy");
      el.setAttribute("referrerpolicy", "no-referrer");
    }
  });
}

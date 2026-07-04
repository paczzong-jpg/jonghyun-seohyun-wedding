import type { FeedItem, ParsedFeed } from "./types";
import { htmlToText } from "./normalize";

// ────────────────────────────────────────────────
// 피드 인제스트 — fetch(플랫폼 프록시 경유) → charset 감지/디코드 → RSS/Atom/RDF 파싱.
// 외부 요청은 반드시 브라우저 plain fetch — 플랫폼 인터셉터가 __external 프록시로 보낸다.
// 프록시 경로를 하드코딩하거나 CORS 우회를 추가하지 말 것.
// ────────────────────────────────────────────────

export class FetchError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

/** 외부 URL fetch → 무손실 바이트 + Content-Type (charset 판단은 바이트 기준) */
export async function fetchBytes(
  url: string,
  timeoutMs: number,
): Promise<{ buf: ArrayBuffer; contentType: string; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const buf = await response.arrayBuffer();
    return {
      buf,
      contentType: response.headers.get("content-type") ?? "",
      status: response.status,
    };
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new FetchError("응답 시간 초과");
    throw new FetchError(err instanceof Error ? err.message : "요청 실패");
  } finally {
    clearTimeout(timer);
  }
}

// ── charset ─────────────────────────────────────

/** BOM → HTTP 헤더 → XML 선언/meta 순서로 charset 감지 */
export function detectCharset(buf: ArrayBuffer, headerContentType: string): string {
  const b = new Uint8Array(buf);
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return "utf-8";
  if (b[0] === 0xff && b[1] === 0xfe) return "utf-16le";
  if (b[0] === 0xfe && b[1] === 0xff) return "utf-16be";
  const m1 = /charset=["']?([\w-]+)/i.exec(headerContentType);
  if (m1) return m1[1];
  const head = new TextDecoder("latin1").decode(b.slice(0, 1024));
  const m2 =
    /<\?xml[^>]*encoding=["']([^"']+)["']/i.exec(head) ||
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(head);
  return m2 ? m2[1] : "utf-8";
}

/**
 * 선언이 거짓말하는 피드가 실존하므로 fatal 디코드 캐스케이드로 방어.
 * cp949/ms949는 TextDecoder 유효 라벨이 아님 — euc-kr로 수동 매핑.
 */
export function decodeSmart(buf: ArrayBuffer, label: string): string {
  const alias: Record<string, string> = { cp949: "euc-kr", ms949: "euc-kr", "x-windows-949": "euc-kr" };
  const norm = alias[label.toLowerCase()] ?? label ?? "utf-8";
  try {
    return new TextDecoder(norm, { fatal: true }).decode(buf);
  } catch {
    /* 라벨 오류·선언 거짓말 → 재감지 */
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("euc-kr").decode(buf); // 한국 컨텍스트 최종 폴백
  }
}

export function bytesToDoc(buf: ArrayBuffer, contentType: string): string {
  return decodeSmart(buf, detectCharset(buf, contentType));
}

// ── 날짜 다형 파서 ───────────────────────────────

/** RFC822 타임존 약어 — 스펙 보장은 GMT/UT/Z뿐, 'KST'는 Invalid Date가 된다 */
const TZ_ABBR: Record<string, string> = {
  KST: "+0900", JST: "+0900", GMT: "+0000", UT: "+0000", UTC: "+0000",
  EST: "-0500", EDT: "-0400", PST: "-0800", PDT: "-0700",
  CST: "-0600", CDT: "-0500", CET: "+0100", CEST: "+0200",
};

/**
 * 실측된 한국 피드 날짜 변형을 전부 흡수한다:
 * RFC822(+0900/UTC/약어) · ISO8601 · "YYYY-MM-DD HH:MM:SS"(TZ 없음→KST) ·
 * "YYYY.MM.DD" · 월 풀네임("03 July 2026") · 쉼표 뒤 공백 누락("Fri,3 Jul").
 */
export function parseFeedDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;

  s = s.replace(/,(?=\S)/, ", "); // "Fri,3 Jul" → "Fri, 3 Jul"
  s = s.replace(/\b([A-Z]{2,4})\b\s*$/, (m, abbr: string) => TZ_ABBR[abbr] ?? m);

  // ISO 계열
  let m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?\s*(Z|[+-]\d{2}:?\d{2})?$/);
  if (m) {
    const [, y, mo, d, h = "0", mi = "0", se = "0", tz] = m;
    const pad = (v: string) => v.padStart(2, "0");
    const offset = tz ? (tz === "Z" ? "Z" : tz.includes(":") ? tz : `${tz.slice(0, 3)}:${tz.slice(3)}`) : "+09:00"; // TZ 없으면 한국 소스로 가정
    const date = new Date(`${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(se)}${offset}`);
    return Number.isNaN(date.getTime()) ? null : clampFuture(date);
  }

  // RFC822 계열(월 축약/풀네임 포함) — V8/JSC 모두 관대하게 수용
  const date = new Date(s);
  if (!Number.isNaN(date.getTime())) return clampFuture(date);

  return null;
}

/** 서버 시계가 깨진 피드의 미래 날짜 방어 */
function clampFuture(date: Date): Date {
  const now = Date.now();
  return date.getTime() > now + 60 * 60 * 1000 ? new Date(now) : date;
}

// ── XML 파싱 ────────────────────────────────────

const NS = {
  dc: ["http://purl.org/dc/elements/1.1/"],
  content: ["http://purl.org/rss/1.0/modules/content/"],
  media: [
    "http://search.yahoo.com/mrss/",
    "http://search.yahoo.com/mrss", // 슬래시 없는 변종 실존
    "http://www.rssboard.org/media-rss",
  ],
  atom: ["http://www.w3.org/2005/Atom"],
  rss1: ["http://purl.org/rss/1.0/"],
};

/** 접두사가 아니라 네임스페이스 URI 기준으로 요소를 찾는다 (접두사는 피드마다 제멋대로) */
function nsFirst(el: Element, uris: string[], local: string): Element | null {
  for (const uri of uris) {
    const found = el.getElementsByTagNameNS(uri, local)[0];
    if (found) return found;
  }
  // 네임스페이스 미선언 구형 피드 폴백 — 단 자기 자신 기본 NS 요소와 충돌 없는 경우만 사용처에서 호출
  return null;
}

function directChild(el: Element, name: string): Element | null {
  for (const child of Array.from(el.children)) {
    if (child.localName === name) return child;
  }
  return null;
}

function text(el: Element | null): string {
  return (el?.textContent ?? "").trim();
}

/**
 * XML 파싱 + parsererror 복구 파이프라인 (구형 한국 피드 3대 지뢰):
 * ① 비이스케이프 & ② 불법 제어문자 ③ 미선언 네임스페이스
 */
export function parseXml(xmlText: string): Document | null {
  const parse = (s: string) => {
    const doc = new DOMParser().parseFromString(s, "application/xml");
    return doc.querySelector("parsererror") ? null : doc;
  };
  let doc = parse(xmlText);
  if (doc) return doc;

  let repaired = xmlText
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&(?!(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][\w]*);)/g, "&amp;");
  doc = parse(repaired);
  if (doc) return doc;

  const rootMatch = repaired.match(/<(rss|rdf:RDF|feed)([^>]*)>/);
  if (rootMatch && !/xmlns:content/.test(rootMatch[2])) {
    repaired = repaired.replace(
      rootMatch[0],
      `<${rootMatch[1]}${rootMatch[2]} xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">`,
    );
    doc = parse(repaired);
  }
  return doc;
}

/** RSS <link>는 텍스트 없는 <atom:link rel=self>를 먼저 집는 고전 버그가 있다 — 텍스트 있는 것만 */
function rssLink(item: Element): string {
  for (const child of Array.from(item.children)) {
    if (child.localName !== "link") continue;
    const value = (child.textContent ?? "").trim();
    if (value) return value;
  }
  return "";
}

/** Atom link는 href 속성 + rel=alternate 우선 */
function atomLink(entry: Element): string {
  let fallback = "";
  for (const child of Array.from(entry.children)) {
    if (child.localName !== "link") continue;
    const rel = child.getAttribute("rel");
    const href = child.getAttribute("href") ?? "";
    if (!href) continue;
    if (!rel || rel === "alternate") {
      if (child.getAttribute("type") === "text/html" || !fallback || !rel) return href;
    }
    if (!fallback) fallback = href;
  }
  return fallback;
}

function mediaImage(item: Element): string {
  for (const local of ["content", "thumbnail"]) {
    for (const uri of NS.media) {
      for (const el of Array.from(item.getElementsByTagNameNS(uri, local))) {
        const url = el.getAttribute("url") ?? "";
        const medium = el.getAttribute("medium") ?? "";
        const type = el.getAttribute("type") ?? "";
        if (url && (local === "thumbnail" || medium === "image" || type.startsWith("image/") || (!medium && !type))) {
          return url;
        }
      }
    }
  }
  for (const child of Array.from(item.children)) {
    if (child.localName === "enclosure" && (child.getAttribute("type") ?? "").startsWith("image/")) {
      return child.getAttribute("url") ?? "";
    }
  }
  return "";
}

function parseRssItem(item: Element): FeedItem {
  const guidEl = directChild(item, "guid");
  const descriptionHtml = text(directChild(item, "description"));
  const contentEl = nsFirst(item, NS.content, "encoded");
  const dcDate = nsFirst(item, NS.dc, "date");
  const sourceEl = directChild(item, "source");
  return {
    title: htmlToText(text(directChild(item, "title"))),
    link: rssLink(item),
    guid: text(guidEl),
    guidIsPermalink: (guidEl?.getAttribute("isPermaLink") ?? "true") !== "false",
    published:
      parseFeedDate(text(directChild(item, "pubDate"))) ?? parseFeedDate(text(dcDate)),
    author: htmlToText(text(nsFirst(item, NS.dc, "creator")) || text(directChild(item, "author"))),
    description: htmlToText(descriptionHtml),
    contentHtml: text(contentEl),
    imageUrl: mediaImage(item),
    gnSource: text(sourceEl),
  };
}

function parseAtomEntry(entry: Element): FeedItem {
  const contentEl = directChild(entry, "content");
  let contentHtml = "";
  if (contentEl) {
    if (contentEl.getAttribute("type") === "xhtml") {
      const div = contentEl.firstElementChild;
      contentHtml = div ? div.innerHTML : "";
    } else {
      contentHtml = text(contentEl);
    }
  }
  const summaryEl = directChild(entry, "summary");
  const authorEl = directChild(entry, "author");
  return {
    title: htmlToText(text(directChild(entry, "title"))),
    link: atomLink(entry),
    guid: text(directChild(entry, "id")),
    guidIsPermalink: false,
    published:
      parseFeedDate(text(directChild(entry, "published"))) ??
      parseFeedDate(text(directChild(entry, "updated"))),
    author: authorEl ? htmlToText(text(directChild(authorEl, "name"))) : "",
    description: htmlToText(text(summaryEl)),
    contentHtml,
    imageUrl: mediaImage(entry),
    gnSource: "",
  };
}

/** 루트 요소로 RSS 2.0 / Atom / RDF(RSS 1.0)를 판별해 공통 FeedItem으로 정규화 */
export function parseFeed(xmlText: string): ParsedFeed {
  const doc = parseXml(xmlText);
  if (!doc) throw new Error("피드 XML을 해석할 수 없습니다");
  const root = doc.documentElement;
  const rootName = root.localName;

  if (rootName === "rss") {
    const channel = root.getElementsByTagName("channel")[0];
    if (!channel) throw new Error("RSS channel이 없습니다");
    return {
      title: htmlToText(text(directChild(channel, "title"))),
      siteUrl: rssLink(channel),
      items: Array.from(channel.getElementsByTagName("item")).map(parseRssItem),
    };
  }

  if (rootName === "feed") {
    return {
      title: htmlToText(text(directChild(root, "title"))),
      siteUrl: atomLink(root),
      items: Array.from(root.children)
        .filter((el) => el.localName === "entry")
        .map(parseAtomEntry),
    };
  }

  if (rootName === "RDF") {
    // RSS 1.0 — item이 channel 밖 형제 노드
    const channel = Array.from(root.children).find((el) => el.localName === "channel") ?? null;
    const items = Array.from(root.children).filter((el) => el.localName === "item");
    return {
      title: channel ? htmlToText(text(directChild(channel, "title"))) : "",
      siteUrl: channel ? text(directChild(channel, "link")) : "",
      items: items.map(parseRssItem),
    };
  }

  throw new Error(`알 수 없는 피드 형식: <${rootName}>`);
}

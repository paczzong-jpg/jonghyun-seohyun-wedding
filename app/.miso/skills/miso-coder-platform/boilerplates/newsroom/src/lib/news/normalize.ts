// ────────────────────────────────────────────────
// 정규화·dedup 유틸 — URL canonicalize, 제목 유사도(2-gram Jaccard)
// ────────────────────────────────────────────────

/** 추적 파라미터 blocklist — 한국 언론사는 query가 기사 ID인 경우가 많아 allowlist 금지 */
const STRIP_PARAM =
  /^(utm_\w+|gclid|fbclid|igshid|ocid|cmpid|ncid|mc_cid|mc_eid|ref|sc_src|plink|WT\.\w+)$/i;

/** URL 정규화 — 해시 제거, 추적 파라미터 제거, 모바일/AMP 호스트 통일 */
export function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) {
      if (STRIP_PARAM.test(k)) u.searchParams.delete(k);
    }
    u.hostname = u.hostname.toLowerCase().replace(/^(m|mobile|amp)\./, "www.").replace(/^www\.www\./, "www.");
    u.pathname = u.pathname.replace(/\/amp\/?$/, "/").replace(/\/index\.html?$/, "/");
    // 네이버 뉴스 특례: 기사 정체성 = oid/aid (경로형·쿼리형 모두 통일)
    if (u.hostname.endsWith("news.naver.com")) {
      const m = u.pathname.match(/\/article\/(\d+)\/(\d+)/);
      const oid = m?.[1] ?? u.searchParams.get("oid");
      const aid = m?.[2] ?? u.searchParams.get("aid");
      if (oid && aid) return `https://n.news.naver.com/article/${oid}/${aid}`;
    }
    return u.href.replace(/\/$/, "");
  } catch {
    return raw.trim();
  }
}

/** 32bit FNV-1a — dedup 키·클러스터 키용 짧은 해시 */
export function hash32(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * 기사 dedup 키. 우선순위: canonical URL > guid(비영구링크 포함) > 정규화제목+출처.
 * Google News 링크(불투명 ID)는 URL 자체가 안정 키가 된다.
 */
export function articleKey(item: { link: string; guid: string; title: string; sourceName: string }): string {
  const canon = item.link ? canonicalizeUrl(item.link) : "";
  if (canon && /^https?:\/\//.test(canon)) return `u:${hash32(canon)}`;
  if (item.guid) return `g:${hash32(item.guid)}`;
  return `t:${hash32(normalizeTitle(item.title) + "|" + item.sourceName)}`;
}

/** 제목 정규화 — NFKC(전각→반각) → 소문자 → 말머리·매체 suffix 제거 → 구두점 정리 */
export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\[[^\]]{1,10}\]|【[^】]{1,10}】|<[^>]{1,10}>/g, " ") // [단독]·[속보]류 말머리
    .replace(/\s*[-|–—]\s*[^-|–—]{2,20}$/, "") // "제목 - 매체명" suffix
    .replace(/["'"'‘’“”…·,.!?()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Google News item title "기사제목 - 매체명" → 분리 */
export function splitGnTitle(title: string, sourceText: string): { title: string; source: string } {
  if (sourceText) {
    const suffix = ` - ${sourceText}`;
    if (title.endsWith(suffix)) return { title: title.slice(0, -suffix.length).trim(), source: sourceText };
  }
  const m = title.match(/^(.+)\s-\s([^-]{2,30})$/);
  if (m) return { title: m[1].trim(), source: sourceText || m[2].trim() };
  return { title: title.trim(), source: sourceText };
}

/** 문자 2-gram 집합 (한국어: 어절 shingle 대신 문자 bigram이 교착어·띄어쓰기 편차에 강함) */
export function bigrams(text: string): Set<string> {
  const t = normalizeTitle(text).replace(/\s+/g, "");
  const g = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2));
  return g;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n);
}

/** HTML 문자열 → 순수 텍스트 (엔티티 디코드 + 태그 제거) */
export function htmlToText(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

/** KST 기준 YYYY-MM-DD */
export function kstDay(date: Date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** "N분 전" 상대 시각 */
export function relativeTime(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "";
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 읽기 시간(분) — 한국어 분당 ~500자 기준 */
export function readMinutes(charCount: number): number {
  return Math.max(1, Math.round(charCount / 500));
}

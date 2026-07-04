// ────────────────────────────────────────────────
// ★ 교체 지점 — 브랜딩·프리셋 소스·수집 파라미터는 전부 이 파일에서.
// 뷰/로직 코드에 하드코딩하지 말 것.
// ────────────────────────────────────────────────

export const APP_NAME = "조간";
export const APP_NAME_EN = "CHOGAN";
export const APP_TAGLINE = "AI가 정리하는 나의 아침 신문";

/** 카테고리와 플레이스홀더 틴트 (이미지 없는 기사 카드용, news.css 토큰과 쌍) */
export const CATEGORIES = [
  { key: "종합", tint: "var(--nw-tint-general)" },
  { key: "경제", tint: "var(--nw-tint-economy)" },
  { key: "IT/테크", tint: "var(--nw-tint-tech)" },
  { key: "AI", tint: "var(--nw-tint-ai)" },
  { key: "개발자", tint: "var(--nw-tint-dev)" },
  { key: "스타트업", tint: "var(--nw-tint-startup)" },
  { key: "방송", tint: "var(--nw-tint-broadcast)" },
  { key: "글로벌", tint: "var(--nw-tint-global)" },
] as const;

export interface PresetSource {
  name: string;
  url: string;
  site_url: string;
  category: string;
  media_type: string;
  /** 프리셋 불러오기 시 기본 활성 여부 */
  default_active: boolean;
  /** 실측 특이사항 (관리 화면 노출) */
  note?: string;
}

/**
 * 실측 검증된 프리셋 피드 (2026-07 기준).
 * note 의 함정(좀비 피드·날짜 변형·인코딩)은 ingest.ts 파서가 이미 흡수한다.
 */
export const PRESET_SOURCES: PresetSource[] = [
  // ── 종합/통신사 ──
  { name: "연합뉴스 최신", url: "https://www.yna.co.kr/rss/news.xml", site_url: "https://www.yna.co.kr", category: "종합", media_type: "종합지", default_active: true, note: "국내 최고 신선도. 대량 피드" },
  { name: "연합뉴스 경제", url: "https://www.yna.co.kr/rss/economy.xml", site_url: "https://www.yna.co.kr", category: "경제", media_type: "종합지", default_active: false },
  { name: "조선일보 전체", url: "https://www.chosun.com/arc/outboundfeeds/rss/?outputType=xml", site_url: "https://www.chosun.com", category: "종합", media_type: "종합지", default_active: false, note: "content:encoded 본문 포함, pubDate UTC" },
  { name: "동아일보 전체", url: "https://rss.donga.com/total.xml", site_url: "https://www.donga.com", category: "종합", media_type: "종합지", default_active: false },
  { name: "경향신문 전체", url: "https://www.khan.co.kr/rss/rssdata/total_news.xml", site_url: "https://www.khan.co.kr", category: "종합", media_type: "종합지", default_active: false },
  { name: "한겨레 전체", url: "https://www.hani.co.kr/rss/", site_url: "https://www.hani.co.kr", category: "종합", media_type: "종합지", default_active: false, note: "pubDate 없음(수집시각 대체), 본문은 리더모드 필요" },
  { name: "국민일보 전체", url: "https://www.kmib.co.kr/rss/data/kmibRssAll.xml", site_url: "https://www.kmib.co.kr", category: "종합", media_type: "종합지", default_active: false, note: "EUC-KR 인코딩" },
  { name: "뉴시스 속보", url: "https://www.newsis.com/RSS/sokbo.xml", site_url: "https://www.newsis.com", category: "종합", media_type: "종합지", default_active: false, note: "대량 속보 피드" },
  // ── 경제 ──
  { name: "매일경제 전체", url: "https://www.mk.co.kr/rss/40300001/", site_url: "https://www.mk.co.kr", category: "경제", media_type: "경제지", default_active: true },
  { name: "한국경제 전체", url: "https://www.hankyung.com/feed/all-news", site_url: "https://www.hankyung.com", category: "경제", media_type: "경제지", default_active: false },
  { name: "한국경제 IT", url: "https://www.hankyung.com/feed/it", site_url: "https://www.hankyung.com", category: "IT/테크", media_type: "경제지", default_active: true },
  { name: "머니투데이 최신", url: "https://rss.mt.co.kr/mt_news.xml", site_url: "https://www.mt.co.kr", category: "경제", media_type: "경제지", default_active: false },
  { name: "이데일리 전체", url: "https://rss.edaily.co.kr/edaily_news.xml", site_url: "https://www.edaily.co.kr", category: "경제", media_type: "경제지", default_active: false, note: "날짜 월 풀네임 변형" },
  // ── 방송 ──
  { name: "SBS 경제", url: "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=02&plink=RSSREADER", site_url: "https://news.sbs.co.kr", category: "방송", media_type: "방송", default_active: false },
  { name: "JTBC 경제", url: "https://news-ex.jtbc.co.kr/v1/get/rss/section/economy", site_url: "https://news.jtbc.co.kr", category: "방송", media_type: "방송", default_active: false },
  // ── IT/테크 ──
  { name: "전자신문 오늘의뉴스", url: "https://rss.etnews.com/Section901.xml", site_url: "https://www.etnews.com", category: "IT/테크", media_type: "IT전문지", default_active: true },
  { name: "ZDNet Korea", url: "https://feeds.feedburner.com/zdkorea", site_url: "https://zdnet.co.kr", category: "IT/테크", media_type: "IT전문지", default_active: false },
  { name: "IT조선 전체", url: "https://it.chosun.com/rss/allArticle.xml", site_url: "https://it.chosun.com", category: "IT/테크", media_type: "IT전문지", default_active: false, note: "날짜 TZ 없음(KST 가정)" },
  { name: "디지털투데이", url: "https://www.digitaltoday.co.kr/rss/allArticle.xml", site_url: "https://www.digitaltoday.co.kr", category: "IT/테크", media_type: "IT전문지", default_active: false },
  { name: "바이라인네트워크", url: "https://byline.network/feed/", site_url: "https://byline.network", category: "IT/테크", media_type: "IT전문지", default_active: false },
  // ── AI ──
  { name: "AI타임스", url: "https://www.aitimes.com/rss/allArticle.xml", site_url: "https://www.aitimes.com", category: "AI", media_type: "IT전문지", default_active: true },
  { name: "인공지능신문", url: "https://www.aitimes.kr/rss/allArticle.xml", site_url: "https://www.aitimes.kr", category: "AI", media_type: "IT전문지", default_active: false },
  // ── 개발자/스타트업 ──
  { name: "GeekNews", url: "https://news.hada.io/rss/news", site_url: "https://news.hada.io", category: "개발자", media_type: "커뮤니티", default_active: true, note: "Atom 포맷" },
  { name: "요즘IT", url: "https://yozm.wishket.com/magazine/feed/", site_url: "https://yozm.wishket.com", category: "개발자", media_type: "커뮤니티", default_active: false, note: "content:encoded 전문 포함" },
  { name: "플래텀", url: "https://platum.kr/feed", site_url: "https://platum.kr", category: "스타트업", media_type: "IT전문지", default_active: false },
  { name: "벤처스퀘어", url: "https://www.venturesquare.net/feed", site_url: "https://www.venturesquare.net", category: "스타트업", media_type: "IT전문지", default_active: false },
  // ── 글로벌 ──
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", site_url: "https://techcrunch.com", category: "글로벌", media_type: "글로벌", default_active: true },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", site_url: "https://www.theverge.com", category: "글로벌", media_type: "글로벌", default_active: false, note: "Atom 포맷" },
  { name: "Hacker News", url: "https://hnrss.org/frontpage", site_url: "https://news.ycombinator.com", category: "글로벌", media_type: "커뮤니티", default_active: false },
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", site_url: "https://www.bbc.com/news", category: "글로벌", media_type: "글로벌", default_active: false },
  { name: "The Guardian World", url: "https://www.theguardian.com/world/rss", site_url: "https://www.theguardian.com", category: "글로벌", media_type: "글로벌", default_active: false },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", site_url: "https://arstechnica.com", category: "글로벌", media_type: "글로벌", default_active: false },
  { name: "WIRED", url: "https://www.wired.com/feed/rss", site_url: "https://www.wired.com", category: "글로벌", media_type: "글로벌", default_active: false },
];

/** 키워드 온보딩 추천 예시 (빈 상태 화면 칩) */
export const TOPIC_SUGGESTIONS = ["AI 반도체", "2차전지", "환율", "부동산 정책", "K-콘텐츠", "우주 산업"];

export const TOPIC_COLORS = ["#0D7680", "#990F3D", "#7D5A2C", "#3D5A80", "#5A6B3D", "#6B3D5A"];

// ── 수집 파라미터 ──
export const COLLECT = {
  /** 이 시간(ms) 안에 다시 열면 자동 수집 생략 */
  staleAfterMs: 20 * 60 * 1000,
  /** 소스당 1회 수집 시 최대 반영 기사 수 (대량 피드 방어) */
  maxItemsPerSource: 30,
  /** 키워드(질의)당 최대 반영 수 */
  maxItemsPerQuery: 20,
  /** 이보다 오래된 기사는 수집하지 않음 (ms) */
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  /** 동시 fetch 수 */
  fetchConcurrency: 4,
  /** fetch 타임아웃 (ms) */
  fetchTimeoutMs: 15_000,
  /** 요약 배치 크기 (기사/호출) */
  summaryBatchSize: 10,
  /** 한 번의 수집에서 요약할 최대 기사 수 (토큰 방어) */
  maxSummariesPerRun: 60,
  /** 제목 유사도 dedup 임계값 (2-gram Jaccard) */
  titleJaccard: 0.6,
  /** 같은 사건으로 묶는 시간창 (ms) */
  clusterWindowMs: 72 * 60 * 60 * 1000,
} as const;

/** Google News RSS 키워드 검색 URL */
export function googleNewsSearchUrl(query: string, when: string): string {
  const q = encodeURIComponent(`${query} when:${when}`);
  return `https://news.google.com/rss/search?q=${q}&hl=ko&gl=KR&ceid=KR:ko`;
}

// ── 톤 프리셋 (브리핑·이메일·Q&A 공통) ──
export const TONES: Record<string, { label: string; instruction: string }> = {
  newsletter: {
    label: "뉴스레터체 (해요체)",
    instruction:
      "친근한 존댓말 해요체로 씁니다. 어려운 용어는 괄호로 한 줄 풀이를 붙입니다. 이모지·감탄사·과장은 쓰지 않아 격을 유지합니다.",
  },
  press: {
    label: "기사체 (건조·중립)",
    instruction: "신문 기사체(…다/…했다)로 건조하고 중립적으로 씁니다. 수식어를 아낍니다.",
  },
};

export const DEFAULT_TONE = "newsletter";
export const DEFAULT_AUDIENCE = "산업 동향을 챙겨야 하는 실무자";

/** 요약 스타일 토글 */
export const SUMMARY_STYLES = [
  { key: "default", label: "3줄 요약" },
  { key: "easy", label: "쉽게 설명" },
  { key: "facts", label: "팩트만 5W" },
  { key: "oneline", label: "한 줄" },
] as const;

/** 파비콘 서비스 (단순 <img> 로드 — 프록시 불필요) */
export function faviconUrl(siteUrl: string): string {
  try {
    const host = new URL(siteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return "";
  }
}

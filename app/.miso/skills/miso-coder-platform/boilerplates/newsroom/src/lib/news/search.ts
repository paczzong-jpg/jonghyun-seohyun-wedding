import type { Article } from "./types";
import { bigrams } from "./normalize";

// ────────────────────────────────────────────────
// BM25-lite 검색 — 벡터 DB 없이 Q&A 컨텍스트 후보를 뽑는다.
// 한국어는 어절 토큰이 조사에 취약하므로 어절 + 문자 bigram 을 병행 색인한다.
// 본문 전체는 색인하지 않는다(메모리·노이즈) — 제목·요약·키포인트·엔티티만.
// ────────────────────────────────────────────────

const K1 = 1.5;
const B = 0.75;
const TITLE_BOOST = 3;

interface Doc {
  article: Article;
  tokens: string[];
  len: number;
}

function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^0-9a-z가-힣\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  const grams = [...bigrams(text)];
  return [...words, ...grams];
}

export class NewsIndex {
  private docs: Doc[] = [];
  private df = new Map<string, number>();
  private avgLen = 1;

  constructor(articles: Article[]) {
    for (const article of articles) {
      // 제목은 boost 배수만큼 반복해 가중
      const titleTokens = tokenize(article.title);
      const bodyTokens = tokenize(
        [article.one_liner, article.summary, (article.key_points || []).join(" "), (article.entities || []).join(" ")].join(" "),
      );
      const tokens = [
        ...Array.from({ length: TITLE_BOOST }, () => titleTokens).flat(),
        ...bodyTokens,
      ];
      this.docs.push({ article, tokens, len: tokens.length });
      for (const t of new Set(tokens)) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    }
    const total = this.docs.reduce((s, d) => s + d.len, 0);
    this.avgLen = this.docs.length > 0 ? total / this.docs.length : 1;
  }

  search(query: string, limit: number): Article[] {
    if (this.docs.length === 0) return [];
    const qTokens = new Set(tokenize(query));
    const N = this.docs.length;
    const scored = this.docs.map((doc) => {
      const tf = new Map<string, number>();
      for (const t of doc.tokens) if (qTokens.has(t)) tf.set(t, (tf.get(t) ?? 0) + 1);
      let score = 0;
      for (const [term, freq] of tf) {
        const df = this.df.get(term) ?? 1;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += idf * ((freq * (K1 + 1)) / (freq + K1 * (1 - B + (B * doc.len) / this.avgLen)));
      }
      return { article: doc.article, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.article);
  }
}

/**
 * Q&A 컨텍스트 선택:
 * BM25 top-20 → 최신성 부스트 + 같은 클러스터 최대 2건 다양성 → top-N.
 */
export function selectContext(articles: Article[], query: string, topN = 8): Article[] {
  const index = new NewsIndex(articles);
  const candidates = index.search(query, 20);
  if (candidates.length === 0) return [];

  const now = Date.now();
  const ranked = candidates
    .map((a, rank) => {
      const ageMs = a.published ? now - new Date(a.published).getTime() : 7 * 24 * 3600 * 1000;
      const ageDays = Math.max(0, ageMs / (24 * 3600 * 1000));
      const recency = Math.exp(-ageDays / 3); // 3일 반감기
      const base = candidates.length - rank; // BM25 순위 역수
      return { a, score: base * (1 + 0.5 * recency) };
    })
    .sort((x, y) => y.score - x.score);

  const perCluster = new Map<string, number>();
  const picked: Article[] = [];
  for (const { a } of ranked) {
    const cl = a.cluster || a.id;
    const count = perCluster.get(cl) ?? 0;
    if (count >= 2) continue;
    perCluster.set(cl, count + 1);
    picked.push(a);
    if (picked.length >= topN) break;
  }
  return picked;
}

import { COLLECT, googleNewsSearchUrl } from "@/lib/news-config";
import type {
  Article,
  CollectProgress,
  FeedItem,
  Source,
  SourceProgress,
  Topic,
} from "./types";
import * as db from "./db";
import { fetchBytes, bytesToDoc, parseFeed } from "./ingest";
import { articleKey, canonicalizeUrl, splitGnTitle, bigrams, jaccard, kstDay, hash32 } from "./normalize";
import { summarizeArticles, clusterAll, clusterIncremental } from "./llm";

// ────────────────────────────────────────────────
// 수집 오케스트레이터 — 탭이 열려 있는 동안 도는 파이프라인.
//   fetch → 파싱 → 정규화·dedup → PB upsert → 요약 배치 → 클러스터 증분.
// 진행 상태는 구독 가능한 스토어로 노출(수집 콘솔 UI 가 시그니처 모먼트).
// ────────────────────────────────────────────────

type Listener = (p: CollectProgress) => void;

class CollectStore {
  private progress: CollectProgress = emptyProgress();
  private listeners = new Set<Listener>();
  private running = false;

  get isRunning() {
    return this.running;
  }
  get snapshot() {
    return this.progress;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.progress);
    return () => this.listeners.delete(fn);
  }

  private set(next: CollectProgress) {
    this.progress = next;
    for (const fn of this.listeners) fn(next);
  }

  private patchRow(key: string, patch: Partial<SourceProgress>) {
    this.set({
      ...this.progress,
      rows: this.progress.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    });
  }

  private patch(patch: Partial<CollectProgress>) {
    this.set({ ...this.progress, ...patch });
  }

  private freshIds: string[] = [];

  /** 전체 수집 실행. 이미 실행 중이면 무시 */
  async run(sources: Source[], topics: Topic[]): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.freshIds = [];

    const rows: SourceProgress[] = [
      ...sources.map((s) => ({ key: s.id, name: s.name, kind: "source" as const, status: "wait" as const, fetched: 0, added: 0 })),
      ...topics.map((t) => ({ key: `topic:${t.id}`, name: `키워드: ${t.name}`, kind: "topic" as const, status: "wait" as const, fetched: 0, added: 0 })),
    ];
    this.set({ ...emptyProgress(), phase: "fetching", startedAt: Date.now(), rows });

    // 시간창 내 기존 기사 로드 (제목 유사도 dedup 대상)
    const sinceIso = new Date(Date.now() - COLLECT.maxAgeMs).toISOString();
    const existingArticles = await db.listRecentArticles(sinceIso, 800).catch(() => [] as Article[]);
    const titleGrams = existingArticles.map((a) => ({ id: a.id, grams: bigrams(a.title) }));

    // fetch 작업 목록 구성
    interface Job {
      rowKey: string;
      url: string;
      origin: "feed" | "gnews";
      source?: Source;
      topic?: Topic;
      limit: number;
    }
    const jobs: Job[] = [];
    for (const s of sources) jobs.push({ rowKey: s.id, url: s.url, origin: "feed", source: s, limit: COLLECT.maxItemsPerSource });
    for (const t of topics) {
      // 키워드당 첫 번째 질의만 사용 (레이트리밋·중복 방어; 나머지는 다음 회차에)
      const query = t.queries[0] ?? t.name;
      const excluded = (t.exclude ?? []).map((e) => `-${e}`).join(" ");
      const url = googleNewsSearchUrl(`${query} ${excluded}`.trim(), "1d");
      jobs.push({ rowKey: `topic:${t.id}`, url, origin: "gnews", topic: t, limit: COLLECT.maxItemsPerQuery });
    }

    // 동시성 제한 워커 풀
    let cursor = 0;
    const worker = async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        await this.runJob(job, existingArticles, titleGrams);
      }
    };
    await Promise.all(Array.from({ length: COLLECT.fetchConcurrency }, worker));

    this.patch({ totalAdded: this.freshIds.length });

    // ── 요약 배치 ──
    await this.summarize(sinceIso);

    // ── 클러스터 증분 ──
    await this.cluster(sinceIso);

    this.patch({ phase: "done" });
    this.running = false;
  }

  private async runJob(
    job: { rowKey: string; url: string; origin: "feed" | "gnews"; source?: Source; topic?: Topic; limit: number },
    existingArticles: Article[],
    titleGrams: Array<{ id: string; grams: Set<string> }>,
  ) {
    this.patchRow(job.rowKey, { status: "run" });
    try {
      const { buf, contentType, status } = await fetchBytes(job.url, COLLECT.fetchTimeoutMs);
      if (status >= 400) {
        this.patchRow(job.rowKey, { status: "error", error: `HTTP ${status}` });
        if (job.source) await db.updateSource(job.source.id, { last_status: "error", last_error: `HTTP ${status}`, last_fetched: new Date().toISOString() }).catch(() => {});
        return;
      }
      const xml = bytesToDoc(buf, contentType);
      const parsed = parseFeed(xml);
      const items = parsed.items.slice(0, job.limit);
      this.patchRow(job.rowKey, { fetched: items.length });

      let added = 0;
      const cutoff = Date.now() - COLLECT.maxAgeMs;
      for (const item of items) {
        if (!item.title || (!item.link && !item.guid)) continue;
        const published = item.published ?? new Date();
        if (published.getTime() < cutoff) continue;

        const result = await this.ingestItem(item, published, job, existingArticles, titleGrams);
        if (result === "added") {
          added++;
        }
      }
      this.patchRow(job.rowKey, { status: items.length === 0 ? "empty" : "ok", added });
      if (job.source) {
        await db.updateSource(job.source.id, { last_status: "ok", last_error: "", last_fetched: new Date().toISOString() }).catch(() => {});
      }
    } catch (err) {
      this.patchRow(job.rowKey, { status: "error", error: err instanceof Error ? err.message : "실패" });
      if (job.source) await db.updateSource(job.source.id, { last_status: "error", last_error: err instanceof Error ? err.message : "실패" }).catch(() => {});
    }
  }

  private async ingestItem(
    item: FeedItem,
    published: Date,
    job: { origin: "feed" | "gnews"; source?: Source; topic?: Topic },
    existingArticles: Article[],
    titleGrams: Array<{ id: string; grams: Set<string> }>,
  ): Promise<"added" | "dup" | "skip"> {
    const gn = job.origin === "gnews" ? splitGnTitle(item.title, item.gnSource) : { title: item.title, source: "" };
    const sourceName = job.source?.name ?? gn.source ?? item.gnSource ?? "";
    const key = articleKey({ link: item.link, guid: item.guidIsPermalink ? item.guid : "", title: gn.title, sourceName });

    // 제목 유사도 dedup — 이미 있는 기사와 매우 유사하면 topic 병합만
    const grams = bigrams(gn.title);
    for (const prev of titleGrams) {
      if (jaccard(grams, prev.grams) >= COLLECT.titleJaccard) {
        if (job.topic) {
          const existing = existingArticles.find((a) => a.id === prev.id);
          if (existing) {
            const merged = [...new Set([...(existing.topic_ids ?? []), job.topic.id])];
            if (merged.length !== (existing.topic_ids ?? []).length) {
              await db.updateArticle(existing.id, { topic_ids: merged }).catch(() => {});
            }
          }
        }
        return "dup";
      }
    }

    const canonUrl = job.origin === "gnews" ? item.link : canonicalizeUrl(item.link || item.guid);
    const { article, isNew } = await db.upsertArticle({
      key,
      url: canonUrl,
      origin: job.origin,
      title: gn.title,
      source: job.source?.id ?? "",
      source_name: sourceName,
      media_type: job.source?.media_type ?? "",
      topic_ids: job.topic ? [job.topic.id] : [],
      author: item.author,
      published: published.toISOString(),
      desc_src: item.description,
      content_src: item.contentHtml,
      image_url: item.imageUrl,
    });

    if (isNew) {
      existingArticles.push(article);
      titleGrams.push({ id: article.id, grams });
      this.freshIds.push(article.id);
      return "added";
    }
    return "dup";
  }

  private async summarize(sinceIso: string) {
    this.patch({ phase: "summarizing" });
    const pending = await db.listPendingSummaries(sinceIso, COLLECT.maxSummariesPerRun).catch(() => [] as Article[]);
    this.patch({ summarizeTotal: pending.length, summarized: 0 });
    if (pending.length === 0) return;

    for (let i = 0; i < pending.length; i += COLLECT.summaryBatchSize) {
      const batch = pending.slice(i, i + COLLECT.summaryBatchSize);
      try {
        const results = await summarizeArticles(batch);
        for (const article of batch) {
          const r = results.get(article.id);
          if (r) {
            await db.updateArticle(article.id, {
              one_liner: r.one_liner,
              summary: r.summary,
              key_points: r.key_points,
              entities: r.entities,
              quote: r.quote,
              ai_status: "ready",
            }).catch(() => {});
          } else {
            await db.updateArticle(article.id, { ai_status: "failed" }).catch(() => {});
          }
        }
      } catch {
        // 배치 전체 실패 — pending 으로 남겨 다음 회차 재시도 (ai_status 미변경)
      }
      this.patch({ summarized: Math.min(i + COLLECT.summaryBatchSize, pending.length) });
    }
  }

  private async cluster(sinceIso: string) {
    this.patch({ phase: "clustering" });
    const day = kstDay();
    const articles = (await db.listRecentArticles(sinceIso, 500).catch(() => [] as Article[]))
      .filter((a) => a.ai_status === "ready");
    if (articles.length === 0) return;

    const todayClusters = await db.listClusters(day).catch(() => []);
    const unclustered = articles.filter((a) => !a.cluster);

    if (todayClusters.length === 0) {
      // 최초: 전체 클러스터링
      const clusters = await clusterAll(articles).catch(() => []);
      let touched = 0;
      for (const c of clusters) {
        const ckey = `${day}:${hash32(c.label + c.repId)}`;
        const created = await db.createCluster({
          ckey,
          label: c.label,
          day,
          category: articleCategory(articles, c.repId),
          rep: c.repId,
          article_ids: c.articleIds,
        }).catch(() => null);
        if (created) {
          await Promise.all(c.articleIds.map((id) => db.updateArticle(id, { cluster: ckey }).catch(() => {})));
          touched++;
        }
      }
      this.patch({ clustersTouched: touched });
      return;
    }

    if (unclustered.length === 0) {
      this.patch({ clustersTouched: 0 });
      return;
    }

    // 증분 배정 — 기존 라벨·구성 불변
    const repTitles = new Map<string, string[]>();
    for (const c of todayClusters) {
      const members = articles.filter((a) => c.article_ids.includes(a.id));
      repTitles.set(c.id, members.map((a) => a.title));
    }
    const { assign, created } = await clusterIncremental(todayClusters, unclustered, repTitles).catch(() => ({ assign: new Map(), created: [] }));

    let touched = 0;
    // 기존 클러스터에 배정
    const byCkey = new Map(todayClusters.map((c) => [c.ckey, c]));
    const addTo = new Map<string, string[]>();
    for (const [articleId, ckey] of assign) {
      addTo.set(ckey, [...(addTo.get(ckey) ?? []), articleId]);
      await db.updateArticle(articleId, { cluster: ckey }).catch(() => {});
    }
    for (const [ckey, ids] of addTo) {
      const cluster = byCkey.get(ckey);
      if (!cluster) continue;
      const merged = [...new Set([...cluster.article_ids, ...ids])];
      await db.updateCluster(cluster.id, { article_ids: merged, size: merged.length }).catch(() => {});
      touched++;
    }
    // 신규 클러스터
    for (const c of created) {
      const ckey = `${day}:${hash32(c.label + c.repId + Math.floor(Date.now() / 1000))}`;
      const createdCluster = await db.createCluster({
        ckey,
        label: c.label,
        day,
        category: articleCategory(articles, c.repId),
        rep: c.repId,
        article_ids: c.articleIds,
      }).catch(() => null);
      if (createdCluster) {
        await Promise.all(c.articleIds.map((id) => db.updateArticle(id, { cluster: ckey }).catch(() => {})));
        touched++;
      }
    }
    this.patch({ clustersTouched: touched });
  }
}

function articleCategory(articles: Article[], repId: string): string {
  const rep = articles.find((a) => a.id === repId);
  return rep?.media_type === "경제지" ? "경제" : "종합";
}

function emptyProgress(): CollectProgress {
  return {
    phase: "idle",
    startedAt: 0,
    rows: [],
    totalAdded: 0,
    summarized: 0,
    summarizeTotal: 0,
    clustersTouched: 0,
  };
}

export const collectStore = new CollectStore();

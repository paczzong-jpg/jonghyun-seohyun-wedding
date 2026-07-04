import { PRESET_SOURCES, COLLECT } from "@/lib/news-config";
import type { Source, Topic } from "./types";
import * as db from "./db";
import { collectStore } from "./collect";

// ────────────────────────────────────────────────
// 첫 진입 시딩 + 자동 수집 게이트.
//   ensureSeeded()      : 소스가 하나도 없으면 프리셋을 심어 포털을 즉시 채운다.
//   loadPresetSources() : 관리 화면에서 누락된 프리셋만 보충.
//   maybeAutoCollect()  : staleAfterMs 경과 + 미실행 시에만 수집 트리거.
// ────────────────────────────────────────────────

const LAST_COLLECT_KEY = "nw:lastCollect";

/** 소스가 비어 있으면 프리셋을 심는다. 항상 현재 소스·키워드를 반환. */
export async function ensureSeeded(): Promise<{ sources: Source[]; topics: Topic[] }> {
  let sources = await db.listSources().catch(() => [] as Source[]);
  if (sources.length === 0) {
    for (const p of PRESET_SOURCES) {
      await db
        .createSource({
          name: p.name,
          url: p.url,
          site_url: p.site_url,
          category: p.category,
          media_type: p.media_type,
          active: p.default_active,
        })
        .catch(() => {});
    }
    sources = await db.listSources().catch(() => [] as Source[]);
  }
  const topics = await db.listTopics().catch(() => [] as Topic[]);
  return { sources, topics };
}

/** 아직 등록되지 않은 프리셋 소스만 추가한다. 추가된 개수 반환. */
export async function loadPresetSources(): Promise<number> {
  const existing = await db.listSources().catch(() => [] as Source[]);
  const have = new Set(existing.map((s) => s.url));
  let added = 0;
  for (const p of PRESET_SOURCES) {
    if (have.has(p.url)) continue;
    const ok = await db
      .createSource({
        name: p.name,
        url: p.url,
        site_url: p.site_url,
        category: p.category,
        media_type: p.media_type,
        active: p.default_active,
      })
      .then(() => true)
      .catch(() => false);
    if (ok) added++;
  }
  return added;
}

function lastCollectAt(): number {
  const raw = localStorage.getItem(LAST_COLLECT_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

/** 마지막 수집이 오래됐고 실행 중이 아니면 수집을 돈다. force 로 강제. */
export async function maybeAutoCollect(
  sources: Source[],
  topics: Topic[],
  opts: { force?: boolean } = {},
): Promise<boolean> {
  if (collectStore.isRunning) return false;
  const active = sources.filter((s) => s.active);
  const activeTopics = topics.filter((t) => t.active);
  if (active.length === 0 && activeTopics.length === 0) return false;

  const stale = Date.now() - lastCollectAt() > COLLECT.staleAfterMs;
  if (!opts.force && !stale) return false;

  localStorage.setItem(LAST_COLLECT_KEY, String(Date.now()));
  await collectStore.run(active, activeTopics);
  return true;
}

/** 수동 새로고침(관리·홈의 새로고침 버튼) — stale 여부 무시. */
export async function collectNow(sources: Source[], topics: Topic[]): Promise<boolean> {
  return maybeAutoCollect(sources, topics, { force: true });
}

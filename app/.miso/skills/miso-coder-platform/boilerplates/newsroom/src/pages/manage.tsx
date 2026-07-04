import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Plus, RefreshCw, Rss, Save, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeywordDialog } from "@/components/news/keyword-dialog";
import { CollectConsole, useCollectProgress } from "@/components/news/collect-console";
import { mediaLabel } from "@/components/news/shared";
import { collectNow, loadPresetSources } from "@/lib/news/bootstrap";
import { updateSource, updateTopic, deleteTopic, updateSettings } from "@/lib/news/db";
import { faviconUrl, TONES } from "@/lib/news-config";
import { useNews } from "./context";
import type { Settings, Source, Tone, Topic } from "@/lib/news/types";

// ────────────────────────────────────────────────
// 관리 — 매체(RSS) · 구독 키워드 · 브리핑 설정.
//   · 매체/토픽 활성 토글, 프리셋 불러오기, 지금 수집
//   · 브리핑 톤·독자 저장(설정)
// ────────────────────────────────────────────────

export function ManagePage() {
  const { sources, topics, settings, refreshSources, refreshTopics, setSettings } = useNews();
  const progress = useCollectProgress();
  const collecting = progress.phase !== "idle" && progress.phase !== "done" && progress.phase !== "error";

  const [kwOpen, setKwOpen] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="nw-serif nw-double-rule mb-6 text-2xl">관리</h1>

      {collecting && (
        <div className="mb-6">
          <CollectConsole />
        </div>
      )}

      <SourcesSection
        sources={sources}
        collecting={collecting}
        loadingPreset={loadingPreset}
        onToggle={async (s) => {
          await updateSource(s.id, { active: !s.active }).catch(() => {});
          await refreshSources();
        }}
        onLoadPreset={async () => {
          setLoadingPreset(true);
          const n = await loadPresetSources().catch(() => 0);
          setLoadingPreset(false);
          await refreshSources();
          toast.success(n > 0 ? `${n}개 매체를 추가했어요.` : "새로 추가할 매체가 없어요.");
        }}
        onCollect={() => void collectNow(sources, topics)}
      />

      <TopicsSection
        topics={topics}
        onAdd={() => setKwOpen(true)}
        onToggle={async (t) => {
          await updateTopic(t.id, { active: !t.active }).catch(() => {});
          await refreshTopics();
        }}
        onRemove={async (t) => {
          await deleteTopic(t.id).catch(() => {});
          await refreshTopics();
        }}
      />

      <SettingsSection settings={settings} onSaved={setSettings} />

      <KeywordDialog
        open={kwOpen}
        onOpenChange={setKwOpen}
        existingCount={topics.length}
        onCreated={() => void refreshTopics()}
      />
    </div>
  );
}

// ── 매체 ─────────────────────────────

function SourcesSection({
  sources,
  collecting,
  loadingPreset,
  onToggle,
  onLoadPreset,
  onCollect,
}: {
  sources: Source[];
  collecting: boolean;
  loadingPreset: boolean;
  onToggle: (s: Source) => void;
  onLoadPreset: () => void;
  onCollect: () => void;
}) {
  const activeCount = sources.filter((s) => s.active).length;
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--nw-hairline)] pb-2">
        <h2 className="nw-serif flex items-center gap-1.5 text-lg">
          <Rss className="size-4 text-[var(--nw-accent)]" /> 매체 <span className="nw-meta text-[var(--nw-ink-3)]">{activeCount}/{sources.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onLoadPreset} disabled={loadingPreset}>
            {loadingPreset ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Download className="mr-1.5 size-4" />}
            프리셋 불러오기
          </Button>
          <Button size="sm" onClick={onCollect} disabled={collecting}>
            <RefreshCw className={`mr-1.5 size-4 ${collecting ? "animate-spin" : ""}`} /> 지금 수집
          </Button>
        </div>
      </div>

      {sources.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--nw-ink-3)]">
          등록된 매체가 없어요. “프리셋 불러오기”로 시작해 보세요.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--nw-hairline)]">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <img src={faviconUrl(s.site_url || s.url)} alt="" className="size-5 rounded-sm" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{s.name}</div>
                <div className="nw-meta text-[var(--nw-ink-3)]">
                  {s.category} · {mediaLabel(s.media_type)}
                  {s.last_status === "error" && <span className="text-[var(--nw-live)]"> · 수집 실패</span>}
                  {s.last_status === "empty" && <span> · 새 기사 없음</span>}
                </div>
              </div>
              <Button
                variant={s.active ? "secondary" : "ghost"}
                size="sm"
                className="shrink-0"
                onClick={() => onToggle(s)}
              >
                {s.active ? "구독 중" : "꺼짐"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── 구독 키워드 ─────────────────────────────

function TopicsSection({
  topics,
  onAdd,
  onToggle,
  onRemove,
}: {
  topics: Topic[];
  onAdd: () => void;
  onToggle: (t: Topic) => void;
  onRemove: (t: Topic) => void;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--nw-hairline)] pb-2">
        <h2 className="nw-serif flex items-center gap-1.5 text-lg">
          <Tag className="size-4 text-[var(--nw-accent)]" /> 구독 키워드
        </h2>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1.5 size-4" /> 키워드 추가
        </Button>
      </div>

      {topics.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--nw-ink-3)]">
          구독 중인 키워드가 없어요. 관심 주제를 추가하면 해당 뉴스를 모아드려요.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--nw-hairline)]">
          {topics.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{t.name}</div>
                {t.related.length > 0 && (
                  <div className="nw-meta truncate text-[var(--nw-ink-3)]">{t.related.join(", ")}</div>
                )}
              </div>
              <Button
                variant={t.active ? "secondary" : "ghost"}
                size="sm"
                className="shrink-0"
                onClick={() => onToggle(t)}
              >
                {t.active ? "켜짐" : "꺼짐"}
              </Button>
              <button
                className="shrink-0 text-[var(--nw-ink-3)] transition-colors hover:text-[var(--nw-live)]"
                onClick={() => onRemove(t)}
                aria-label="삭제"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── 브리핑 설정 ─────────────────────────────

function SettingsSection({
  settings,
  onSaved,
}: {
  settings: Settings | null;
  onSaved: (s: Settings) => void;
}) {
  const [tone, setTone] = useState<Tone>("newsletter");
  const [audience, setAudience] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setTone(settings.tone);
      setAudience(settings.audience);
    }
  }, [settings]);

  const save = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await updateSettings(settings.id, { tone, audience: audience.trim() });
      onSaved(next);
      toast.success("설정을 저장했어요.");
    } catch {
      toast.error("설정 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }, [settings, tone, audience, onSaved]);

  const dirty = settings ? tone !== settings.tone || audience.trim() !== settings.audience : false;

  return (
    <section className="mb-6">
      <h2 className="nw-serif mb-3 border-b border-[var(--nw-hairline)] pb-2 text-lg">브리핑 설정</h2>

      <div className="mb-5">
        <div className="nw-overline mb-2 text-[var(--nw-ink-2)]">글의 톤</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TONES).map(([key, t]) => (
            <Button
              key={key}
              variant={tone === key ? "secondary" : "outline"}
              size="sm"
              onClick={() => setTone(key as Tone)}
              disabled={!settings}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label htmlFor="audience" className="nw-overline mb-2 block text-[var(--nw-ink-2)]">
          독자 (누구를 위한 브리핑인가요?)
        </label>
        <Input
          id="audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="예: 산업 동향을 챙겨야 하는 실무자"
          disabled={!settings}
        />
      </div>

      <Button onClick={() => void save()} disabled={!settings || !dirty || saving}>
        {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Save className="mr-1.5 size-4" />}
        설정 저장
      </Button>
    </section>
  );
}

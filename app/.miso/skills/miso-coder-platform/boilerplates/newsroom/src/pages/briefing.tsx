import { Loader2 } from "lucide-react";
import { BriefingView } from "@/components/news/briefing-view";
import { useNews } from "./context";

// ────────────────────────────────────────────────
// 데일리 브리핑 페이지 — 컨텍스트를 BriefingView 로 전달.
//   · settings 는 필수라 준비되기 전엔 로딩 표시(gate)
// ────────────────────────────────────────────────

export function BriefingPage() {
  const { clusters, articles, settings, keywords, onCite, booting } = useNews();

  if (booting || !settings) {
    return (
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-16 text-[var(--nw-ink-2)]">
        <Loader2 className="size-5 animate-spin" /> 준비 중…
      </div>
    );
  }

  return (
    <BriefingView
      clusters={clusters}
      articles={articles}
      settings={settings}
      keywords={keywords}
      onCite={onCite}
    />
  );
}

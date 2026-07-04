import type { Article } from "@/lib/news/types";
import { mediaLabel } from "./shared";

// ────────────────────────────────────────────────
// 매체 유형 분포 바 (Ground News 바이어스 바의 한국형 변형 — 정치축 대신 매체 유형축).
// 클러스터 내 기사들의 media_type 을 집계해 CSS 스택 바로.
// ────────────────────────────────────────────────

const ORDER = ["종합지", "경제지", "IT전문지", "방송", "글로벌", "커뮤니티"];
const COLORS: Record<string, string> = {
  종합지: "#0d7680",
  경제지: "#7d5a2c",
  IT전문지: "#3d5a80",
  방송: "#990f3d",
  글로벌: "#5a6b3d",
  커뮤니티: "#6b3d5a",
  기타: "#9a917f",
};

export function CoverageBar({ articles }: { articles: Article[] }) {
  const counts = new Map<string, number>();
  for (const a of articles) {
    const t = a.media_type && ORDER.includes(a.media_type) ? a.media_type : "기타";
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const total = articles.length || 1;
  const entries = [...counts.entries()].sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));
  if (entries.length === 0) return null;

  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        {entries.map(([type, count]) => (
          <div
            key={type}
            style={{ width: `${(count / total) * 100}%`, background: COLORS[type] ?? COLORS.기타 }}
            title={`${mediaLabel(type)} ${count}건`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        <span className="nw-meta font-semibold">{articles.length}개 매체 보도</span>
        {entries.map(([type, count]) => (
          <span key={type} className="nw-meta flex items-center gap-1">
            <span className="inline-block size-2 rounded-full" style={{ background: COLORS[type] ?? COLORS.기타 }} />
            {mediaLabel(type)} {Math.round((count / total) * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

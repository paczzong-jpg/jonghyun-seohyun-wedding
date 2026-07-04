import { cn } from "@/lib/utils";
import { getPlatform } from "@/lib/marketing/platforms";
import type { CampaignConcept } from "@/lib/marketing/types";

// 캠페인 컨셉 카드 — 오버사이즈 넘버링 + 훅 인용의 포스터형 시트.
// 선택 상태는 보더가 아니라 잉크 넘버 → 버밀리언 + 좌측 바로 표현한다.

type Props = {
  concept: CampaignConcept;
  index: number;
  selected: boolean;
  onSelect: () => void;
};

export function ConceptCard({ concept, index, selected, onSelect }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "ms-sheet ms-lift relative cursor-pointer overflow-hidden p-6",
        selected && "ring-2 ring-primary",
      )}
    >
      {selected ? (
        <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
      ) : null}

      <span
        className={cn(
          "ms-num block text-4xl leading-none",
          selected ? "text-primary" : "text-muted-foreground/35",
        )}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <h3 className="ms-display mt-4 break-keep text-xl leading-snug">{concept.title}</h3>
      <p className="mt-2 break-keep text-xs leading-relaxed text-muted-foreground">
        {concept.theme}
      </p>

      <p
        className="mt-4 break-keep border-t pt-4 text-sm font-semibold leading-relaxed"
        style={{ borderColor: "var(--ms-hairline)" }}
      >
        <span className="text-primary">“</span>
        {concept.hook}
        <span className="text-primary">”</span>
      </p>

      {concept.recommendedPlatforms.length > 0 ? (
        <p className="ms-mono mt-4 text-muted-foreground">
          {concept.recommendedPlatforms.map((id) => getPlatform(id).channel).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

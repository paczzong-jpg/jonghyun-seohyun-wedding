import { useState } from "react";
import { Plus, X } from "lucide-react";
import { proxiedImageUrl } from "@/lib/marketing/media";
import { normalizeHex } from "@/lib/marketing/palette";
import type { BrandKitDraft } from "@/lib/marketing/types";

// 브랜드 DNA 벤토 보드 — Pomelli 의 "Business DNA 스냅샷" 에 해당.
// 무보더 시트 셀 + 언더라인 인라인 편집. 색상 셀은 잉크 반전(화면의 대비 모먼트).
// 상위에서 draft 상태를 소유하고, 이 보드는 patch 콜백만 올린다.

type Props = {
  value: BrandKitDraft;
  onChange: (patch: Partial<BrandKitDraft>) => void;
};

function Cell(props: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`ms-cell ${props.className ?? ""}`}>
      <p className="ms-cell-label">{props.label}</p>
      {props.children}
    </div>
  );
}

function ChipListEditor(props: {
  values: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value || props.values.includes(value)) return;
    props.onChange([...props.values, value]);
    setDraft("");
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {props.values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
          >
            {value}
            <button
              type="button"
              aria-label={`${value} 제거`}
              onClick={() => props.onChange(props.values.filter((v) => v !== value))}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        placeholder={props.placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        className="ms-uline pb-1 text-xs"
      />
    </div>
  );
}

function ColorSwatchRow(props: {
  values: string[];
  onChange: (next: string[]) => void;
  onInk?: boolean;
}) {
  const update = (index: number, raw: string) => {
    const hex = normalizeHex(raw);
    if (!hex) return;
    const next = [...props.values];
    next[index] = hex;
    props.onChange(next);
  };

  return (
    <div className="flex flex-wrap items-start gap-3.5">
      {props.values.map((color, index) => {
        const hex = normalizeHex(color) ?? "#888888";
        return (
          <div key={`${hex}-${index}`} className="group relative flex flex-col items-center gap-1.5">
            <span
              className="relative block size-12 overflow-hidden rounded-full"
              style={{
                background: hex,
                boxShadow: props.onInk
                  ? "inset 0 0 0 1px rgba(243,241,232,0.25)"
                  : "inset 0 0 0 1px rgba(25,24,19,0.12)",
              }}
            >
              <input
                type="color"
                value={hex}
                onChange={(e) => update(index, e.target.value)}
                title={hex}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </span>
            <span className="ms-mono" style={{ opacity: 0.65 }}>
              {hex}
            </span>
            <button
              type="button"
              aria-label={`${hex} 제거`}
              onClick={() => props.onChange(props.values.filter((_, i) => i !== index))}
              className="absolute -right-1.5 -top-1.5 hidden rounded-full bg-card p-0.5 text-muted-foreground shadow group-hover:block"
            >
              <X className="size-2.5" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        aria-label="색 추가"
        onClick={() => props.onChange([...props.values, "#e8501f"])}
        className="flex size-12 items-center justify-center rounded-full border border-dashed transition-colors hover:border-primary hover:text-primary"
        style={{
          borderColor: props.onInk ? "rgba(243,241,232,0.35)" : "var(--color-input)",
          color: props.onInk ? "rgba(243,241,232,0.6)" : "var(--color-muted-foreground)",
        }}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function ImageGallery(props: { values: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!/^https?:\/\//i.test(value) || props.values.includes(value)) return;
    props.onChange([...props.values, value]);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      {props.values.length === 0 ? (
        <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground" style={{ borderColor: "var(--color-input)" }}>
          사이트 분석 시 자동 수집됩니다 — URL 로 직접 추가할 수도 있어요.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {props.values.map((src) => (
            <div key={src} className="group relative">
              <img
                src={proxiedImageUrl(src)}
                alt=""
                loading="lazy"
                className="aspect-square w-full rounded-md object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0.2";
                }}
              />
              <button
                type="button"
                aria-label="이미지 제거"
                onClick={() => props.onChange(props.values.filter((v) => v !== src))}
                className="absolute right-1 top-1 hidden rounded-full bg-card p-1 text-muted-foreground shadow hover:text-destructive group-hover:block"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-baseline gap-3">
        <input
          value={draft}
          placeholder="https://…/image.jpg"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="ms-uline flex-1 pb-1 text-xs"
        />
        <button type="button" className="ms-linkact" onClick={add}>
          추가
        </button>
      </div>
    </div>
  );
}

export function BrandKitForm({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Cell label="Brand" className="sm:col-span-2">
        <input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="브랜드명"
          className="ms-uline ms-display pb-1 text-3xl"
        />
        <input
          value={value.industry}
          onChange={(e) => onChange({ industry: e.target.value })}
          placeholder="업종"
          className="ms-uline mt-2 pb-1 text-sm text-muted-foreground"
        />
      </Cell>

      <Cell label="Tagline" className="sm:col-span-2">
        <textarea
          rows={2}
          value={value.tagline}
          onChange={(e) => onChange({ tagline: e.target.value })}
          placeholder="브랜드를 한 줄로"
          className="ms-uline resize-none break-keep pb-1 text-xl font-bold leading-snug"
        />
      </Cell>

      <Cell label="Logo">
        <div className="flex h-16 items-center justify-center rounded-lg bg-muted/70 px-3">
          {value.logoUrl ? (
            <img
              src={proxiedImageUrl(value.logoUrl)}
              alt="로고"
              className="max-h-12 max-w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="ms-display text-lg text-muted-foreground/70">
              {value.name || "로고 없음"}
            </span>
          )}
        </div>
        <input
          value={value.logoUrl}
          onChange={(e) => onChange({ logoUrl: e.target.value })}
          placeholder="https://…/logo.png"
          className="ms-uline mt-2.5 pb-1 text-xs text-muted-foreground"
        />
      </Cell>

      <Cell label="Fonts">
        <div className="mb-3 flex items-end gap-5">
          {(value.fonts.length > 0 ? value.fonts.slice(0, 2) : ["Pretendard"]).map((font) => (
            <div key={font} className="min-w-0">
              <p
                className="text-4xl font-bold leading-none"
                style={{ fontFamily: `"${font}", Pretendard, sans-serif` }}
              >
                Aa
              </p>
              <p className="ms-mono mt-1.5 truncate text-muted-foreground">{font}</p>
            </div>
          ))}
        </div>
        <ChipListEditor
          values={value.fonts}
          placeholder="폰트 추가 — Enter"
          onChange={(fonts) => onChange({ fonts })}
        />
      </Cell>

      {/* 잉크 반전 — DNA 보드의 대비 모먼트 */}
      <Cell label="Colors" className="ms-ink sm:col-span-2">
        <div className="space-y-5 pb-1 pt-1">
          <ColorSwatchRow
            onInk
            values={value.primaryColors}
            onChange={(primaryColors) => onChange({ primaryColors })}
          />
          <div>
            <p className="ms-mono mb-2.5" style={{ opacity: 0.5 }}>
              SECONDARY
            </p>
            <ColorSwatchRow
              onInk
              values={value.secondaryColors}
              onChange={(secondaryColors) => onChange({ secondaryColors })}
            />
          </div>
        </div>
      </Cell>

      <Cell label="Tone of Voice">
        <ChipListEditor
          values={value.toneOfVoice}
          placeholder="예: 따뜻한 — Enter"
          onChange={(toneOfVoice) => onChange({ toneOfVoice })}
        />
      </Cell>

      <Cell label="Personality">
        <ChipListEditor
          values={value.personality}
          placeholder="예: 장인정신 — Enter"
          onChange={(personality) => onChange({ personality })}
        />
      </Cell>

      <Cell label="Key Messages" className="sm:col-span-2">
        <ChipListEditor
          values={value.keyMessages}
          placeholder="짧은 메시지 — Enter"
          onChange={(keyMessages) => onChange({ keyMessages })}
        />
      </Cell>

      <Cell label="Audience · Value" className="sm:col-span-2">
        <input
          value={value.targetAudience}
          onChange={(e) => onChange({ targetAudience: e.target.value })}
          placeholder="타깃 고객 한 문장"
          className="ms-uline pb-1 text-sm font-semibold"
        />
        <textarea
          rows={2}
          value={value.valueProposition}
          onChange={(e) => onChange({ valueProposition: e.target.value })}
          placeholder="핵심 가치 제안"
          className="ms-uline mt-3 resize-none break-keep pb-1 text-sm leading-relaxed text-muted-foreground"
        />
      </Cell>

      <Cell label="Images" className="sm:col-span-2">
        <ImageGallery values={value.images} onChange={(images) => onChange({ images })} />
      </Cell>
    </div>
  );
}

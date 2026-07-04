import { Download, Loader2, RefreshCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ARCHETYPES } from "@/lib/marketing/archetypes";
import { proxiedImageUrl } from "@/lib/marketing/media";
import { paletteVariantCount, resolvePalette } from "@/lib/marketing/palette";
import { getPlatform } from "@/lib/marketing/platforms";
import type { AssetCopy, BrandKit, CreativeStyle, TextScale } from "@/lib/marketing/types";

// 에셋 에디터 패널 — 카피·컴포지션·팔레트·로고·배경·스케일.
// 카드 박스 대신 헤어라인 그룹, 언더라인 카피 필드, 필 토글, 모노 카운터로 조판한다.

type Props = {
  brand: BrandKit;
  platformId: string;
  copy: AssetCopy;
  style: CreativeStyle;
  busy: "regen" | "download" | null;
  onCopyChange: (patch: Partial<AssetCopy>) => void;
  onStyleChange: (patch: Partial<CreativeStyle>) => void;
  onRegenerateCopy: () => void;
  onDownload: () => void;
  onDelete: () => void;
};

const TEXT_SCALES: { value: TextScale; label: string }[] = [
  { value: 0.85, label: "작게" },
  { value: 1, label: "기본" },
  { value: 1.15, label: "크게" },
];

function Group(props: { label: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-t pt-4" style={{ borderColor: "var(--ms-hairline)" }}>
      <div className="mb-2.5 flex items-baseline justify-between">
        <p className="ms-mono uppercase text-muted-foreground">{props.label}</p>
        {props.meta}
      </div>
      {props.children}
    </div>
  );
}

export function EditorControls(props: Props) {
  const { brand, platformId, copy, style, busy } = props;
  const platform = getPlatform(platformId);
  const variantTotal = paletteVariantCount(brand);
  const gallery = [...new Set([brand.ogImageUrl, ...brand.images].filter(Boolean))].slice(0, 8);

  const counter = (text: string, max: number) =>
    max > 0 ? (
      <span className={cn("ms-mono", text.length > max ? "text-destructive" : "text-muted-foreground")}>
        {text.length}/{max}
      </span>
    ) : null;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="ms-mono uppercase text-muted-foreground">Headline</p>
          {counter(copy.headline, platform.copy.headlineMax)}
        </div>
        <textarea
          rows={2}
          value={copy.headline}
          onChange={(e) => props.onCopyChange({ headline: e.target.value })}
          className="ms-uline resize-none break-keep pb-1 text-lg font-bold leading-snug"
        />
      </div>

      {platform.copy.bodyMax > 0 ? (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="ms-mono uppercase text-muted-foreground">Body</p>
            {counter(copy.body, platform.copy.bodyMax)}
          </div>
          <textarea
            rows={2}
            value={copy.body}
            onChange={(e) => props.onCopyChange({ body: e.target.value })}
            className="ms-uline resize-none break-keep pb-1 text-sm leading-relaxed"
          />
        </div>
      ) : null}

      {platform.copy.ctaMax > 0 ? (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="ms-mono uppercase text-muted-foreground">CTA</p>
            {counter(copy.cta, platform.copy.ctaMax)}
          </div>
          <input
            value={copy.cta}
            onChange={(e) => props.onCopyChange({ cta: e.target.value })}
            className="ms-uline pb-1 text-sm font-semibold"
          />
        </div>
      ) : null}

      <button
        type="button"
        className="ms-pill flex w-full items-center justify-center gap-2"
        disabled={busy !== null}
        onClick={props.onRegenerateCopy}
      >
        {busy === "regen" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCcw className="size-3.5" />
        )}
        AI 카피 다시 쓰기
      </button>

      <Group label="Composition">
        <div className="flex flex-wrap gap-1.5">
          {ARCHETYPES.map((archetype) => (
            <button
              key={archetype.id}
              type="button"
              title={archetype.description}
              aria-pressed={style.archetype === archetype.id}
              onClick={() => props.onStyleChange({ archetype: archetype.id })}
              className="ms-pill"
            >
              {archetype.label}
            </button>
          ))}
        </div>
      </Group>

      <Group label="Palette" meta={<span className="ms-mono text-muted-foreground">{style.paletteIndex + 1}/{variantTotal}</span>}>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: variantTotal }, (_, index) => {
            const preview = resolvePalette(brand, index);
            return (
              <button
                key={index}
                type="button"
                aria-label={`팔레트 변형 ${index + 1}`}
                onClick={() => props.onStyleChange({ paletteIndex: index })}
                className={cn(
                  "size-9 rounded-full transition-transform hover:scale-110",
                  style.paletteIndex === index && "ring-2 ring-primary ring-offset-2",
                )}
                style={{
                  background: `linear-gradient(135deg, ${preview.bg} 55%, ${preview.accent} 55%)`,
                  boxShadow: "inset 0 0 0 1px rgba(25,24,19,0.12)",
                  ["--tw-ring-offset-color" as string]: "var(--color-background)",
                }}
              />
            );
          })}
        </div>
      </Group>

      <Group
        label="Logo"
        meta={
          <Switch
            checked={style.showLogo}
            onCheckedChange={(showLogo) => props.onStyleChange({ showLogo })}
            aria-label="브랜드 로고 표시"
          />
        }
      >
        <p className="text-xs text-muted-foreground">브랜드 로고 표시</p>
      </Group>

      <Group label="Backdrop — Photo">
        {gallery.length > 0 ? (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {gallery.map((src) => {
              const selected = style.bgImageUrl === src;
              return (
                <button
                  key={src}
                  type="button"
                  aria-pressed={selected}
                  title={selected ? "선택 해제" : "배경으로 사용"}
                  onClick={() =>
                    props.onStyleChange({
                      bgImageUrl: selected ? "" : src,
                      ...(selected ? {} : { archetype: "photo" as const }),
                    })
                  }
                  className={cn(
                    "size-12 overflow-hidden rounded-md transition-transform hover:scale-105",
                    selected && "ring-2 ring-primary ring-offset-2",
                  )}
                  style={{ ["--tw-ring-offset-color" as string]: "var(--color-background)" }}
                >
                  <img src={proxiedImageUrl(src)} alt="" loading="lazy" className="size-full object-cover" />
                </button>
              );
            })}
          </div>
        ) : null}
        <input
          value={style.bgImageUrl}
          placeholder="https://…/image.jpg — 직접 입력"
          onChange={(e) => props.onStyleChange({ bgImageUrl: e.target.value })}
          className="ms-uline pb-1 text-xs text-muted-foreground"
        />
      </Group>

      <Group label="Scale">
        <div className="flex gap-1.5">
          {TEXT_SCALES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={style.textScale === option.value}
              onClick={() => props.onStyleChange({ textScale: option.value })}
              className="ms-pill"
            >
              {option.label}
            </button>
          ))}
        </div>
      </Group>

      <div className="border-t pt-5" style={{ borderColor: "var(--ms-hairline)" }}>
        <button
          type="button"
          className="ms-cta w-full"
          disabled={busy !== null}
          onClick={props.onDownload}
        >
          {busy === "download" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          PNG 다운로드
          <span className="ms-mono" style={{ color: "rgba(255,253,249,0.75)" }}>
            {platform.width}×{platform.height}
          </span>
        </button>
        <button
          type="button"
          className="ms-linkact mt-4 block w-full text-center text-destructive"
          style={{ textDecorationColor: "transparent" }}
          onClick={props.onDelete}
        >
          이 에셋 삭제
        </button>
      </div>
    </div>
  );
}

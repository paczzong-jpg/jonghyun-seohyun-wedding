import { ArrowDown, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HeroContent } from "@/lib/landing-content";

type Props = {
  content: HeroContent;
  className?: string;
};

export function HeroSection({ content, className }: Props) {
  const {
    badge,
    headline,
    subheadline,
    primaryCta,
    primaryCtaUrl,
    secondaryCta,
    secondaryCtaAnchor,
    stats,
  } = content;

  return (
    <section
      className={cn(
        "relative flex min-h-screen items-center justify-center overflow-hidden bg-foreground px-6 text-center text-background",
        className,
      )}
    >
      <div className="mx-auto max-w-4xl py-32">
        <Badge
          variant="outline"
          className="mb-6 border-background/20 bg-background/10 px-4 py-1.5 text-sm text-background/90"
        >
          <Sparkles className="mr-1.5 size-3.5" />
          {badge}
        </Badge>

        {/* whitespace-pre-line: 데이터의 \n 을 줄바꿈으로 처리 */}
        <h1 className="mb-5 whitespace-pre-line text-4xl font-bold leading-tight tracking-tight text-background sm:text-5xl lg:text-6xl">
          {headline}
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-background/70 sm:text-xl">
          {subheadline}
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          {/* Primary CTA — 신청 폼으로 이동 */}
          <Button
            asChild
            size="lg"
            className="rounded-xl px-8 py-6 text-base font-bold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            <a href={primaryCtaUrl} target="_blank" rel="noopener noreferrer">
              {primaryCta}
            </a>
          </Button>

          {/* Secondary CTA — 페이지 내 앵커 스크롤 */}
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-xl border-2 border-background/30 bg-background/10 px-8 py-6 text-base font-semibold text-background hover:border-background/50 hover:bg-background/20 hover:text-background"
          >
            <a href={secondaryCtaAnchor}>{secondaryCta}</a>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 flex items-center justify-center text-sm text-background/50">
          {stats.map((stat, i) => (
            <div key={stat.label} className="flex items-center">
              {i > 0 && (
                <div aria-hidden className="mx-8 h-8 w-px bg-background/20" />
              )}
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold text-background">{stat.value}</span>
                <span>{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 스크롤 유도 화살표 */}
        <a
          href="#pain-points"
          aria-label="아래로 스크롤"
          className="mt-12 inline-flex animate-bounce items-center text-background/30 transition-colors hover:text-background/60"
        >
          <ArrowDown className="size-5" />
        </a>
      </div>
    </section>
  );
}

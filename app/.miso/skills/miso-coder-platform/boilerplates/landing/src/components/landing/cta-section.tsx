import { ExternalLink, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CtaContent } from "@/lib/landing-content";

type Props = {
  content: CtaContent;
  className?: string;
};

export function CtaSection({ content, className }: Props) {
  const { headline, description, primaryLabel, formUrl, note } = content;

  return (
    <section
      className={cn("relative overflow-hidden bg-foreground px-6 py-24 text-background", className)}
    >
      <div className="mx-auto max-w-2xl text-center">
        <Sparkles className="mx-auto mb-6 size-10 text-background" />

        <h2 className="mb-4 text-3xl font-bold tracking-tight text-background sm:text-4xl">
          {headline}
        </h2>
        <p className="mb-10 text-lg text-background/70">{description}</p>

        {/* 신청 CTA 버튼 — formUrl prop 으로 외부 폼 연결 */}
        <Button
          asChild
          size="lg"
          className="gap-2 px-10 py-7 text-lg font-bold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        >
          <a href={formUrl} target="_blank" rel="noopener noreferrer">
            {primaryLabel}
            <ExternalLink className="size-5" />
          </a>
        </Button>

        <p className="mt-6 text-sm text-background/50">{note}</p>
      </div>
    </section>
  );
}

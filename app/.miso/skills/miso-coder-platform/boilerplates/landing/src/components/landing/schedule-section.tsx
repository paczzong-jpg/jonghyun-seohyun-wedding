import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AccentTone, ScheduleContent } from "@/lib/landing-content";

type Props = {
  content: ScheduleContent;
  className?: string;
};

const PHASE_TONE: Record<AccentTone, { icon: string; date: string }> = {
  primary: {
    icon: "border-primary bg-primary/10 text-primary",
    date: "text-primary",
  },
  secondary: {
    icon: "border-secondary bg-secondary text-secondary-foreground",
    date: "text-secondary-foreground",
  },
  accent: {
    icon: "border-accent bg-accent text-accent-foreground",
    date: "text-accent-foreground",
  },
  muted: {
    icon: "border-muted bg-muted text-muted-foreground",
    date: "text-muted-foreground",
  },
  destructive: {
    icon: "border-destructive bg-destructive/10 text-destructive",
    date: "text-destructive",
  },
};

export function ScheduleSection({ content, className }: Props) {
  const { eyebrow, heading, subheading, phases } = content;

  return (
    <section
      id="schedule"
      className={cn("bg-background px-6 py-20 sm:py-24", className)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-3 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {heading}
          </h2>
          <p className="text-base leading-7 text-muted-foreground">{subheading}</p>
        </div>

        {/* Desktop: 수평 플로우 */}
        <div className="hidden lg:flex lg:items-start">
          {phases.map((phase, i) => {
            const Icon = phase.icon;
            const tone = PHASE_TONE[phase.accentTone];
            return (
              <div key={phase.phase} className="flex flex-1 items-start">
                <div className="flex flex-1 flex-col items-center gap-4 text-center">
                  <div
                    className={cn(
                      "flex size-14 items-center justify-center rounded-full border-2 shadow-sm",
                      tone.icon,
                    )}
                  >
                    <Icon className="size-6" />
                  </div>
                  <div className="max-w-[160px] space-y-1.5">
                    <p className="text-sm font-bold text-foreground">{phase.phase}</p>
                    <p className={cn("text-xs font-semibold", tone.date)}>
                      {phase.date}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {phase.description}
                    </p>
                  </div>
                </div>
                {i < phases.length - 1 && (
                  <div className="mt-5 shrink-0 text-muted-foreground/40">
                    <ChevronRight className="size-5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile: 수직 타임라인 */}
        <div className="flex flex-col lg:hidden">
          {phases.map((phase, i) => {
            const Icon = phase.icon;
            const tone = PHASE_TONE[phase.accentTone];
            return (
              <div key={phase.phase} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-full border-2",
                      tone.icon,
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  {i < phases.length - 1 && (
                    <div className="mt-1 min-h-8 w-0.5 flex-1 bg-border" />
                  )}
                </div>
                <div className="pb-8 pt-1">
                  <p className="text-sm font-bold text-foreground">{phase.phase}</p>
                  <p className={cn("mt-0.5 text-xs font-semibold", tone.date)}>
                    {phase.date}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {phase.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

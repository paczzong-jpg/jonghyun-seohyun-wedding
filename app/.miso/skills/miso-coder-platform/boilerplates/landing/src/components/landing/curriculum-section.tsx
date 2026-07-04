import { cn } from "@/lib/utils";
import type { AccentTone, CurriculumContent } from "@/lib/landing-content";

type Props = {
  content: CurriculumContent;
  className?: string;
};

const STEP_TONE: Record<
  AccentTone,
  { card: string; header: string; badge: string; label: string }
> = {
  primary: {
    card: "border-t-primary",
    header: "bg-primary/5",
    badge: "bg-primary text-primary-foreground",
    label: "bg-primary text-primary-foreground",
  },
  secondary: {
    card: "border-t-secondary",
    header: "bg-secondary/70",
    badge: "bg-secondary text-secondary-foreground",
    label: "bg-secondary text-secondary-foreground",
  },
  accent: {
    card: "border-t-accent",
    header: "bg-accent",
    badge: "bg-accent text-accent-foreground",
    label: "bg-accent text-accent-foreground",
  },
  muted: {
    card: "border-t-muted-foreground",
    header: "bg-muted",
    badge: "bg-muted text-muted-foreground",
    label: "bg-muted text-muted-foreground",
  },
  destructive: {
    card: "border-t-destructive",
    header: "bg-destructive/10",
    badge: "bg-destructive text-destructive-foreground",
    label: "bg-destructive text-destructive-foreground",
  },
};

export function CurriculumSection({ content, className }: Props) {
  const { eyebrow, heading, subheading, steps } = content;

  return (
    <section
      id="curriculum"
      className={cn("bg-card px-6 py-20 sm:py-24", className)}
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

        <div className="space-y-0">
          {steps.map((step, stepIdx) => {
            const tone = STEP_TONE[step.accentTone];

            return (
              <div key={step.badge}>
                {/* 스텝 간 연결선 */}
                {stepIdx > 0 && (
                  <div className="flex justify-center py-3">
                    <div className="h-8 w-0.5 bg-border" />
                  </div>
                )}

                <div
                  className={cn(
                    "overflow-hidden rounded-3xl border border-t-4 border-border bg-background",
                    tone.card,
                  )}
                >
                  {/* 스텝 헤더 */}
                  <div className={cn("border-b border-border px-8 py-6", tone.header)}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={cn("rounded-lg px-3 py-1 text-sm font-bold", tone.badge)}
                      >
                        {step.badge}
                      </span>
                      <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                  </div>

                  {/* 아이템 그리드 — 3개면 3열, 그 외 2열 */}
                  <div
                    className={cn(
                      "grid gap-4 p-8",
                      step.items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
                    )}
                  >
                    {step.items.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:shadow-sm"
                      >
                        <span
                          className={cn(
                            "mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-bold",
                            tone.label,
                          )}
                        >
                          {item.label}
                        </span>
                        <p className="text-sm leading-relaxed text-foreground/80">
                          {item.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

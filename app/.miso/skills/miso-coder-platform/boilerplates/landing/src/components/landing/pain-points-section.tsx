import { cn } from "@/lib/utils";
import type { PainPointsContent } from "@/lib/landing-content";

type Props = {
  content: PainPointsContent;
  className?: string;
};

export function PainPointsSection({ content, className }: Props) {
  const { eyebrow, heading, items } = content;

  return (
    <section
      id="pain-points"
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
        </div>

        <ul className="grid gap-5 sm:grid-cols-2">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <li
                key={i}
                className="flex items-start gap-5 rounded-2xl border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <p className="whitespace-pre-line text-base leading-relaxed text-foreground/80">
                  {item.text}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

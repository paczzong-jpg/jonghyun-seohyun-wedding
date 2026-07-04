import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ValueGridContent } from "@/lib/landing-content";

type Props = {
  section: ValueGridContent;
  className?: string;
};

export function ValueGrid({ section, className }: Props) {
  const { eyebrow, heading, subheading, items } = section;

  return (
    <section
      id="value"
      className={cn("bg-background px-6 py-20 sm:py-24", className)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-4 text-center">
          <Badge
            variant="outline"
            className="rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-widest"
          >
            {eyebrow}
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {heading}
          </h2>
          <p className="text-base leading-7 text-muted-foreground">{subheading}</p>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Card className="h-full rounded-2xl border-border bg-card shadow-none transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="mb-3 flex items-start gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <span className="mt-3.5 text-xs font-bold tracking-wider text-muted-foreground">
                        {item.num}
                      </span>
                    </div>
                    <CardTitle className="text-base font-semibold text-foreground">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

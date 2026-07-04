import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { FaqContent } from "@/lib/landing-content";

type Props = {
  content: FaqContent;
  className?: string;
};

export function FaqSection({ content, className }: Props) {
  const { eyebrow, heading, items } = content;

  return (
    <section
      id="faq"
      className={cn("bg-muted/40 px-6 py-20 sm:py-24", className)}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {heading}
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {items.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="overflow-hidden rounded-2xl border border-border bg-card px-6 data-[state=open]:border-primary/30"
            >
              <AccordionTrigger className="py-5 text-left text-base font-semibold hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

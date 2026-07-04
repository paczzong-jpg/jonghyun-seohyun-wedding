import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { FooterContent } from "@/lib/landing-content";

type Props = {
  content: FooterContent;
  className?: string;
};

export function SiteFooter({ content, className }: Props) {
  const { brand, tagline, copyright, links } = content;

  return (
    <footer className={cn("mt-auto border-t border-border bg-background", className)}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* 브랜드 */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">{brand}</p>
            <p className="text-xs text-muted-foreground">{tagline}</p>
          </div>

          {/* 링크 — 앵커(#section) 또는 외부 URL(http/mailto)만 허용, bare # 금지 */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      link.href.startsWith("http") ? "noopener noreferrer" : undefined
                    }
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Separator className="my-6" />

        <p className="text-xs text-muted-foreground">{copyright}</p>
      </div>
    </footer>
  );
}

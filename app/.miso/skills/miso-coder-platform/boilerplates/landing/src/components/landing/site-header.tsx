import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavContent } from "@/lib/landing-content";

type Props = {
  content: NavContent;
};

export function SiteHeader({ content }: Props) {
  const { brand, items, ctaLabel, ctaHref } = content;
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/95 shadow-sm backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <a
          href="#"
          className={cn(
            "text-sm font-bold tracking-tight transition-colors",
            scrolled ? "text-foreground" : "text-white",
          )}
        >
          {brand}
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                scrolled
                  ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                  : "text-white/80 hover:text-white",
              )}
            >
              {item.label}
            </a>
          ))}
          <Button asChild size="sm" className="ml-3">
            <a href={ctaHref} target="_blank" rel="noopener noreferrer">
              {ctaLabel}
            </a>
          </Button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className={cn("md:hidden", scrolled ? "text-foreground" : "text-white")}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background/98 backdrop-blur-md md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-6 py-4">
            {items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {item.label}
              </a>
            ))}
            <Button asChild className="mt-3">
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
              >
                {ctaLabel}
              </a>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}

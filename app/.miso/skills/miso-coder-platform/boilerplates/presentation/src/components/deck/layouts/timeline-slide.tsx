import { Check } from "lucide-react";

import type { TimelineSlide } from "@/lib/deck/types";

export function TimelineSlideView({ slide }: { slide: TimelineSlide }) {
  return (
    <div className="absolute inset-0 flex flex-col px-[88px] pt-[84px] pb-[88px]">
      <header style={{ maxWidth: 860 }}>
        {slide.kicker && <div className="deck-kicker">{slide.kicker}</div>}
        <h2 className="deck-slide-title mt-[14px] whitespace-pre-line">{slide.title}</h2>
      </header>
      <div className="flex flex-1 items-center pb-[36px]">
        <div className="relative flex w-full gap-[28px]">
          {/* 연결선 */}
          <div
            className="absolute left-0 right-0"
            style={{ top: 11, height: 2, background: "var(--deck-line)" }}
          />
          {slide.steps.map((step) => {
          const status = step.status ?? "next";
          return (
            <div key={step.label} className="relative min-w-0 flex-1">
              <div
                className="relative z-10 grid h-[24px] w-[24px] place-items-center rounded-full"
                style={{
                  background:
                    status === "next" ? "var(--deck-bg)" : "var(--deck-accent)",
                  border:
                    status === "next"
                      ? "2px solid var(--deck-line)"
                      : "2px solid var(--deck-accent)",
                  boxShadow:
                    status === "now" ? "0 0 0 6px var(--deck-accent-soft)" : undefined,
                }}
              >
                {status === "done" && <Check size={13} strokeWidth={3.4} color="var(--deck-bg)" />}
                {status === "now" && (
                  <span className="h-[8px] w-[8px] rounded-full" style={{ background: "var(--deck-bg)" }} />
                )}
              </div>
              <div
                className="deck-kicker mt-[20px]"
                style={{ fontSize: 11.5, color: status === "next" ? "var(--deck-muted)" : "var(--deck-accent)" }}
              >
                {step.label}
              </div>
              <div className="mt-[10px] text-[18px] font-extrabold leading-snug" style={{ color: "var(--deck-ink)" }}>
                {step.title}
              </div>
              {step.desc && (
                <p className="deck-body mt-[8px] pr-[8px]" style={{ fontSize: 14 }}>
                  {step.desc}
                </p>
              )}
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );
}

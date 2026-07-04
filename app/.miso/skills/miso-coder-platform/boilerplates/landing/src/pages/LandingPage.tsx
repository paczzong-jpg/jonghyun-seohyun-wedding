import { CtaSection } from "@/components/landing/cta-section";
import { CurriculumSection } from "@/components/landing/curriculum-section";
import { FaqSection } from "@/components/landing/faq-section";
import { ValueGrid } from "@/components/landing/feature-grid";
import { HeroSection } from "@/components/landing/hero-section";
import { PainPointsSection } from "@/components/landing/pain-points-section";
import { ScheduleSection } from "@/components/landing/schedule-section";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import {
  ctaContent,
  curriculumContent,
  faqContent,
  footerContent,
  heroContent,
  navContent,
  painPointsContent,
  scheduleContent,
  valueGridContent,
} from "@/lib/landing-content";

// 섹션 추가/제거: 각 컴포넌트를 주석처리하거나 순서를 바꾸세요.
// 모든 카피·URL은 src/lib/landing-content.ts 에서 관리합니다.

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* SiteHeader: fixed 포지션 — 페이지 흐름에 영향 없음. Hero의 py-32 가 헤더 높이를 흡수함 */}
      <SiteHeader content={navContent} />
      <main>
        <HeroSection content={heroContent} />
        <PainPointsSection content={painPointsContent} />
        <ValueGrid section={valueGridContent} />
        <CurriculumSection content={curriculumContent} />
        <ScheduleSection content={scheduleContent} />
        <FaqSection content={faqContent} />
        <CtaSection content={ctaContent} />
      </main>
      <SiteFooter content={footerContent} />
    </div>
  );
}

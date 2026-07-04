import {
  CalendarDays,
  Cog,
  FlaskConical,
  HelpCircle,
  Lightbulb,
  MapPin,
  MessageSquare,
  Monitor,
  Rocket,
  Target,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

export type NavItem = { label: string; href: string };
export type NavContent = {
  brand: string;
  items: NavItem[];
  ctaLabel: string;
  ctaHref: string; // ★ 교체: 신청 폼 URL
};

export type HeroStat = { value: string; label: string };
export type HeroContent = {
  badge: string;
  headline: string;          // \n 으로 줄바꿈 가능
  subheadline: string;
  primaryCta: string;
  primaryCtaUrl: string;     // ★ 교체: 신청 폼 URL
  secondaryCta: string;
  secondaryCtaAnchor: string;
  stats: HeroStat[];
};

export type PainPointItem = { icon: LucideIcon; text: string };
export type PainPointsContent = {
  eyebrow: string;
  heading: string;
  items: PainPointItem[];
};

export type ValueItem = {
  id: string;
  num: string;
  icon: LucideIcon;
  title: string;
  description: string;
};
export type ValueGridContent = {
  eyebrow: string;
  heading: string;
  subheading: string;
  items: ValueItem[];
};

export type CurriculumItem = { label: string; title: string };
export type AccentTone = "primary" | "secondary" | "accent" | "muted" | "destructive";
export type CurriculumStep = {
  badge: string;
  title: string;
  description: string;
  accentTone: AccentTone;
  items: CurriculumItem[];
};
export type CurriculumContent = {
  eyebrow: string;
  heading: string;
  subheading: string;
  steps: CurriculumStep[];
};

export type SchedulePhase = {
  phase: string;
  icon: LucideIcon;
  date: string;
  description: string;
  accentTone: AccentTone;
};
export type ScheduleContent = {
  eyebrow: string;
  heading: string;
  subheading: string;
  phases: SchedulePhase[];
};

export type FaqItem = { question: string; answer: string };
export type FaqContent = {
  eyebrow: string;
  heading: string;
  items: FaqItem[];
};

export type CtaContent = {
  headline: string;
  description: string;
  primaryLabel: string;
  formUrl: string; // ★ 교체: Typeform / 네이버폼 / 구글폼 등
  note: string;
};

export type FooterLink = { label: string; href: string };
export type FooterContent = {
  brand: string;
  tagline: string;
  copyright: string;
  links: FooterLink[];
};

// ────────────────────────────────────────────────
// ★ 교체 지점 — 이 파일만 수정하세요
// ────────────────────────────────────────────────

export const navContent: NavContent = {
  brand: "프로그램명", // ★ 교체
  items: [
    { label: "고민", href: "#pain-points" },
    { label: "기대효과", href: "#value" },
    { label: "커리큘럼", href: "#curriculum" },
    { label: "일정", href: "#schedule" },
    { label: "FAQ", href: "#faq" },
  ],
  ctaLabel: "신청하기",
  ctaHref: "https://forms.typeform.com/to/YOUR_FORM_ID", // ★ 교체
};

export const heroContent: HeroContent = {
  badge: "2026년 상반기 모집 중",
  // ★ 프로그램 핵심 메시지 (최대 2줄, \n 으로 줄바꿈)
  headline: "일하는 방식을 바꾸는\n5주 실전 프로그램",
  // ★ 핵심 가치 한두 문장 (150자 이내 권장)
  subheadline:
    "이론 강의가 아닙니다. 내 업무의 진짜 문제를 가져와서, AI와 함께 해결책을 만들어가는 실전 프로그램입니다.",
  primaryCta: "지금 신청하기",
  primaryCtaUrl: "https://forms.typeform.com/to/YOUR_FORM_ID", // ★ 교체
  secondaryCta: "커리큘럼 보기",
  secondaryCtaAnchor: "#curriculum",
  stats: [
    { value: "5주", label: "총 과정 기간" },
    { value: "주 1회", label: "온라인 세션" },
    { value: "1일", label: "오프라인 워크숍" },
  ],
};

export const painPointsContent: PainPointsContent = {
  eyebrow: "Pain Points",
  heading: "혹시, 이런 고민 하고 계신가요?",
  items: [
    {
      icon: Cog,
      text: "새로운 도구를 배웠지만\n실제 업무에 어떻게 적용할지 막막해요.",
    },
    {
      icon: HelpCircle,
      text: "뭐부터 시작해야 할지 모르겠고\n혼자 실습하면 금방 잊어버려요.",
    },
    {
      icon: Users,
      text: "나만 쓰는 게 아니라\n동료들도 함께 변화했으면 좋겠어요.",
    },
    {
      icon: Lightbulb,
      text: "배운 것을 실제 업무 성과로\n연결하는 방법을 모르겠어요.",
    },
  ],
};

export const valueGridContent: ValueGridContent = {
  eyebrow: "기대효과",
  heading: "과정을 마치고 나면, 이렇게 달라집니다",
  subheading:
    "5주 후에는 도구를 다루는 것을 넘어, 문제를 정의하고 해결책을 만드는 역량이 생깁니다.",
  items: [
    {
      id: "value-apply",
      num: "01",
      icon: Wrench,
      title: "즉시 적용 가능한 실전 역량",
      description:
        "AI 툴을 업무에 바로 쓸 수 있게 됩니다. 추상적인 개념이 아닌, 내 업무 흐름에 최적화된 사용법을 익힙니다.",
    },
    {
      id: "value-problem",
      num: "02",
      icon: Target,
      title: "문제를 정의하는 눈",
      description:
        "체계적인 방법론으로 현업의 핵심 문제를 정확히 짚어냅니다. 증상이 아닌 원인에서 해결책을 찾습니다.",
    },
    {
      id: "value-prototype",
      num: "03",
      icon: Rocket,
      title: "현장 검증된 솔루션",
      description:
        "워크숍에서 직접 만든 프로토타입을 현장에 적용해봅니다. 아이디어를 실제 결과물로 완성하는 경험을 쌓습니다.",
    },
    {
      id: "value-growth",
      num: "04",
      icon: TrendingUp,
      title: "측정 가능한 성장",
      description:
        "결과 공유회에서 팀별 성과를 발표하고 피드백을 받습니다. 수료 후에도 이어지는 성장 네트워크가 생깁니다.",
    },
  ],
};

export const curriculumContent: CurriculumContent = {
  eyebrow: "Curriculum",
  heading: "커리큘럼",
  subheading: "온라인 빌드업부터 현장 검증까지, 하나로 연결된 학습 여정입니다.",
  steps: [
    {
      badge: "Step 1",
      title: "온라인 빌드업",      // ★ 교체: 주차 수 및 세션 제목
      description: "매주 진행하는 온라인 세션으로 방법론과 도구를 단계적으로 익힙니다.",
      accentTone: "primary",
      items: [
        { label: "1주차", title: "과정 소개 및 방법론 이해" },
        { label: "2주차", title: "공감 & 문제정의 — 핵심 Pain Point 발굴" },
        { label: "3주차", title: "아이디에이션 & 프로토타입 설계" },
        { label: "4주차", title: "AI 툴 심화 실습" }, // ★ 교체
      ],
    },
    {
      badge: "Step 2",
      title: "오프라인 집중 워크숍",
      description: "하루 동안 현업 문제를 직접 해결하는 실전 솔루션을 만들어냅니다.",
      accentTone: "secondary",
      items: [
        { label: "Session 1", title: "우수 활용 사례 & 아이디어 시드" },
        { label: "Session 2", title: "디자인씽킹 기반 핵심 문제 재정의" },
        { label: "Session 3", title: "즉시 실행 가능한 프로토타입 제작" },
      ],
    },
    {
      badge: "Step 3",
      title: "현장 적용 & 결과 공유",
      description: "프로토타입을 실제 업무에 적용하고, 팀과 함께 성과를 나눕니다.",
      accentTone: "accent",
      items: [
        { label: "필드 테스트", title: "1주간 실제 업무에 솔루션 적용" },
        { label: "결과 공유회", title: "팀별 성과 발표 및 개선 피드백" },
      ],
    },
  ],
};

export const scheduleContent: ScheduleContent = {
  eyebrow: "Schedule",
  heading: "운영 일정",
  subheading: "모집부터 결과 공유까지, 전체 타임라인을 확인하세요.",
  phases: [
    {
      phase: "모집",
      icon: CalendarDays,
      date: "★ 교체: 모집 기간",
      description: "신청 폼을 통해 지원합니다. 선착순 마감.",
      accentTone: "primary",
    },
    {
      phase: "온라인 과정",
      icon: Monitor,
      date: "★ 교체: 온라인 세션 일정",
      description: "매주 정해진 요일 온라인 세션 진행. (총 4주)",
      accentTone: "secondary",
    },
    {
      phase: "오프라인 워크숍",
      icon: MapPin,
      date: "★ 교체: 워크숍 날짜 및 장소",
      description: "하루 집중 워크숍. 실전 솔루션 제작.",
      accentTone: "accent",
    },
    {
      phase: "현장 테스트",
      icon: FlaskConical,
      date: "★ 교체: 테스트 기간",
      description: "1주간 실제 업무에 프로토타입 적용.",
      accentTone: "muted",
    },
    {
      phase: "결과 공유회",
      icon: MessageSquare,
      date: "★ 교체: 공유회 날짜",
      description: "팀별 성과 발표 및 온라인 공유.",
      accentTone: "destructive",
    },
  ],
};

export const faqContent: FaqContent = {
  eyebrow: "FAQ",
  heading: "자주 묻는 질문",
  items: [
    {
      question: "사전 지식이 없어도 참여할 수 있나요?",
      answer:
        "네, 입문자도 따라올 수 있도록 설계되었습니다. 온라인 빌드업 과정에서 필요한 기초를 단계적으로 익힌 뒤 오프라인 워크숍에 참여하게 됩니다.",
    },
    {
      question: "한 기수당 몇 명이 참여하나요?",
      answer:
        "★ 교체: 기수당 참여 인원을 명시하세요. 소규모로 운영하여 참가자 개개인에게 충분한 관심을 드립니다.",
    },
    {
      question: "온라인 세션은 실시간인가요, 녹화본인가요?",
      answer:
        "★ 교체: 실시간 또는 VOD 여부를 명시하세요. 기수에 따라 운영 방식이 다를 수 있습니다.",
    },
    {
      question: "오프라인 워크숍 참석이 필수인가요?",
      answer:
        "네, 오프라인 워크숍은 과정의 핵심입니다. 일정상 참석이 어려운 경우 다음 차수 신청을 권장드립니다.",
    },
    {
      question: "개인 신청인가요, 팀 신청인가요?",
      answer:
        "개인 단위로 신청합니다. 오프라인 워크숍에서 운영진이 팀을 구성해드리므로 혼자 오셔도 괜찮습니다.",
    },
    {
      question: "수료 후 어떤 혜택이 있나요?",
      answer:
        "★ 교체: 수료증, 네트워크, 우수 아이디어 지원 등 혜택을 구체적으로 명시하세요.",
    },
  ],
};

export const ctaContent: CtaContent = {
  headline: "망설이면 모집 마감됩니다",
  description:
    "지금 신청하고 5주 후 달라진 업무 방식을 경험하세요. 선착순 모집으로 조기 마감될 수 있습니다.",
  primaryLabel: "신청 폼 바로가기",
  formUrl: "https://forms.typeform.com/to/YOUR_FORM_ID", // ★ 교체
  note: "신청 후 영업일 이내 확인 이메일이 발송됩니다.",
};

export const footerContent: FooterContent = {
  brand: "브랜드명",                       // ★ 교체
  tagline: "브랜드 태그라인을 입력하세요.", // ★ 교체
  copyright: "© 2026 브랜드명. All rights reserved.", // ★ 교체
  links: [
    { label: "개인정보처리방침", href: "https://example.com/privacy" }, // ★ 교체
    { label: "이용약관",         href: "https://example.com/terms"   }, // ★ 교체
    { label: "문의하기",         href: "mailto:hello@example.com"    }, // ★ 교체
  ],
};

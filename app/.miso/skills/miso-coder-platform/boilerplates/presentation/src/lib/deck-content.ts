import {
  Compass,
  Gauge,
  HeartHandshake,
  Layers,
  Puzzle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";

import type { DeckConfig, SlideSpec } from "@/lib/deck/types";

// ────────────────────────────────────────────────
// ★ 이 파일이 덱의 전부다 — 카피·데이터·순서·테마를 여기서만 수정한다.
//    레이아웃 종류와 필드는 src/lib/deck/types.ts 참조.
// ────────────────────────────────────────────────

export const deckConfig: DeckConfig = {
  title: "NOVA 2026 상반기 비즈니스 리뷰", // ★ 교체: 덱 제목 (탭 · PPTX 파일명)
  footer: "NOVA · Confidential", // ★ 교체: 슬라이드 하단 푸터
  pageNumbers: true,
  // 테마 22종 — 전체 목록·미리보기는 src/lib/deck/themes.ts 의 DECK_THEMES 참조
  // 다크: aurora noir cobalt midnight crimson plum ember steel moss royal terminal
  // 라이트: editorial slate verdant porcelain latte ocean blush sunrise pop newsprint lavender
  theme: "aurora",
};

export const slides: SlideSpec[] = [
  {
    layout: "title",
    kicker: "H1 2026 Business Review",
    title: "일하는 방식을\n다시 설계하다",
    subtitle: "NOVA 플랫폼 상반기 성과와 하반기 성장 전략을 공유합니다.",
    presenter: "전략기획팀 · 김지원",
    date: "2026. 07. 02",
    notes: "인사 후 30초 안에 오늘의 결론(하반기 투자 확대 제안)을 먼저 말한다.",
  },
  {
    layout: "agenda",
    title: "오늘 다룰\n네 가지",
    items: [
      { label: "상반기 하이라이트", note: "핵심 지표와 성장 곡선" },
      { label: "시장과 고객", note: "고객이 NOVA를 선택한 이유" },
      { label: "제품 로드맵", note: "하반기 릴리스와 요금제 개편" },
      { label: "팀과 제안", note: "조직 현황과 투자 요청" },
    ],
  },
  {
    layout: "section",
    index: "01",
    title: "상반기 하이라이트",
    subtitle: "여섯 달 동안 숫자가 말해준 것",
  },
  {
    layout: "metrics",
    kicker: "Key Metrics",
    title: "모든 핵심 지표가\n목표를 넘었습니다",
    items: [
      { value: "128억", label: "ARR", delta: "+42% YoY", trend: "up" },
      { value: "118%", label: "NRR", delta: "+6%p", trend: "up" },
      { value: "214개사", label: "신규 고객", delta: "+38% YoY", trend: "up" },
      { value: "1.8개월", label: "온보딩 기간", delta: "-55%", trend: "down" },
    ],
  },
  {
    layout: "chart",
    kicker: "Revenue",
    title: "분기별 ARR 성장",
    chart: {
      kind: "bar",
      labels: ["25 Q3", "25 Q4", "26 Q1", "26 Q2"],
      series: [
        { name: "신규", data: [14, 18, 24, 31] },
        { name: "확장", data: [8, 11, 16, 22] },
      ],
      unit: "억",
    },
    takeaways: [
      "확장 매출 비중이 36%에서 41%로 상승 — 기존 고객이 성장을 견인",
      "Q2 신규 계약의 60%가 엔터프라이즈 세그먼트",
      "영업 사이클은 평균 3.2개월로 전년 대비 20% 단축",
    ],
  },
  {
    layout: "statement",
    background: "invert",
    text: "성장의 병목은 수요가 아니라 온보딩이었습니다.",
    highlight: "온보딩",
    attribution: "2026년 3월, 전사 회고에서",
    notes: "이 문장이 상반기 전체 전략을 요약한다. 잠시 멈추고 청중을 본다.",
  },
  {
    layout: "section",
    index: "02",
    title: "시장과 고객",
    subtitle: "고객의 언어로 검증한 제품 가치",
  },
  {
    layout: "quote",
    quote: "도입 첫 주에 현업 팀이 스스로 워크플로우를 만들기 시작했습니다.\n이런 제품은 처음이었어요.",
    name: "박서연",
    role: "한빛제조 디지털혁신실 CTO",
  },
  {
    layout: "cards",
    kicker: "Why NOVA",
    title: "고객이 NOVA를\n선택한 네 가지 이유",
    cards: [
      {
        icon: Zap,
        title: "빠른 도입",
        desc: "평균 1.8개월 만에 전사 롤아웃. 업계 평균의 절반입니다.",
        tag: "Speed",
      },
      {
        icon: Puzzle,
        title: "유연한 연동",
        desc: "이미 쓰는 40여 개 SaaS와 코드 없이 연결됩니다.",
        tag: "Integration",
      },
      {
        icon: ShieldCheck,
        title: "엔터프라이즈 보안",
        desc: "ISO 27001·SOC 2 Type II, 국내 리전 데이터 상주.",
        tag: "Security",
      },
      {
        icon: HeartHandshake,
        title: "성공 파트너십",
        desc: "전담 CSM이 분기 단위 성과 리뷰까지 함께합니다.",
        tag: "Success",
      },
    ],
  },
  {
    layout: "text-image",
    kicker: "Onboarding Redesign",
    title: "온보딩을 제품의\n일부로 만들다",
    body: [
      "설치 가이드 문서를 없애고, 첫 로그인부터 팀의 실제 데이터로 시작하는 인터랙티브 온보딩을 구축했습니다.",
    ],
    bullets: [
      "가입 즉시 샘플이 아닌 실데이터로 첫 워크플로우 생성",
      "단계별 체크리스트가 팀 진행률을 자동 추적",
      "막히는 지점에서 CSM 콜을 원클릭 예약",
    ],
    image: {
      alt: "새 온보딩 화면 미리보기",
      caption: "6월 릴리스된 온보딩 홈 — 팀 진행률 대시보드",
    },
    imageSide: "right",
  },
  {
    layout: "media",
    image: { alt: "고객 워크숍 현장" },
    title: "현장에서 만난 NOVA",
    caption: "상반기 12개 도시, 34회 고객 워크숍 — 참가자 1,800명",
  },
  {
    layout: "section",
    index: "03",
    title: "제품 로드맵",
    subtitle: "하반기, 플랫폼에서 생태계로",
  },
  {
    layout: "timeline",
    kicker: "2026 Roadmap",
    title: "분기별 실행 계획",
    steps: [
      {
        label: "Q1",
        title: "온보딩 2.0",
        desc: "인터랙티브 온보딩 전면 적용",
        status: "done",
      },
      {
        label: "Q2",
        title: "오토메이션 허브",
        desc: "노코드 자동화 빌더 출시",
        status: "done",
      },
      {
        label: "Q3",
        title: "파트너 API",
        desc: "외부 개발자 생태계 개방",
        status: "now",
      },
      {
        label: "Q4",
        title: "AI 코파일럿",
        desc: "워크플로우 자동 생성·요약",
        status: "next",
      },
      {
        label: "27 Q1",
        title: "글로벌 리전",
        desc: "일본·싱가포르 진출",
        status: "next",
      },
    ],
  },
  {
    layout: "compare",
    kicker: "Pricing",
    title: "요금제 개편안",
    columns: [
      {
        title: "Starter",
        tag: "무료",
        points: ["10명까지 무제한 워크플로우", "커뮤니티 지원", "기본 연동 12종"],
      },
      {
        title: "Growth",
        tag: "추천",
        highlight: true,
        points: [
          "인원 무제한 · 사용량 기반 과금",
          "오토메이션 허브 포함",
          "전담 CSM · SLA 99.9%",
          "감사 로그 · SSO",
        ],
      },
      {
        title: "Enterprise",
        tag: "맞춤",
        points: ["전용 리전 · 프라이빗 배포", "파트너 API 무제한", "온사이트 교육"],
      },
    ],
  },
  {
    layout: "table",
    kicker: "Competitive Landscape",
    title: "경쟁 구도 한눈에",
    columns: ["", "NOVA", "A사", "B사", "C사"],
    rows: [
      ["온보딩 기간", "1.8개월", "3.5개월", "4.1개월", "2.9개월"],
      ["노코드 자동화", "포함", "애드온", "미지원", "애드온"],
      ["국내 리전", "제공", "제공", "미제공", "미제공"],
      ["NRR", "118%", "104%", "97%", "109%"],
      ["연동 커넥터", "43종", "28종", "17종", "31종"],
    ],
    emphasisCol: 1,
  },
  {
    layout: "chart",
    background: "soft",
    kicker: "Revenue Mix",
    title: "매출 구성 변화",
    chart: {
      kind: "donut",
      labels: ["구독", "사용량", "프로페셔널 서비스", "파트너"],
      series: [{ name: "비중", data: [58, 24, 12, 6] }],
      unit: "%",
    },
    takeaways: [
      "사용량 기반 매출이 1년 만에 9% → 24%로 확대",
      "파트너 매출은 하반기 API 개방 이후 본격화 예상",
    ],
  },
  {
    layout: "gallery",
    kicker: "Brand Refresh",
    title: "다음 분기 공개될\n새 브랜드",
    images: [
      { alt: "새 로고 시안", caption: "로고 — 연결과 확장의 노드" },
      { alt: "웹사이트 리뉴얼 시안", caption: "웹사이트 — 제품 중심 내러티브" },
      { alt: "행사 키비주얼 시안", caption: "NOVA CONF 2026 키비주얼" },
    ],
  },
  {
    layout: "team",
    kicker: "Leadership",
    title: "실행을 이끄는 사람들",
    people: [
      { name: "김지원", role: "CEO · 전략총괄" },
      { name: "이도현", role: "CTO · 플랫폼" },
      { name: "박민서", role: "CPO · 프로덕트" },
      { name: "최하람", role: "CRO · 세일즈" },
    ],
  },
  {
    layout: "bullets",
    kicker: "H2 Priorities",
    title: "하반기 실행 과제",
    columns: 2,
    bullets: [
      {
        icon: Rocket,
        title: "파트너 API 공개",
        desc: "9월 개발자 베타, 11월 GA. 초기 파트너 20개사 확보.",
      },
      {
        icon: Sparkles,
        title: "AI 코파일럿 베타",
        desc: "워크플로우 자동 생성 — 디자인 파트너 10개사와 검증.",
      },
      {
        icon: Gauge,
        title: "온보딩 1개월 벽 돌파",
        desc: "셀프서브 완결률 70%를 목표로 마찰 지점 제거.",
      },
      {
        icon: Compass,
        title: "일본 시장 조사",
        desc: "현지 파트너 2곳과 PoC, 27년 1분기 진출 판단.",
      },
      {
        icon: Layers,
        title: "요금제 전환",
        desc: "기존 고객 마이그레이션 — 이탈 없이 4분기 내 완료.",
      },
      {
        icon: Workflow,
        title: "운영 자동화",
        desc: "내부 운영도 NOVA로 — 도그푸딩 지표를 분기 보고.",
      },
    ],
  },
  {
    layout: "end",
    title: "함께 만들\n하반기입니다",
    message: "질문과 제안은 언제든 환영합니다.",
    contact: [
      { label: "Email", value: "strategy@nova.io" },
      { label: "Docs", value: "nova.io/h1-review" },
    ],
  },
];

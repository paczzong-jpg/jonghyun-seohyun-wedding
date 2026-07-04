import {
  BookOpenText,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  ListChecks,
  ScrollText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ────────────────────────────────────────────────
// ★ 앱 브랜딩·프리셋 교체 지점 — 카피는 이 파일에서만 수정한다.
// ────────────────────────────────────────────────

export const APP_NAME = "Lumen"; // ★ 교체: 서비스 이름
export const APP_TAGLINE = "소스를 이해하는 리서치 노트북"; // ★ 교체: 한 줄 소개

/** 노트북 카드 커버 색 팔레트 (키 = DB color 값) */
export const NOTEBOOK_COLORS: Record<string, { bg: string; fg: string }> = {
  iris: { bg: "#EEF0FF", fg: "#4F46E5" },
  teal: { bg: "#E6F7F4", fg: "#0F766E" },
  amber: { bg: "#FFF4E0", fg: "#B45309" },
  rose: { bg: "#FDEEF2", fg: "#BE185D" },
  slate: { bg: "#EEF2F6", fg: "#334155" },
  moss: { bg: "#ECF5EA", fg: "#3F6212" },
};

export const DEFAULT_COLOR = "iris";

/** 스튜디오 변환 프리셋 — NotebookLM 스타일 원클릭 산출물 */
export interface TransformPreset {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  /** 노트 제목 접두 */
  noteTitle: string;
  instruction: string;
}

export const TRANSFORM_PRESETS: TransformPreset[] = [
  {
    id: "summary",
    label: "요약",
    desc: "전체 소스의 핵심을 한 페이지로",
    icon: ScrollText,
    noteTitle: "요약",
    instruction:
      "모든 소스를 종합해 핵심 요약을 작성하세요. 구조: 한 줄 결론 → 핵심 내용 4~6개 불릿(각 불릿에 인용) → 시사점 2~3개.",
  },
  {
    id: "insights",
    label: "핵심 인사이트",
    desc: "소스를 관통하는 통찰 도출",
    icon: Lightbulb,
    noteTitle: "핵심 인사이트",
    instruction:
      "소스들을 비교·연결해서 표면적 요약이 아닌 통찰 5개를 도출하세요. 각 인사이트는 '제목 — 근거와 의미 2~3문장(인용 포함)' 형식.",
  },
  {
    id: "study-guide",
    label: "학습 가이드",
    desc: "개념·용어·복습 질문 정리",
    icon: GraduationCap,
    noteTitle: "학습 가이드",
    instruction:
      "학습 가이드를 만드세요. 구조: 핵심 개념 정리(용어: 설명) → 반드시 이해해야 할 포인트 → 복습 질문 5개(답 포함, 접기 없이). 모두 인용 포함.",
  },
  {
    id: "faq",
    label: "FAQ",
    desc: "예상 질문과 답 6개",
    icon: HelpCircle,
    noteTitle: "FAQ",
    instruction:
      "이 소스들을 처음 접하는 사람이 물을 법한 질문 6개와 답을 작성하세요. 형식: '**Q. 질문**' 다음 줄에 답변(인용 포함).",
  },
  {
    id: "briefing",
    label: "브리핑 문서",
    desc: "의사결정용 개요 문서",
    icon: BookOpenText,
    noteTitle: "브리핑 문서",
    instruction:
      "의사결정자를 위한 브리핑 문서를 작성하세요. 구조: 배경 → 현황 요약 → 핵심 쟁점 3개 → 권고사항. 간결한 비즈니스 문체, 인용 포함.",
  },
  {
    id: "action-items",
    label: "액션 아이템",
    desc: "실행 항목 추출",
    icon: ListChecks,
    noteTitle: "액션 아이템",
    instruction:
      "소스에서 실행 가능한 액션 아이템을 추출해 체크리스트로 정리하세요. 각 항목: '- [ ] 할 일 — 근거(인용)'. 우선순위 순 정렬.",
  },
];

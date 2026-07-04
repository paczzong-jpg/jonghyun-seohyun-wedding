import type { ArchetypeId } from "./types";
import type { PlatformSpec } from "./platforms";

// 크리에이티브 컴포지션 아키타입 — AI 이미지 생성 대신 결정적 온브랜드 레이아웃을 쓴다.
// 렌더 구현은 src/components/marketing/archetypes/ 에 1:1 대응.

export type ArchetypeMeta = {
  id: ArchetypeId;
  label: string;
  description: string;
};

export const ARCHETYPES: ArchetypeMeta[] = [
  {
    id: "gradient",
    label: "그라디언트 히어로",
    description: "브랜드 색 대각 그라디언트 + 좌하단 텍스트 스택",
  },
  {
    id: "split",
    label: "스플릿 패널",
    description: "텍스트 패널과 브랜드 색 블록의 2분할 구도",
  },
  {
    id: "badge",
    label: "센터 배지",
    description: "중앙 정렬 + 프레임 라인 + 캡슐 CTA",
  },
  {
    id: "outline",
    label: "아웃라인 타이포",
    description: "대형 아웃라인 헤드라인의 타이포 중심 구도",
  },
  {
    id: "photo",
    label: "포토 백드롭",
    description: "이미지 배경 + 하단 스크림 위 텍스트 (이미지 없으면 딥 그라디언트)",
  },
  {
    id: "pattern",
    label: "패턴 카드",
    description: "브랜드 색 기하 패턴 배경 + 중앙 카드",
  },
];

export function getArchetype(id: ArchetypeId): ArchetypeMeta {
  return ARCHETYPES.find((a) => a.id === id) ?? ARCHETYPES[0];
}

// 에셋 일괄 생성 시 아키타입 자동 배정 — 플랫폼 기본값에서 시작해
// 컨셉 인덱스만큼 회전시켜 같은 플랫폼이라도 컨셉마다 다른 구도가 나오게 한다.
export function assignArchetype(
  platform: PlatformSpec,
  conceptIndex: number,
  hasImage: boolean,
): ArchetypeId {
  const order: ArchetypeId[] = ["gradient", "split", "badge", "outline", "photo", "pattern"];
  const start = order.indexOf(platform.defaultArchetype);
  for (let step = 0; step < order.length; step += 1) {
    const candidate = order[(start + conceptIndex + step) % order.length];
    if (candidate === "photo" && !hasImage) continue;
    return candidate;
  }
  return "gradient";
}

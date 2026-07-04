/**
 * Lozenge — Atlassian Design System 시그니처 상태 배지.
 * pill-shaped, 대문자, 카테고리 색상. bi-theme.css의 .bi-lozenge-* 토큰을 쓴다.
 * BI에서 인사이트 유형·데이터 품질·필드 타입 표시에 재사용한다.
 */

import { cn } from "@/lib/utils";

export type LozengeTone = "default" | "info" | "success" | "warning" | "danger" | "discovery";

const TONE_CLASS: Record<LozengeTone, string> = {
  default: "bi-lozenge-default",
  info: "bi-lozenge-info",
  success: "bi-lozenge-success",
  warning: "bi-lozenge-warning",
  danger: "bi-lozenge-danger",
  discovery: "bi-lozenge-discovery",
};

export function Lozenge({
  tone = "default",
  className,
  children,
}: {
  tone?: LozengeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn("bi-lozenge", TONE_CLASS[tone], className)}>{children}</span>;
}

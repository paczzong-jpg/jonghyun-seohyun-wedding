import { FileText, FileType2, Globe, NotebookText, ScrollText } from "lucide-react";

import type { SourceType } from "@/lib/notebook/types";

const ICONS = {
  pdf: { icon: FileText, bg: "#FDEEEE", fg: "#C0392B" },
  docx: { icon: FileType2, bg: "#EAF1FB", fg: "#1D5BD6" },
  url: { icon: Globe, bg: "#E9F6F1", fg: "#0F766E" },
  markdown: { icon: ScrollText, bg: "#F3EEFB", fg: "#7C3AED" },
  text: { icon: NotebookText, bg: "#FFF4E0", fg: "#B45309" },
} as const satisfies Record<SourceType, unknown>;

export function SourceIcon({ type, size = 34 }: { type: SourceType; size?: number }) {
  const spec = ICONS[type] ?? ICONS.text;
  const Icon = spec.icon;
  return (
    <span
      className="grid flex-none place-items-center rounded-[10px]"
      style={{ width: size, height: size, background: spec.bg, color: spec.fg }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.1} />
    </span>
  );
}

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  pdf: "PDF",
  docx: "DOCX",
  url: "웹페이지",
  markdown: "Markdown",
  text: "텍스트",
};

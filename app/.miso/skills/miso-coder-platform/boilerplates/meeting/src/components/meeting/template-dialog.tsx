import { useEffect, useState } from "react";
import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createTemplate, deleteTemplate, updateTemplate } from "@/lib/meeting/db";
import type { MinutesTemplate, TemplateSection } from "@/lib/meeting/types";

// ────────────────────────────────────────────────
// 회의록 템플릿 관리 다이얼로그.
// 템플릿 = 섹션(제목 + 작성 지침) 목록 — LLM 프롬프트로 그대로 전달된다.
// ────────────────────────────────────────────────

interface EditorState {
  id: string | null; // null = 새 템플릿
  name: string;
  description: string;
  sections: TemplateSection[];
}

const EMPTY: EditorState = {
  id: null,
  name: "",
  description: "",
  sections: [{ title: "핵심 논의", guidance: "주요 논의 내용을 정리" }],
};

export interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: MinutesTemplate[];
  onChanged: () => void;
}

export function TemplateDialog({ open, onOpenChange, templates, onChanged }: TemplateDialogProps) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setEditor(null);
  }, [open]);

  const startEdit = (template: MinutesTemplate) => {
    setEditor({
      id: template.id,
      name: template.name,
      description: template.description,
      sections: template.sections.map((s) => ({ ...s })),
    });
  };

  const save = async () => {
    if (!editor) return;
    const name = editor.name.trim();
    const sections = editor.sections
      .map((s) => ({ title: s.title.trim(), guidance: s.guidance.trim() }))
      .filter((s) => s.title);
    if (!name || sections.length === 0) {
      toast.error("템플릿 이름과 섹션을 1개 이상 입력해주세요");
      return;
    }
    setSaving(true);
    try {
      if (editor.id) {
        await updateTemplate(editor.id, { name, description: editor.description.trim(), sections });
      } else {
        await createTemplate({ name, description: editor.description.trim(), sections });
      }
      toast.success("템플릿을 저장했습니다");
      setEditor(null);
      onChanged();
    } catch {
      toast.error("템플릿 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (template: MinutesTemplate) => {
    if (templates.length <= 1) {
      toast.error("템플릿은 최소 1개가 필요합니다");
      return;
    }
    try {
      await deleteTemplate(template.id);
      onChanged();
    } catch {
      toast.error("삭제에 실패했습니다");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="mn-display">회의록 템플릿</DialogTitle>
          <DialogDescription>
            섹션 구조와 작성 지침을 정의하면 AI 가 그 양식대로 회의록을 작성합니다.
          </DialogDescription>
        </DialogHeader>

        {editor === null ? (
          <div className="mn-scroll -mx-1 max-h-[55vh] space-y-1.5 overflow-y-auto px-1">
            {templates.map((template) => (
              <div key={template.id} className="mn-card flex items-center gap-3 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {template.name}
                    {template.builtin ? (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                        기본
                      </Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {template.description || template.sections.map((s) => s.title).join(" · ")}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => startEdit(template)}>
                  편집
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => void remove(template)}
                  title="삭제"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" className="mt-2 w-full gap-1.5" onClick={() => setEditor({ ...EMPTY, sections: EMPTY.sections.map((s) => ({ ...s })) })}>
              <PlusIcon className="size-4" />
              새 템플릿
            </Button>
          </div>
        ) : (
          <div className="mn-scroll -mx-1 max-h-[55vh] space-y-3 overflow-y-auto px-1">
            <div className="space-y-1.5">
              <Input
                value={editor.name}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                placeholder="템플릿 이름 (예: 주간 리뷰)"
              />
              <Input
                value={editor.description}
                onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                placeholder="설명 (선택)"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">섹션</p>
              {editor.sections.map((section, i) => (
                <div key={i} className="mn-card space-y-1.5 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <GripVerticalIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <Input
                      value={section.title}
                      onChange={(e) => {
                        const sections = [...editor.sections];
                        sections[i] = { ...section, title: e.target.value };
                        setEditor({ ...editor, sections });
                      }}
                      placeholder="섹션 제목 (예: 결정 사항)"
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setEditor({ ...editor, sections: editor.sections.filter((_, j) => j !== i) })
                      }
                      disabled={editor.sections.length <= 1}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={section.guidance}
                    onChange={(e) => {
                      const sections = [...editor.sections];
                      sections[i] = { ...section, guidance: e.target.value };
                      setEditor({ ...editor, sections });
                    }}
                    placeholder="작성 지침 (AI 에게 전달, 예: 담당자·기한을 굵게 표기)"
                    className="h-8 text-xs"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1"
                onClick={() =>
                  setEditor({ ...editor, sections: [...editor.sections, { title: "", guidance: "" }] })
                }
              >
                <PlusIcon className="size-3.5" />
                섹션 추가
              </Button>
            </div>

            <div className="flex justify-end gap-1.5 pb-1">
              <Button variant="ghost" size="sm" onClick={() => setEditor(null)} disabled={saving}>
                취소
              </Button>
              <Button size="sm" onClick={() => void save()} disabled={saving}>
                저장
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

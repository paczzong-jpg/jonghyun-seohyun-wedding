interface ToolHeaderProps {
  title: string
  description: string
}

/**
 * 도구 상단 제목 + 설명.
 * 교체 지점: title/description props만 바꾸면 된다.
 */
export function ToolHeader({ title, description }: ToolHeaderProps) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

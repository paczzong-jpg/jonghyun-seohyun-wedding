import { AppShell } from "@/components/dashboard/app-shell"

/** 아직 구현되지 않은 페이지에 공통으로 쓰는 "준비 중" 플레이스홀더. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <AppShell title={title}>
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        준비 중입니다.
      </div>
    </AppShell>
  )
}

import { Link } from "react-router-dom"
import { AppShell } from "@/components/dashboard/app-shell"

/** 정의되지 않은 경로에 대한 404 페이지. */
export function NotFoundPage() {
  return (
    <AppShell title="페이지를 찾을 수 없음">
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-muted-foreground">
        <span className="text-4xl font-bold text-foreground">404</span>
        <p>요청하신 페이지를 찾을 수 없습니다.</p>
        <Link to="/" className="text-sm text-primary hover:underline">
          대시보드로 돌아가기
        </Link>
      </div>
    </AppShell>
  )
}

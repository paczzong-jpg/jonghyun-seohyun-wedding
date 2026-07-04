import { BrowserRouter, Routes, Route, NavLink, Outlet } from "react-router-dom"
import { Calendar, MessageCircle, LayoutDashboard, FileText, Menu, X, Trophy, Gift, QrCode } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { EventLandingPage } from "@/pages/EventLandingPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { QnaPage } from "@/pages/QnaPage"
import { AdminPage } from "@/pages/AdminPage"
import { PresenterPage } from "@/pages/PresenterPage"
import { JoinPage } from "@/pages/JoinPage"
import { QuizPage } from "@/pages/QuizPage"
import { DrawPage } from "@/pages/DrawPage"
import { DEFAULT_EVENT_CODE } from "@/lib/event-data"

// ---------------------------------------------------------------------------
// 공용 셸 — 헤더(모바일 햄버거 포함) + Outlet
// react-router v6/v7 레이아웃 라우트 패턴: <Outlet /> 으로 자식 페이지를 렌더한다.
// ---------------------------------------------------------------------------

const NAV = [
  { to: "/", label: "홈", icon: Calendar, end: true },
  { to: `/join/${DEFAULT_EVENT_CODE}`, label: "체크인", icon: QrCode, end: false },
  { to: "/register", label: "신청", icon: FileText, end: false },
  { to: "/qna", label: "Q&A", icon: MessageCircle, end: false },
  { to: "/quiz", label: "퀴즈", icon: Trophy, end: false },
  { to: "/draw", label: "추첨", icon: Gift, end: false },
  { to: "/admin", label: "관리", icon: LayoutDashboard, end: false },
]

function EventShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded bg-primary" />
            <span className="font-semibold text-foreground">MISO Live 2026</span>
          </div>

          {/* 데스크탑 네비 */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* 모바일 햄버거 */}
          <button
            className="md:hidden"
            aria-label="메뉴"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* 모바일 드롭다운 */}
        {mobileOpen && (
          <nav className="border-t border-border bg-card px-4 pb-3 md:hidden">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* 자식 페이지 */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 라우터
// ---------------------------------------------------------------------------

/**
 * 이벤트 앱 라우터 — react-router v6/v7 레이아웃 라우트 패턴.
 *
 * /presenter  발표자 전용 화면 (헤더/네비 없는 독립 레이아웃, 직접 URL 접근)
 * /*          나머지 페이지는 EventShell(헤더+네비)로 래핑
 *
 * 새 페이지 추가: src/pages/ 에 컴포넌트 생성 후 EventShell 하위 <Route> 삽입.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 발표자 화면 — 독립 레이아웃 (헤더 없음) */}
        <Route path="/presenter" element={<PresenterPage mode="qna" />} />
        <Route path="/presenter/qna" element={<PresenterPage mode="qna" />} />
        <Route path="/presenter/quiz" element={<PresenterPage mode="quiz" />} />
        <Route path="/presenter/draw" element={<PresenterPage mode="draw" />} />

        {/* 일반 페이지 — EventShell 레이아웃 라우트 */}
        <Route element={<EventShell />}>
          <Route path="/" element={<EventLandingPage />} />
          <Route path="/join/:eventCode" element={<JoinPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/qna" element={<QnaPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/draw" element={<DrawPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<EventLandingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

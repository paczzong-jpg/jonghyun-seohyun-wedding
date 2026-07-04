import { BrowserRouter, Routes, Route } from "react-router-dom"
import { DashboardPage } from "@/pages/DashboardPage"
import { PlaceholderPage } from "@/pages/PlaceholderPage"
import { NotFoundPage } from "@/pages/NotFoundPage"

/**
 * 라우터. 새 페이지는 src/pages/ 에 만들고 여기 <Route>를 추가한다.
 * (react-router-dom v7 — 템플릿 표준 라우팅)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/analytics" element={<PlaceholderPage title="분석" />} />
        <Route path="/records" element={<PlaceholderPage title="데이터" />} />
        <Route path="/settings" element={<PlaceholderPage title="설정" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ToolPage } from "@/pages/ToolPage"

/**
 * 라우터. 새 페이지는 src/pages/ 에 만들고 여기 <Route>를 추가한다.
 * (react-router-dom v7 — 템플릿 표준 라우팅)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ToolPage />} />
        {/* 예: <Route path="/settings" element={<SettingsPage />} /> */}
        <Route path="*" element={<ToolPage />} />
      </Routes>
    </BrowserRouter>
  )
}

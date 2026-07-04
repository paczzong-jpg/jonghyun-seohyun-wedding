import { BrowserRouter, Routes, Route } from "react-router-dom"
import { SurveyPage } from "@/pages/SurveyPage"
import { ResultsPage } from "@/pages/ResultsPage"

/**
 * 라우터.
 * /         → 설문 응답 플로우 (단계 진행 → 결과 인라인)
 * /results  → 관리자 결과 대시보드 (집계·차트·주관식·CSV export)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SurveyPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="*" element={<SurveyPage />} />
      </Routes>
    </BrowserRouter>
  )
}

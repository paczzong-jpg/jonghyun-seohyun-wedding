import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { PresentationPage } from "@/pages/PresentationPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PresentationPage />} />
        {/* catch-all: 미정의 경로는 덱으로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

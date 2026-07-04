import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { DashboardPage } from "@/pages/DashboardPage";
import { NotebookPage } from "@/pages/NotebookPage";

import "@/styles/notebook.css";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-center" richColors />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/notebook/:id" element={<NotebookPage />} />
        {/* catch-all: 미정의 경로는 대시보드로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/lib/meeting/use-theme";
import { DashboardPage } from "@/pages/DashboardPage";
import { MeetingPage } from "@/pages/MeetingPage";
import { RecordPage } from "@/pages/RecordPage";
import { SharePage } from "@/pages/SharePage";

import "@/styles/meeting.css";

export default function App() {
  useTheme(); // 시스템/저장 테마를 모든 라우트에 초기 적용
  return (
    <BrowserRouter>
      <Toaster position="bottom-center" richColors />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/meeting/:id" element={<MeetingPage />} />
        {/* 공유 뷰 — 회의록 렌더 전용 (앱 크롬 없음) */}
        <Route path="/share/:token" element={<SharePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

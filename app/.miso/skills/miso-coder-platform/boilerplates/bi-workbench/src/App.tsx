import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getBasePath } from "@/lib/miso-sdk/site-client";
import "./bi-theme.css";
import { AppShell } from "./layout/app-shell";
import { HomePage } from "./pages/HomePage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { VizPage } from "./pages/VizPage";
import { DashboardsPage } from "./pages/DashboardsPage";
import { DashboardDetailPage } from "./pages/DashboardDetailPage";
import { SettingsPage } from "./pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

/** v1 경로(/d/:id...) → v2 경로. 쿼리 파라미터(?spec/?chart) 보존 */
function LegacyRedirect({ pattern }: { pattern: string }) {
  const { datasetId } = useParams<{ datasetId: string }>();
  const location = useLocation();
  return <Navigate to={pattern.replace(":datasetId", datasetId ?? "") + location.search} replace />;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          <BrowserRouter basename={getBasePath()}>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/data" replace />} />
                <Route path="/data" element={<HomePage />} />
                <Route path="/data/:datasetId" element={<WorkspacePage tab="profile" />} />
                <Route path="/data/:datasetId/grid" element={<WorkspacePage tab="grid" />} />
                <Route path="/data/:datasetId/eda" element={<WorkspacePage tab="eda" />} />
                <Route path="/data/:datasetId/causal" element={<WorkspacePage tab="causal" />} />
                <Route path="/viz" element={<VizPage />} />
                <Route path="/viz/:datasetId" element={<VizPage />} />
                <Route path="/dash" element={<DashboardsPage />} />
                <Route path="/dash/:dashboardId" element={<DashboardDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                {/* v1 호환 */}
                <Route path="/d/:datasetId" element={<LegacyRedirect pattern="/data/:datasetId" />} />
                <Route path="/d/:datasetId/grid" element={<LegacyRedirect pattern="/data/:datasetId/grid" />} />
                <Route path="/d/:datasetId/explore" element={<LegacyRedirect pattern="/viz/:datasetId" />} />
                <Route path="*" element={<Navigate to="/data" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

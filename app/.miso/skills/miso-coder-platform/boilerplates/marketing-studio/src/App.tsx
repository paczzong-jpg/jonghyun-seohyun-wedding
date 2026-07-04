import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { getBasePath } from "@/lib/miso-sdk/site-client";
import { APP_NAME } from "@/lib/marketing/config";
import { AssetEditorPage } from "@/pages/AssetEditorPage";
import { BrandPage } from "@/pages/BrandPage";
import { CampaignPage } from "@/pages/CampaignPage";
import { MarketingStudioPage } from "@/pages/MarketingStudioPage";
import "@/styles/marketing.css";

function App() {
  return (
    // 발행 모드는 /site/<code>/ 아래에서 서빙 — basename 누락 시 내부 링크가 프리픽스를 이탈한다
    <BrowserRouter basename={getBasePath()}>
      <div className="ms-app flex min-h-screen flex-col text-foreground">
        <header style={{ borderBottom: "1px solid var(--ms-hairline)" }}>
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
            <Link to="/" className="ms-display text-[17px] tracking-tight">
              {APP_NAME}
              <span className="text-primary">.</span>
            </Link>
            <span className="ms-mono hidden text-muted-foreground sm:block">
              BRAND CAMPAIGN STUDIO — PROOF
            </span>
          </div>
        </header>
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<MarketingStudioPage />} />
            <Route path="/brand/:brandId" element={<BrandPage />} />
            <Route path="/campaign/:campaignId" element={<CampaignPage />} />
            <Route path="/asset/:assetId" element={<AssetEditorPage />} />
          </Routes>
        </main>
        <footer className="mx-auto w-full max-w-6xl px-5 pb-6">
          <p className="ms-mono border-t pt-3 text-muted-foreground" style={{ borderColor: "var(--ms-hairline)" }}>
            {APP_NAME} · URL → BRAND DNA → CAMPAIGN → CREATIVE
          </p>
        </footer>
        <Toaster position="top-center" theme="light" />
      </div>
    </BrowserRouter>
  );
}

export default App;

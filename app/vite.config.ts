import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";
import { misoProxyPlugin } from "./src/lib/miso-sdk/miso-proxy-plugin";

const base = process.env.VITE_BASE || "/";

// Cross-origin preview (PoC): when the preview iframe is served from a separate
// host (e.g. coder-preview-dev.<domain>) that host must be in allowedHosts and
// the HMR client must dial the TLS-terminated proxy. All env-gated — unset
// values keep the current same-origin behaviour byte-for-byte.
//   VITE_ALLOWED_HOSTS    — comma-separated extra hosts; unset → `true` (allow all)
//   VITE_HMR_PROTOCOL     — "wss" for TLS preview origins; unset → Vite default (ws)
//   VITE_HMR_CLIENT_PORT  — e.g. 443 behind TLS; unset → browser auto-detects from location.port
const allowedHostsEnv = process.env.VITE_ALLOWED_HOSTS;
const allowedHosts = allowedHostsEnv
  ? allowedHostsEnv.split(",").map((h) => h.trim()).filter(Boolean)
  : true;
const hmrProtocol = process.env.VITE_HMR_PROTOCOL || undefined;
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT
  ? Number.parseInt(process.env.VITE_HMR_CLIENT_PORT, 10)
  : undefined;

// agent-browser(Vite dev server 에 직접 접속하는 headless 환경)에서도 PocketBase
// 검증이 되도록, monkey-patch 가 변환한 `{base}__runtime/*` 를 SM internal relay
// (`/internal/coder/runtime/{appId}/data/*`) 로 프록시한다.
// - dev server 전용 → published(정적 빌드)·실브라우저(SM 게이트 경유)에는 영향 없음.
// - __external(`/proxy/*`)·__api 는 sandbox relay(4211)가 SSRF/인증으로 차단·미지원하므로
//   server.proxy 로 우회하지 않는다(__runtime 만 허용).
const runtimeAppId =
  process.env.RUNTIME_APP_ID || (base.match(/preview\/([^/]+)/)?.[1] ?? "");
const smInternalUrl = process.env.SM_INTERNAL_URL || "http://127.0.0.1:4211";
const previewProxy = runtimeAppId
  ? {
      [`${base}__runtime`]: {
        target: smInternalUrl,
        changeOrigin: true,
        rewrite: (p: string) =>
          p.replace(`${base}__runtime`, `/internal/coder/runtime/${runtimeAppId}/data`),
      },
    }
  : undefined;

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), misoProxyPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    strictPort: true,
    allowedHosts,
    proxy: previewProxy,
    watch: {
      // NFS 마운트에서는 inotify가 파일 변경을 감지하지 못하므로 polling 사용
      usePolling: true,
      interval: 500,
    },
    hmr: base !== "/"
      ? {
          // Vite joins base + path internally → /service/coder/preview/{sessionId}/ws
          path: "ws",
          // protocol/clientPort default to undefined → browser auto-detects from
          // location (current behaviour). Set the env vars to force wss/443 when
          // the preview is served cross-origin behind TLS.
          ...(hmrProtocol ? { protocol: hmrProtocol } : {}),
          ...(hmrClientPort ? { clientPort: hmrClientPort } : {}),
        }
      : undefined,
  },
});

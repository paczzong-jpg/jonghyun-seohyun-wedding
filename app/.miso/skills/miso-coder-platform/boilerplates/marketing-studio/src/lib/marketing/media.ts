import { getRuntimeBase } from "@/lib/miso-sdk/site-client";
import { IMAGE_PROXY_ENDPOINT } from "./config";

// 외부 이미지(로고·og:image)는 PB 훅 프록시를 거쳐 same-origin 으로 로드한다.
// CORS 헤더 없는 외부 이미지도 캔버스 렌더와 PNG 내보내기(html-to-image)가 가능해진다.
// PB 파일 URL 과 같은 방식으로 runtime base 를 프리픽스한다 (dev /__runtime, 발행 /site/<code>/__runtime).
export function proxiedImageUrl(externalUrl: string): string {
  if (!externalUrl) return "";
  if (externalUrl.startsWith("data:") || externalUrl.startsWith("/")) return externalUrl;
  return `${getRuntimeBase()}${IMAGE_PROXY_ENDPOINT}?src=${encodeURIComponent(externalUrl)}`;
}

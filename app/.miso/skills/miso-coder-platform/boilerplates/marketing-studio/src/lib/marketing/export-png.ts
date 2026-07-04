// PNG 내보내기 — html-to-image 는 다운로드 버튼을 누를 때만 dynamic import 된다.
// 대상 노드는 플랫폼 원본 px 로 렌더된 내부 캔버스 노드여야 한다 (스케일 래퍼 아님).

export async function exportNodeToPng(
  node: HTMLElement,
  options: { width: number; height: number; fileName: string },
): Promise<void> {
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(node, {
    width: options.width,
    height: options.height,
    pixelRatio: 1,
    cacheBust: true,
    style: {
      // 스케일 래퍼의 transform 이 캡처에 섞이지 않도록 원본 좌표계로 고정
      transform: "none",
      margin: "0",
    },
  });

  const link = document.createElement("a");
  link.download = options.fileName;
  link.href = dataUrl;
  link.click();
}

export function assetFileName(brandName: string, platformId: string): string {
  const safe = (brandName || "brand")
    .replace(/[^0-9a-zA-Z가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${safe || "brand"}-${platformId}.png`;
}

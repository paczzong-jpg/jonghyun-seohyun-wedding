// ────────────────────────────────────────────────
// 회의자료 첨부 인제스트 — 원본은 PB file 로 보존하고,
// AI 컨텍스트용 텍스트를 추출해 4천자 청크로 나눠 저장한다.
// 파서(pdf.js·mammoth)는 해당 형식 처리 시점에만 dynamic import.
// ────────────────────────────────────────────────

const CHUNK_SIZE = 4_000;
const MAX_CHARS = 300_000;

export class IngestError extends Error {}

function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkText(text: string, size = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const para of text.split(/\n\n+/)) {
    if (para.length > size) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < para.length; i += size) chunks.push(para.slice(i, i + size));
      continue;
    }
    if (current.length + para.length + 2 > size) {
      chunks.push(current);
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function extractPdf(file: File): Promise<string> {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // CJK 폰트는 글리프 단위 item 으로 쪼개져 오므로 무조건 공백으로 잇지 않는다.
    // 라틴·숫자 경계에서만 공백을 넣고, hasEOL 은 줄바꿈으로 반영한다.
    let text = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const str = item.str;
      if (str) {
        const needSpace =
          text.length > 0 &&
          /[A-Za-z0-9.,)%\]]$/.test(text) &&
          /^[A-Za-z0-9([]/.test(str);
        text += (needSpace ? " " : "") + str;
      }
      if (item.hasEOL) text += "\n";
    }
    pages.push(text);
  }
  await doc.destroy();
  return pages.join("\n\n");
}

async function extractDocx(file: File): Promise<string> {
  const { default: mammoth } = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export function isSupportedAttachment(file: File): boolean {
  return /\.(pdf|docx|md|markdown|txt|csv)$/i.test(file.name);
}

/**
 * 첨부 파일에서 AI 컨텍스트 텍스트를 추출한다.
 * 지원하지 않는 형식은 빈 텍스트를 돌려준다 — 파일 자체는 그래도 보존·재다운로드 가능해야 한다.
 */
export async function extractAttachmentText(
  file: File,
): Promise<{ text: string; chunks: string[] }> {
  let raw = "";
  if (/\.pdf$/i.test(file.name)) {
    raw = await extractPdf(file);
  } else if (/\.docx$/i.test(file.name)) {
    raw = await extractDocx(file);
  } else if (/\.(md|markdown|txt|csv)$/i.test(file.name)) {
    raw = await file.text();
  } else {
    return { text: "", chunks: [] };
  }

  const text = normalizeText(raw).slice(0, MAX_CHARS);
  if (!text) {
    throw new IngestError("문서에서 텍스트를 추출하지 못했습니다 (스캔 이미지 PDF 일 수 있음).");
  }
  return { text, chunks: chunkText(text) };
}

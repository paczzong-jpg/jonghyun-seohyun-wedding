import { Readability } from "@mozilla/readability";

import { createChunks, createSource, updateSource } from "./db";
import { generateSourceBrief } from "./llm";
import type { Source, SourceInput, SourceType } from "./types";

// ────────────────────────────────────────────────
// 소스 인제스트 파이프라인: 추출 → 청크 저장 → LLM 브리프.
// 모든 파싱은 브라우저에서 수행된다 (pdf.js 워커, mammoth, Readability).
// 외부 URL fetch 는 플랫폼 프록시(__external)가 자동 처리한다.
// ────────────────────────────────────────────────

/** 청크 크기(문자) — 문단 경계를 우선하고 초과 시 강제 분할 */
const CHUNK_SIZE = 4000;
/** 소스 하나의 최대 수집 문자 수 — 과대 문서 가드 */
const MAX_SOURCE_CHARS = 400_000;

export type IngestPhase = "extract" | "store" | "brief";

export class IngestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestError";
  }
}

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

// ── 포맷별 추출 ────────────────────────────────

async function extractPdf(file: File): Promise<string> {
  // 파서는 무겁기 때문에 PDF 인제스트 시점에만 로드한다
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

async function extractPlain(file: File): Promise<string> {
  return file.text();
}

interface UrlExtract {
  title: string;
  text: string;
}

async function extractUrl(url: string): Promise<UrlExtract> {
  // 플랫폼 fetch 인터셉터가 __external 프록시로 라우팅한다 — 직접 CORS 걱정 불필요
  const response = await fetch(url, { headers: { Accept: "text/html,*/*" } });
  if (!response.ok) throw new IngestError(`페이지를 가져오지 못했습니다 (HTTP ${response.status})`);
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const article = new Readability(doc).parse();
  if (article?.textContent && article.textContent.trim().length > 200) {
    return { title: article.title || hostOf(url), text: article.textContent };
  }
  // Readability 실패 시 body 텍스트 폴백
  const fallback = doc.body?.textContent ?? "";
  if (fallback.trim().length < 80) {
    throw new IngestError("본문을 추출할 수 없는 페이지입니다");
  }
  return { title: doc.title || hostOf(url), text: fallback };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function fileType(file: File): SourceType {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "markdown";
  if (name.endsWith(".txt") || file.type.startsWith("text/")) return "text";
  throw new IngestError("지원하지 않는 파일입니다. PDF·DOCX·MD·TXT를 올려주세요.");
}

function fileTitle(file: File): string {
  return file.name.replace(/\.[^.]+$/, "");
}

// ── 파이프라인 ─────────────────────────────────

export interface IngestResult {
  source: Source;
  /** 브리프에서 함께 생성된 추천 질문 (채팅 빈 상태에 노출) */
  questions: string[];
}

/**
 * 소스 하나를 인제스트한다.
 * 레코드를 processing 으로 먼저 만들고(목록에 즉시 표시), 단계별로 채워 ready 로 전환.
 * LLM 브리프 실패는 소스 자체를 실패시키지 않는다 — 요약 없이 ready.
 */
export async function ingestSource(
  notebookId: string,
  input: SourceInput,
  onPhase?: (phase: IngestPhase) => void,
): Promise<IngestResult> {
  let title: string;
  let type: SourceType;
  let url = "";

  if (input.kind === "file") {
    type = fileType(input.file);
    title = fileTitle(input.file);
  } else if (input.kind === "url") {
    type = "url";
    url = input.url;
    title = hostOf(input.url);
  } else {
    type = "text";
    title = input.title || "붙여넣은 텍스트";
  }

  const source = await createSource({ notebook: notebookId, title, type, url });

  try {
    onPhase?.("extract");
    let text: string;
    if (input.kind === "file") {
      text =
        type === "pdf"
          ? await extractPdf(input.file)
          : type === "docx"
            ? await extractDocx(input.file)
            : await extractPlain(input.file);
    } else if (input.kind === "url") {
      const extracted = await extractUrl(input.url);
      title = extracted.title;
      text = extracted.text;
    } else {
      text = input.text;
    }

    text = normalizeText(text).slice(0, MAX_SOURCE_CHARS);
    if (text.length < 20) throw new IngestError("추출된 내용이 너무 짧습니다");

    onPhase?.("store");
    await createChunks(source.id, notebookId, chunkText(text));

    onPhase?.("brief");
    let summary = "";
    let topics: string[] = [];
    let questions: string[] = [];
    try {
      const brief = await generateSourceBrief(title, text);
      summary = brief.summary;
      topics = brief.topics;
      questions = brief.questions;
    } catch (error) {
      console.warn("소스 브리프 생성 실패 — 요약 없이 진행:", error);
    }

    const updated = await updateSource(source.id, {
      title,
      status: "ready",
      summary,
      topics,
      questions,
      excerpt: text.slice(0, 280),
      char_count: text.length,
    });
    return { source: updated, questions };
  } catch (error) {
    const message =
      error instanceof IngestError ? error.message : "소스를 처리하지 못했습니다";
    await updateSource(source.id, { status: "failed", error: message }).catch(() => {});
    throw error instanceof IngestError ? error : new IngestError(message);
  }
}

/**
 * bi-ai — miso-llm(direct LLM) 태스크 계약 (GOAL §9)
 *
 * 원칙:
 * 1. 출력은 spec만 — LLM은 ChartSpec JSON을 내고, 자유 코드는 금지
 * 2. 입력은 요약만 — 스키마 카드 + 프로파일 + 샘플 소량. 원본 미전송
 * 3. 검증 파이프라인 — JSON 파싱 → 참조 무결성(sanitize) → 실패 시 1회 재생성
 * 4. AI-first — LLM 활용이 목표. 미연결·실패 시에만 통계 결과가 조용히 노출된다
 */

import {
  getMisoLLMConfig,
  invokeMisoLLM,
  streamMisoLLM,
  type DirectLlmMessage,
  type DirectLlmStreamHandle,
  type DirectLlmTargetModel,
} from "@/lib/miso-sdk/miso-llm";
import type {
  AggFn,
  BiDatasetRecord,
  ChartSpec,
  DataTable,
  DateUnit,
  Encoding,
  FilterRule,
  InsightCandidate,
  MarkType,
} from "./bi-types";
import type { ExplainResult } from "./bi-explain";
import type { CausalAnalysis } from "./bi-causal";
import { formatCell, formatNumber } from "./bi-format";

// ---------------------------------------------------------------------------
// 모델 해석 — 코더 앱에 연결된 direct LLM 중 첫 모델 사용
// ---------------------------------------------------------------------------

let cachedModel: DirectLlmTargetModel | null | undefined;

export async function resolveModel(): Promise<DirectLlmTargetModel | null> {
  if (cachedModel !== undefined) return cachedModel;
  try {
    const config = await getMisoLLMConfig();
    const first = config.selected_models?.[0];
    cachedModel = first
      ? { registeredProviderId: first.registered_provider_id, modelId: first.model_id }
      : null;
  } catch {
    cachedModel = null;
  }
  return cachedModel;
}

/** 실패 캐시 초기화 후 재확인 (패널의 "다시 연결") */
export async function retryResolveModel(): Promise<DirectLlmTargetModel | null> {
  cachedModel = undefined;
  return resolveModel();
}

export class AiUnavailableError extends Error {
  constructor() {
    super("연결된 LLM 모델이 없습니다");
  }
}

// ---------------------------------------------------------------------------
// 스키마 카드 (GOAL §9.1) — 모든 태스크의 공통 컨텍스트
// ---------------------------------------------------------------------------

export function schemaCard(record: BiDatasetRecord, table: DataTable, sampleRows = 5): string {
  const lines: string[] = [];
  lines.push(`dataset: ${record.name} (${record.rowCount.toLocaleString()} rows)`);
  lines.push("fields (fid를 정확히 그대로 사용할 것):");
  for (const f of table.fields) {
    if (f.hidden) continue;
    const p = f.profile;
    let stat = "";
    if (f.semanticType === "temporal" && p.temporalRange) {
      stat = `${p.temporalRange.min.slice(0, 10)} ~ ${p.temporalRange.max.slice(0, 10)}`;
    } else if (f.analyticType === "measure" && p.mean !== undefined) {
      stat = `μ${formatNumber(p.mean)} [${formatNumber(Number(p.min ?? 0))}, ${formatNumber(Number(p.max ?? 0))}]`;
    } else if (p.topValues?.length) {
      stat = p.topValues
        .slice(0, 3)
        .map((t) => `${t.value} ${p.count ? Math.round((t.count / p.count) * 100) : 0}%`)
        .join(", ");
    }
    lines.push(
      `- fid=${f.fid} name="${f.displayName}" (${f.analyticType}/${f.semanticType}, uniq ${p.distinctCount}) ${stat}`,
    );
  }
  if (sampleRows > 0 && table.rowCount > 0) {
    const visible = table.fields.filter((f) => !f.hidden).slice(0, 10);
    lines.push(`sample (${Math.min(sampleRows, table.rowCount)} rows):`);
    for (let r = 0; r < Math.min(sampleRows, table.rowCount); r++) {
      lines.push(
        visible.map((f) => `${f.displayName}=${formatCell(table.columns[f.fid]?.[r] ?? null, f)}`).join(", "),
      );
    }
  }
  return lines.join("\n");
}

/** ChartSpec 계약 설명 — 프롬프트에 붙는 출력 스키마 */
const SPEC_CONTRACT = `ChartSpec JSON 스키마:
{
  "markType": "auto|bar|line|area|point|rect|arc|kpi|table",
  "encodings": {
    "x": {"fid": "...", "bucket": {"unit": "year|quarter|month|week|day|hour"}?, "sort": "asc|desc|byMeasure"?},
    "y": [{"fid": "...", "agg": "sum|mean|median|count|countDistinct|min|max"}],
    "color": {"fid": "..."}?,
    "size": {"fid": "..."}?
  },
  "stack": "none|stack|normalize",
  "filters": [
    {"fid":"...","op":"oneOf","values":[...]} |
    {"fid":"...","op":"range","min":n?,"max":n?} |
    {"fid":"...","op":"timeRelative","lastN":n,"unit":"month|day|..."} |
    {"fid":"...","op":"contains","value":"..."} |
    {"fid":"...","op":"topN","n":n,"by":{"fid":"...","agg":"sum"},"desc":true}
  ],
  "meta": {"title": "차트 제목"}
}
규칙: fid는 스키마 카드의 fid를 그대로 사용. temporal 필드를 x에 쓰면 bucket 필수.
measure는 y에, dimension은 x/color에. 구성비는 markType "arc" + color + y 1개.`;

// ---------------------------------------------------------------------------
// JSON 태스크 실행기 — 파싱 실패 시 오류를 붙여 1회 재생성 (GOAL §9.4)
// ---------------------------------------------------------------------------

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("JSON 블록을 찾지 못했습니다");
  return JSON.parse(candidate.slice(start, end + 1));
}

async function callJsonTask<T>(opts: {
  system: string;
  user: string;
  validate: (raw: unknown) => T; // 실패 시 throw
  temperature?: number;
}): Promise<T> {
  const model = await resolveModel();
  if (!model) throw new AiUnavailableError();

  const ask = async (messages: DirectLlmMessage[]): Promise<T> => {
    const res = await invokeMisoLLM({
      messages,
      targetModel: model,
      systemPrompt: opts.system,
      modelParameters: { temperature: opts.temperature ?? 0.2 },
    });
    return opts.validate(extractJson(res.answer));
  };

  const first: DirectLlmMessage[] = [{ role: "user", content: opts.user }];
  try {
    return await ask(first);
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    const reason = error instanceof Error ? error.message : String(error);
    return ask([
      ...first,
      { role: "assistant", content: "(이전 응답이 스키마 검증에 실패)" },
      {
        role: "user",
        content: `이전 응답이 검증에 실패했습니다: ${reason}\n스키마에 정확히 맞는 JSON만 다시 출력하세요.`,
      },
    ]);
  }
}

// ---------------------------------------------------------------------------
// 참조 무결성 검증 — LLM이 낸 spec을 신뢰하지 않는다 (GOAL §9.4 ②)
// ---------------------------------------------------------------------------

const MARKS: MarkType[] = ["auto", "bar", "line", "area", "point", "rect", "arc", "kpi", "table"];
const AGGS: AggFn[] = ["sum", "mean", "median", "count", "countDistinct", "min", "max", "stdev", "variance"];
const UNITS: DateUnit[] = ["year", "quarter", "month", "week", "day", "hour"];

function sanitizeEncoding(raw: unknown, table: DataTable): Encoding | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const field = table.fields.find((f) => f.fid === e.fid);
  if (!field) return null;
  const enc: Encoding = { fid: field.fid };
  if (typeof e.agg === "string" && AGGS.includes(e.agg as AggFn)) enc.agg = e.agg as AggFn;
  if (e.bucket && typeof e.bucket === "object") {
    const b = e.bucket as Record<string, unknown>;
    if (typeof b.unit === "string" && UNITS.includes(b.unit as DateUnit) && field.semanticType === "temporal") {
      enc.bucket = { unit: b.unit as DateUnit };
    } else if (typeof b.binCount === "number" && field.semanticType === "quantitative") {
      enc.bucket = { binCount: Math.max(2, Math.min(50, Math.round(b.binCount))) };
    }
  }
  // temporal을 x에 쓰면 bucket 보장
  if (field.semanticType === "temporal" && !enc.bucket) {
    enc.bucket = { unit: field.profile.temporalRange?.suggestedUnit ?? "month" };
  }
  if (e.sort === "asc" || e.sort === "desc" || e.sort === "byMeasure") enc.sort = e.sort;
  return enc;
}

function sanitizeFilter(raw: unknown, table: DataTable): FilterRule | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  const field = table.fields.find((x) => x.fid === f.fid);
  if (!field || typeof f.op !== "string") return null;
  switch (f.op) {
    case "eq":
    case "neq":
      return f.value === undefined ? null : { fid: field.fid, op: f.op, value: f.value as never };
    case "oneOf":
    case "notIn":
      return Array.isArray(f.values) ? { fid: field.fid, op: f.op, values: f.values as never } : null;
    case "range":
      return {
        fid: field.fid,
        op: "range",
        min: typeof f.min === "number" ? f.min : undefined,
        max: typeof f.max === "number" ? f.max : undefined,
      };
    case "timeRange":
      return {
        fid: field.fid,
        op: "timeRange",
        from: typeof f.from === "string" ? f.from : undefined,
        to: typeof f.to === "string" ? f.to : undefined,
      };
    case "timeRelative":
      return typeof f.lastN === "number" && UNITS.includes(f.unit as DateUnit)
        ? { fid: field.fid, op: "timeRelative", lastN: Math.max(1, Math.round(f.lastN)), unit: f.unit as DateUnit }
        : null;
    case "contains":
    case "startsWith":
    case "endsWith":
      return typeof f.value === "string" ? { fid: field.fid, op: f.op, value: f.value } : null;
    case "isNull":
    case "notNull":
      return { fid: field.fid, op: f.op };
    case "topN": {
      const by = f.by as Record<string, unknown> | undefined;
      const byField = by && table.fields.find((x) => x.fid === by.fid);
      return typeof f.n === "number" && byField
        ? {
            fid: field.fid,
            op: "topN",
            n: Math.max(1, Math.min(100, Math.round(f.n))),
            by: { fid: byField.fid, agg: AGGS.includes(by!.agg as AggFn) ? (by!.agg as AggFn) : "sum" },
            desc: f.desc !== false,
          }
        : null;
    }
    default:
      return null;
  }
}

/** LLM 출력 → 안전한 ChartSpec. 유효 인코딩이 하나도 없으면 throw */
export function sanitizeChartSpec(raw: unknown, table: DataTable): ChartSpec {
  if (!raw || typeof raw !== "object") throw new Error("spec이 객체가 아닙니다");
  const s = raw as Record<string, unknown>;
  const encRaw = (s.encodings ?? {}) as Record<string, unknown>;

  const x = sanitizeEncoding(encRaw.x, table) ?? undefined;
  const yList = (Array.isArray(encRaw.y) ? encRaw.y : encRaw.y ? [encRaw.y] : [])
    .map((e) => sanitizeEncoding(e, table))
    .filter((e): e is Encoding => e !== null);
  const color = sanitizeEncoding(encRaw.color, table) ?? undefined;
  const size = sanitizeEncoding(encRaw.size, table) ?? undefined;
  const theta = sanitizeEncoding(encRaw.theta, table) ?? undefined;

  if (!x && yList.length === 0 && !color && !theta) {
    throw new Error("유효한 인코딩이 없습니다 — 스키마 카드의 fid를 그대로 사용해야 합니다");
  }

  const markType =
    typeof s.markType === "string" && MARKS.includes(s.markType as MarkType)
      ? (s.markType as MarkType)
      : "auto";
  const filters = (Array.isArray(s.filters) ? s.filters : [])
    .map((f) => sanitizeFilter(f, table))
    .filter((f): f is FilterRule => f !== null);
  const meta = (s.meta ?? {}) as Record<string, unknown>;

  return {
    datasetId: table.datasetId,
    markType,
    encodings: {
      ...(x ? { x } : {}),
      ...(yList.length ? { y: yList } : {}),
      ...(color ? { color } : {}),
      ...(size ? { size } : {}),
      ...(theta ? { theta } : {}),
    },
    stack: s.stack === "stack" || s.stack === "normalize" ? s.stack : "none",
    filters,
    style: {},
    meta: {
      origin: "ai",
      ...(typeof meta.title === "string" ? { title: meta.title } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// 태스크: NL2Chart (챗) — 스트리밍. "답변 한 줄 → ```json spec```" 형식
// ---------------------------------------------------------------------------

export interface Nl2ChartResult {
  answer: string;
  spec: ChartSpec | null;
}

export interface Nl2ChartHandle {
  abort: () => void;
}

export function nl2chartStream(
  opts: {
    record: BiDatasetRecord;
    table: DataTable;
    question: string;
    currentSpec?: ChartSpec | null;
    history: DirectLlmMessage[];
    model: DirectLlmTargetModel;
  },
  handlers: {
    onAnswer: (partial: string) => void;
    onDone: (result: Nl2ChartResult) => void;
    onError: (message: string) => void;
  },
): Nl2ChartHandle {
  const system = `당신은 데이터 분석 어시스턴트입니다. 사용자의 질문에 맞는 차트를 만듭니다.
응답 형식(반드시 준수):
1) 첫 부분: 어떤 차트를 왜 만드는지 한두 문장 (한국어, 마크다운 금지)
2) 그 다음: \`\`\`json ... \`\`\` 코드블록 하나에 ChartSpec

${SPEC_CONTRACT}

차트가 필요 없는 질문(데이터 요약 등)이면 JSON 블록 없이 답변만 하세요.

[데이터]
${schemaCard(opts.record, opts.table)}
${opts.currentSpec ? `\n[현재 캔버스 차트]\n${JSON.stringify(opts.currentSpec.encodings)}` : ""}`;

  let full = "";
  const handle: DirectLlmStreamHandle = streamMisoLLM(
    {
      messages: [...opts.history, { role: "user", content: opts.question }],
      targetModel: opts.model,
      systemPrompt: system,
      modelParameters: { temperature: 0.3 },
    },
    {
      onEvent: (event) => {
        if (event.event === "text_chunk" && event.answer) {
          full += event.answer;
          handlers.onAnswer(full.split("```")[0].trim());
        } else if (event.event === "message_replace" && event.answer) {
          full = event.answer;
        }
      },
      onError: (err) => handlers.onError(err.message),
      onDone: () => {
        let spec: ChartSpec | null = null;
        if (full.includes("{")) {
          try {
            spec = sanitizeChartSpec(extractJson(full), opts.table);
          } catch {
            spec = null;
          }
        }
        handlers.onDone({ answer: full.split("```")[0].trim(), spec });
      },
    },
  );
  return { abort: () => handle.abort() };
}

// ---------------------------------------------------------------------------
// 태스크: Copilot — 이웃 spec 후보를 LLM이 선별 (GOAL §8.4)
// ---------------------------------------------------------------------------

export interface CopilotPick {
  index: number;
  reason: string;
}

export async function rankNeighbors(
  record: BiDatasetRecord,
  table: DataTable,
  currentSpec: ChartSpec,
  neighbors: { title: string; spec: ChartSpec }[],
): Promise<CopilotPick[]> {
  return callJsonTask({
    system:
      "당신은 데이터 탐색 조수입니다. 현재 차트 다음에 볼 가치가 가장 큰 탐색 3개를 고르고, 각각 15자 내외의 이유를 답니다. JSON만 출력: {\"picks\":[{\"index\":0,\"reason\":\"...\"}]}",
    user: `[데이터]\n${schemaCard(record, table, 0)}\n\n[현재 차트]\n${currentSpec.meta.title ?? JSON.stringify(currentSpec.encodings)}\n\n[후보]\n${neighbors
      .map((n, i) => `${i}. ${n.title}`)
      .join("\n")}`,
    validate: (raw) => {
      const picks = (raw as { picks?: unknown }).picks;
      if (!Array.isArray(picks)) throw new Error("picks 배열이 없습니다");
      const valid = picks
        .filter(
          (p): p is { index: number; reason?: string } =>
            typeof p === "object" && p !== null && typeof (p as { index?: unknown }).index === "number",
        )
        .filter((p) => p.index >= 0 && p.index < neighbors.length)
        .slice(0, 3)
        .map((p) => ({ index: p.index, reason: String(p.reason ?? "") }));
      if (valid.length === 0) throw new Error("유효한 pick이 없습니다");
      return valid;
    },
  });
}

// ---------------------------------------------------------------------------
// 태스크: AutoPilot 큐레이션 — 인사이트 후보에 순서·제목·서사 (GOAL §8.4)
// ---------------------------------------------------------------------------

export interface AutoPilotCuration {
  summary: string;
  picks: { index: number; title: string; narrative: string }[];
}

export async function curateInsights(
  record: BiDatasetRecord,
  table: DataTable,
  candidates: InsightCandidate[],
): Promise<AutoPilotCuration> {
  return callJsonTask({
    system: `당신은 데이터 분석 리포트 편집자입니다. 통계 엔진이 찾은 인사이트 후보에서 스토리가 되는 6개 이하를 골라 순서를 정하고, 각 항목에 제목(20자 내)과 해설(60자 내), 전체 요약(2문장)을 씁니다. 수치는 후보의 evidence를 근거로만 쓰세요. JSON만 출력:
{"summary":"...","picks":[{"index":0,"title":"...","narrative":"..."}]}`,
    user: `[데이터]\n${schemaCard(record, table, 0)}\n\n[후보]\n${candidates
      .map((c, i) => `${i}. [${c.kind}] ${c.title} — ${c.evidence} (score ${c.score.toFixed(2)})`)
      .join("\n")}`,
    temperature: 0.4,
    validate: (raw) => {
      const r = raw as { summary?: unknown; picks?: unknown };
      if (!Array.isArray(r.picks)) throw new Error("picks 배열이 없습니다");
      const picks = r.picks
        .filter(
          (p): p is { index: number; title?: string; narrative?: string } =>
            typeof p === "object" && p !== null && typeof (p as { index?: unknown }).index === "number",
        )
        .filter((p) => p.index >= 0 && p.index < candidates.length)
        .slice(0, 8)
        .map((p) => ({
          index: p.index,
          title: String(p.title ?? candidates[p.index].title),
          narrative: String(p.narrative ?? candidates[p.index].evidence),
        }));
      if (picks.length === 0) throw new Error("유효한 pick이 없습니다");
      return { summary: String(r.summary ?? ""), picks };
    },
  });
}

// ---------------------------------------------------------------------------
// 태스크: Explainer 서사 — 분해 수치를 서술로 (GOAL §8.5)
// ---------------------------------------------------------------------------

export async function explainNarrative(
  record: BiDatasetRecord,
  result: ExplainResult,
): Promise<string> {
  const model = await resolveModel();
  if (!model) throw new AiUnavailableError();
  const lines = result.factors.map(
    (f) =>
      `${f.displayName}: ` +
      f.groups
        .slice(0, 3)
        .map((g) =>
          result.mode === "delta"
            ? `${g.label} ${g.delta >= 0 ? "+" : ""}${formatNumber(g.delta)}${
                g.shareOfChange !== undefined ? ` (변화의 ${Math.round(g.shareOfChange * 100)}%)` : ""
              }`
            : `${g.label} ${g.delta >= 0 ? "+" : ""}${(g.delta * 100).toFixed(1)}%p`,
        )
        .join(", "),
  );
  const res = await invokeMisoLLM({
    messages: [
      {
        role: "user",
        content: `데이터셋 "${record.name}", ${result.measureLabel} 기준 "${result.targetLabel}" vs "${result.baselineLabel}" 비교입니다.
합계: ${formatNumber(result.targetTotal)} vs ${formatNumber(result.baselineTotal)}
dimension별 기여 분해(통계 엔진 계산):
${lines.join("\n")}

위 수치만 근거로 원인 후보를 2~3문장으로 서술하세요. 수치에 없는 추측은 금지. 한국어, 마크다운 금지.`,
      },
    ],
    targetModel: model,
    modelParameters: { temperature: 0.3 },
  });
  return res.answer.trim();
}

// ---------------------------------------------------------------------------
// 태스크: 인과 그래프 해석 — 구조가 나오면 자동 실행 (AI-first)
// ---------------------------------------------------------------------------

export async function causalNarrative(
  record: BiDatasetRecord,
  analysis: CausalAnalysis,
): Promise<string> {
  const model = await resolveModel();
  if (!model) throw new AiUnavailableError();
  const name = (i: number) => analysis.fields[i].displayName;
  const lines = analysis.edges
    .slice(0, 12)
    .map((e) =>
      e.directed
        ? `${name(e.a)} → ${name(e.b)} (r=${e.corr.toFixed(2)})`
        : `${name(e.a)} — ${name(e.b)} (r=${e.corr.toFixed(2)}, 방향 미확정)`,
    );
  const res = await invokeMisoLLM({
    messages: [
      {
        role: "user",
        content: `데이터셋 "${record.name}"에서 PC 알고리즘(조건부 독립 검정, n=${analysis.n})으로 추정한 변수 관계입니다.
${lines.join("\n")}

위 구조만 근거로 핵심 관계 2~3가지와 해석 시 주의점 1가지를 3~4문장으로 서술하세요.
"인과가 확정된 것은 아니다"라는 톤을 유지하고, 구조에 없는 추측은 금지. 한국어, 마크다운 금지.`,
      },
    ],
    targetModel: model,
    modelParameters: { temperature: 0.3 },
  });
  return res.answer.trim();
}

// ---------------------------------------------------------------------------
// Copilot 이웃 spec 생성 (로컬 규칙 — LLM은 선별만)
// ---------------------------------------------------------------------------

export function buildNeighborSpecs(
  table: DataTable,
  spec: ChartSpec,
): { title: string; spec: ChartSpec }[] {
  const out: { title: string; spec: ChartSpec }[] = [];
  const fields = table.fields.filter((f) => !f.hidden);
  const used = new Set(
    [spec.encodings.x?.fid, spec.encodings.color?.fid, ...(spec.encodings.y ?? []).map((e) => e.fid)].filter(
      Boolean,
    ),
  );
  const dims = fields.filter(
    (f) =>
      f.analyticType === "dimension" &&
      f.semanticType !== "temporal" &&
      !used.has(f.fid) &&
      f.profile.distinctCount >= 2 &&
      f.profile.distinctCount <= 30,
  );
  const measures = fields.filter((f) => f.analyticType === "measure" && !used.has(f.fid));

  // 색상 분해 추가 (드릴다운)
  if (!spec.encodings.color && dims[0] && (spec.encodings.y?.length ?? 0) > 0) {
    for (const d of dims.slice(0, 2)) {
      out.push({
        title: `${d.displayName}(으)로 나눠 보기`,
        spec: { ...spec, encodings: { ...spec.encodings, color: { fid: d.fid } }, meta: { origin: "ai" } },
      });
    }
  }
  // x 교체
  if (spec.encodings.x && dims[0]) {
    const d = dims[out.length % Math.max(dims.length, 1)] ?? dims[0];
    out.push({
      title: `${d.displayName}별로 보기`,
      spec: {
        ...spec,
        encodings: { ...spec.encodings, x: { fid: d.fid, sort: "byMeasure" } },
        meta: { origin: "ai" },
      },
    });
  }
  // measure 교체
  if (measures[0] && (spec.encodings.y?.length ?? 0) > 0) {
    out.push({
      title: `${measures[0].displayName} 기준으로 보기`,
      spec: {
        ...spec,
        encodings: { ...spec.encodings, y: [{ fid: measures[0].fid, agg: "sum" }] },
        meta: { origin: "ai" },
      },
    });
  }
  // 시간 단위 변경
  const xEnc = spec.encodings.x;
  if (xEnc?.bucket && "unit" in xEnc.bucket) {
    const order: DateUnit[] = ["year", "quarter", "month", "week", "day"];
    const idx = order.indexOf(xEnc.bucket.unit);
    const finer = order[idx + 1];
    if (finer) {
      out.push({
        title: `${DATE_UNIT_LABEL(finer)} 단위로 쪼개 보기`,
        spec: {
          ...spec,
          encodings: { ...spec.encodings, x: { ...xEnc, bucket: { unit: finer } } },
          meta: { origin: "ai" },
        },
      });
    }
  }
  // 100% 비율 전환
  if (spec.encodings.color && spec.stack !== "normalize") {
    out.push({
      title: "구성비(100%)로 보기",
      spec: { ...spec, markType: "bar", stack: "normalize", meta: { origin: "ai" } },
    });
  }
  return out.slice(0, 6);
}

function DATE_UNIT_LABEL(unit: DateUnit): string {
  const labels: Record<DateUnit, string> = {
    year: "연", quarter: "분기", month: "월", week: "주", day: "일", hour: "시간",
  };
  return labels[unit];
}

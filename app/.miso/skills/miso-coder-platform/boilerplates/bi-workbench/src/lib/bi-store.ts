/**
 * bi-store — PocketBase 영속화 (GOAL §12 축소판: 3개 컬렉션)
 *
 * - bi_datasets: 메타(fields JSON) + 컬럼 지향 JSON 파일(data)이 정본
 * - bi_charts: ChartSpec 저장본
 * - bi_dashboards: DashboardConfig 저장본
 *
 * 인메모리 DataTable 레지스트리를 함께 관리한다. 업로드 직후엔 메모리에
 * 이미 있고, 재방문 시엔 파일을 내려받아 복원한다(원본 재파싱 없음).
 */

import pb from "@/lib/miso-sdk/runtime-client";
import type {
  BiChartRecord,
  BiDashboardRecord,
  BiDatasetRecord,
  ChartSpec,
  DashboardConfig,
  DataTable,
  FieldMeta,
  JoinRelationship,
} from "./bi-types";
import { deserializeTable, serializeTable } from "./bi-profile";
import { materializeDerivedFields } from "./bi-formula";
import { joinTables, type JoinInput } from "./bi-join";

export const BI_COLLECTIONS = {
  datasets: "bi_datasets",
  charts: "bi_charts",
  dashboards: "bi_dashboards",
} as const;

interface RawRecord {
  id: string;
  collectionId?: string;
  collectionName?: string;
  [key: string]: unknown;
}

function parseMaybeJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

// ---------------------------------------------------------------------------
// 데이터셋
// ---------------------------------------------------------------------------

function toDatasetRecord(raw: RawRecord): BiDatasetRecord & { _raw: RawRecord } {
  return {
    id: raw.id,
    name: String(raw.name ?? ""),
    rowCount: Number(raw.rowCount ?? 0),
    byteSize: Number(raw.byteSize ?? 0),
    fields: parseMaybeJson<FieldMeta[]>(raw.fields, []),
    sourceName: String(raw.sourceName ?? ""),
    version: Number(raw.version ?? 1),
    relationships: parseMaybeJson<JoinRelationship[]>(raw.relationships, []),
    data: typeof raw.data === "string" ? raw.data : undefined,
    created: typeof raw.created === "string" ? raw.created : undefined,
    updated: typeof raw.updated === "string" ? raw.updated : undefined,
    _raw: raw,
  };
}

export async function listDatasets(): Promise<(BiDatasetRecord & { _raw: RawRecord })[]> {
  const records = await pb
    .collection(BI_COLLECTIONS.datasets)
    .getFullList<RawRecord>({ sort: "-updated", $autoCancel: false });
  return records.map(toDatasetRecord);
}

export async function getDataset(id: string): Promise<BiDatasetRecord & { _raw: RawRecord }> {
  const raw = await pb.collection(BI_COLLECTIONS.datasets).getOne<RawRecord>(id, { $autoCancel: false });
  return toDatasetRecord(raw);
}

export async function createDataset(
  name: string,
  sourceName: string,
  table: DataTable,
): Promise<BiDatasetRecord> {
  const blob = serializeTable(table);
  const form = new FormData();
  form.set("name", name);
  form.set("rowCount", String(table.rowCount));
  form.set("byteSize", String(blob.size));
  form.set("fields", JSON.stringify(table.fields));
  form.set("sourceName", sourceName);
  form.set("version", "1");
  form.set("data", new File([blob], "data.json", { type: "application/json" }));
  const raw = await pb.collection(BI_COLLECTIONS.datasets).create<RawRecord>(form, { $autoCancel: false });
  const record = toDatasetRecord(raw);
  tableRegistry.set(record.id, { version: record.version, table: { ...table, datasetId: record.id } });
  return record;
}

/** 필드 메타 편집(표시명·타입 오버라이드 등) — 데이터 파일은 그대로 */
export async function updateDatasetFields(id: string, fields: FieldMeta[]): Promise<void> {
  // 조인으로 편입된 필드는 오른쪽 데이터셋 소유이므로 왼쪽 정본에 저장하지 않는다
  const ownFields = fields.filter((f) => !f.joinLabel);
  await pb
    .collection(BI_COLLECTIONS.datasets)
    .update(id, { fields: JSON.stringify(ownFields) }, { $autoCancel: false });

  const applyTo = (
    reg: Map<string, { version: number; table: DataTable }>,
    nextFields: FieldMeta[],
  ) => {
    const cached = reg.get(id);
    if (!cached) return;
    const columns = { ...cached.table.columns };
    const keep = new Set(nextFields.map((f) => f.fid));
    for (const fid of Object.keys(columns)) if (!keep.has(fid)) delete columns[fid];
    const table = { ...cached.table, fields: nextFields, columns };
    materializeDerivedFields(table);
    cached.table = table;
  };
  // 베이스 캐시는 왼쪽 소유 필드만, 최종(조인) 캐시는 조인 필드까지 포함
  applyTo(baseRegistry, ownFields);
  applyTo(tableRegistry, fields);
}

export async function renameDataset(id: string, name: string): Promise<void> {
  await pb.collection(BI_COLLECTIONS.datasets).update(id, { name }, { $autoCancel: false });
}

/** 조인 관계 편집 — version을 올려 조인된 캐시 테이블을 무효화한다 */
export async function updateDatasetRelationships(
  id: string,
  relationships: JoinRelationship[],
): Promise<void> {
  const current = await getDataset(id);
  await pb.collection(BI_COLLECTIONS.datasets).update(
    id,
    { relationships: JSON.stringify(relationships), version: current.version + 1 },
    { $autoCancel: false },
  );
  tableRegistry.delete(id); // 조인 결과 재빌드 강제
}

export async function deleteDataset(id: string): Promise<void> {
  await pb.collection(BI_COLLECTIONS.datasets).delete(id, { $autoCancel: false });
  tableRegistry.delete(id);
  baseRegistry.delete(id);
}

// ---------------------------------------------------------------------------
// 인메모리 테이블 레지스트리
// ---------------------------------------------------------------------------

// 최종(조인 반영) 테이블 캐시 — 차트/쿼리가 getCachedTable로 읽는다
const tableRegistry = new Map<string, { version: number; table: DataTable }>();
// 조인 이전 베이스 테이블 캐시 — 조인 재빌드/오른쪽 참조에 재사용
const baseRegistry = new Map<string, { version: number; table: DataTable }>();
const inflight = new Map<string, Promise<DataTable>>();

export function getCachedTable(datasetId: string): DataTable | undefined {
  return tableRegistry.get(datasetId)?.table;
}

/** 조인을 적용하지 않은 단일 데이터셋 테이블(디멘션 로드/조인 입력용) */
async function loadBaseTable(record: BiDatasetRecord & { _raw?: RawRecord }): Promise<DataTable> {
  const cached = baseRegistry.get(record.id);
  if (cached && cached.version === record.version) return cached.table;
  if (!record.data) throw new Error("데이터 파일이 없습니다.");
  const raw = record._raw ?? (await pb.collection(BI_COLLECTIONS.datasets).getOne<RawRecord>(record.id));
  const url = pb.files.getURL(raw, record.data);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`데이터 파일 로드 실패 (${res.status})`);
  const json = (await res.json()) as unknown;
  const table = deserializeTable(record.id, record.fields, json);
  materializeDerivedFields(table);
  baseRegistry.set(record.id, { version: record.version, table });
  return table;
}

export async function loadTable(record: BiDatasetRecord & { _raw?: RawRecord }): Promise<DataTable> {
  const cached = tableRegistry.get(record.id);
  if (cached && cached.version === record.version) return cached.table;

  const existing = inflight.get(record.id);
  if (existing) return existing;

  const promise = (async () => {
    const base = await loadBaseTable(record);
    const rels = record.relationships ?? [];
    if (rels.length === 0) {
      tableRegistry.set(record.id, { version: record.version, table: base });
      return base;
    }
    // 오른쪽(디멘션) 베이스 테이블을 모아 조인
    const inputs: JoinInput[] = [];
    for (const rel of rels) {
      const rightRec = await getDataset(rel.rightDatasetId);
      const rightTable = await loadBaseTable(rightRec);
      inputs.push({ table: rightTable, rel, label: rightRec.name });
    }
    const joined = joinTables(base, inputs);
    materializeDerivedFields(joined); // 조인 컬럼을 참조하는 계산 필드 채우기
    tableRegistry.set(record.id, { version: record.version, table: joined });
    return joined;
  })();
  inflight.set(record.id, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(record.id);
  }
}

// ---------------------------------------------------------------------------
// 차트
// ---------------------------------------------------------------------------

function toChartRecord(raw: RawRecord): BiChartRecord {
  return {
    id: raw.id,
    datasetId: String(raw.datasetId ?? ""),
    name: String(raw.name ?? ""),
    spec: parseMaybeJson<ChartSpec>(raw.spec, {
      datasetId: String(raw.datasetId ?? ""),
      markType: "auto",
      encodings: {},
      stack: "none",
      filters: [],
      style: {},
      meta: { origin: "manual" },
    }),
    created: typeof raw.created === "string" ? raw.created : undefined,
    updated: typeof raw.updated === "string" ? raw.updated : undefined,
  };
}

export async function listCharts(datasetId?: string): Promise<BiChartRecord[]> {
  const records = await pb.collection(BI_COLLECTIONS.charts).getFullList<RawRecord>({
    sort: "-updated",
    ...(datasetId ? { filter: pb.filter("datasetId = {:datasetId}", { datasetId }) } : {}),
    $autoCancel: false,
  });
  return records.map(toChartRecord);
}

export async function getChart(id: string): Promise<BiChartRecord> {
  const raw = await pb.collection(BI_COLLECTIONS.charts).getOne<RawRecord>(id, { $autoCancel: false });
  return toChartRecord(raw);
}

export async function saveChart(input: {
  id?: string;
  datasetId: string;
  name: string;
  spec: ChartSpec;
}): Promise<BiChartRecord> {
  const payload = {
    datasetId: input.datasetId,
    name: input.name,
    spec: JSON.stringify(input.spec),
  };
  const raw = input.id
    ? await pb.collection(BI_COLLECTIONS.charts).update<RawRecord>(input.id, payload, { $autoCancel: false })
    : await pb.collection(BI_COLLECTIONS.charts).create<RawRecord>(payload, { $autoCancel: false });
  return toChartRecord(raw);
}

export async function deleteChart(id: string): Promise<void> {
  await pb.collection(BI_COLLECTIONS.charts).delete(id, { $autoCancel: false });
}

// ---------------------------------------------------------------------------
// 대시보드
// ---------------------------------------------------------------------------

const EMPTY_DASHBOARD: DashboardConfig = { widgets: [], globalFilters: [], crossFilter: true };

function toDashboardRecord(raw: RawRecord): BiDashboardRecord {
  return {
    id: raw.id,
    name: String(raw.name ?? ""),
    config: parseMaybeJson<DashboardConfig>(raw.config, EMPTY_DASHBOARD),
    created: typeof raw.created === "string" ? raw.created : undefined,
    updated: typeof raw.updated === "string" ? raw.updated : undefined,
  };
}

export async function listDashboards(): Promise<BiDashboardRecord[]> {
  const records = await pb
    .collection(BI_COLLECTIONS.dashboards)
    .getFullList<RawRecord>({ sort: "-updated", $autoCancel: false });
  return records.map(toDashboardRecord);
}

export async function getDashboard(id: string): Promise<BiDashboardRecord> {
  const raw = await pb.collection(BI_COLLECTIONS.dashboards).getOne<RawRecord>(id, { $autoCancel: false });
  return toDashboardRecord(raw);
}

export async function saveDashboard(input: {
  id?: string;
  name: string;
  config: DashboardConfig;
}): Promise<BiDashboardRecord> {
  const payload = { name: input.name, config: JSON.stringify(input.config) };
  const raw = input.id
    ? await pb.collection(BI_COLLECTIONS.dashboards).update<RawRecord>(input.id, payload, { $autoCancel: false })
    : await pb.collection(BI_COLLECTIONS.dashboards).create<RawRecord>(payload, { $autoCancel: false });
  return toDashboardRecord(raw);
}

export async function deleteDashboard(id: string): Promise<void> {
  await pb.collection(BI_COLLECTIONS.dashboards).delete(id, { $autoCancel: false });
}

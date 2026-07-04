/**
 * bi-hooks — TanStack Query 기반 데이터 훅. 컴포넌트는 이 훅만 사용한다.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type {
  BiChartRecord,
  BiDashboardRecord,
  BiDatasetRecord,
  ChartSpec,
  DashboardConfig,
  DataTable,
  FieldMeta,
  FilterRule,
  JoinRelationship,
  QueryResult,
} from "./bi-types";
import {
  createDataset,
  deleteChart,
  deleteDashboard,
  deleteDataset,
  getDashboard,
  getDataset,
  listCharts,
  listDashboards,
  listDatasets,
  loadTable,
  renameDataset,
  saveChart,
  saveDashboard,
  updateDatasetFields,
  updateDatasetRelationships,
} from "./bi-store";
import { deriveChartQuery, type DerivedChartQuery } from "./bi-derive";
import { runQuery } from "./bi-engine";

const KEYS = {
  datasets: ["bi", "datasets"] as const,
  dataset: (id: string) => ["bi", "dataset", id] as const,
  charts: (datasetId?: string) => ["bi", "charts", datasetId ?? "all"] as const,
  dashboards: ["bi", "dashboards"] as const,
};

export function useDatasets() {
  return useQuery({ queryKey: KEYS.datasets, queryFn: listDatasets });
}

export interface DatasetBundle {
  record: BiDatasetRecord;
  table: DataTable;
}

/** 데이터셋 레코드 + 인메모리 테이블 (재방문 시 파일 복원 포함) */
export function useDatasetTable(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.dataset(id ?? "none"),
    enabled: Boolean(id),
    staleTime: 60_000,
    queryFn: async (): Promise<DatasetBundle> => {
      const record = await getDataset(id!);
      const table = await loadTable(record);
      return { record, table };
    },
  });
}

export function useCharts(datasetId?: string) {
  return useQuery({ queryKey: KEYS.charts(datasetId), queryFn: () => listCharts(datasetId) });
}

export function useDashboards() {
  return useQuery({ queryKey: KEYS.dashboards, queryFn: listDashboards });
}

export interface DashboardBundle {
  dashboard: BiDashboardRecord;
  charts: BiChartRecord[];
  tables: Record<string, DataTable>;
  datasets: Record<string, BiDatasetRecord>;
}

/** 대시보드 + 참조 차트 + 필요한 데이터셋 테이블 일괄 로드 */
export function useDashboardBundle(id: string | undefined) {
  return useQuery({
    queryKey: ["bi", "dashboard", id ?? "none"],
    enabled: Boolean(id),
    queryFn: async (): Promise<DashboardBundle> => {
      const [dashboard, charts] = await Promise.all([getDashboard(id!), listCharts()]);
      const chartIds = new Set(
        dashboard.config.widgets.map((w) => w.chartId).filter(Boolean) as string[],
      );
      const usedCharts = charts.filter((c) => chartIds.has(c.id));
      const datasetIds = [...new Set(usedCharts.map((c) => c.datasetId))];
      const tables: Record<string, DataTable> = {};
      const datasets: Record<string, BiDatasetRecord> = {};
      await Promise.all(
        datasetIds.map(async (dsId) => {
          try {
            const record = await getDataset(dsId);
            datasets[dsId] = record;
            tables[dsId] = await loadTable(record);
          } catch {
            // 삭제된 데이터셋 — 위젯은 오류 상태로 렌더
          }
        }),
      );
      return { dashboard, charts: usedCharts, tables, datasets };
    },
  });
}

// ---------------------------------------------------------------------------
// 뮤테이션
// ---------------------------------------------------------------------------

export function useCreateDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; sourceName: string; table: DataTable }) =>
      createDataset(input.name, input.sourceName, input.table),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.datasets }),
  });
}

export function useDeleteDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDataset(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bi"] }),
  });
}

export function useRenameDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) => renameDataset(input.id, input.name),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: KEYS.datasets });
      qc.invalidateQueries({ queryKey: KEYS.dataset(v.id) });
    },
  });
}

export function useUpdateDatasetFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; fields: FieldMeta[] }) =>
      updateDatasetFields(input.id, input.fields),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: KEYS.dataset(v.id) });
      qc.invalidateQueries({ queryKey: KEYS.datasets });
    },
  });
}

export function useUpdateDatasetRelationships() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; relationships: JoinRelationship[] }) =>
      updateDatasetRelationships(input.id, input.relationships),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: KEYS.dataset(v.id) });
      qc.invalidateQueries({ queryKey: KEYS.datasets });
    },
  });
}

export function useSaveChart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; datasetId: string; name: string; spec: ChartSpec }) =>
      saveChart(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bi", "charts"] }),
  });
}

export function useDeleteChart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteChart(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bi", "charts"] }),
  });
}

export function useSaveDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; name: string; config: DashboardConfig }) =>
      saveDashboard(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.dashboards }),
  });
}

export function useDeleteDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDashboard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.dashboards }),
  });
}

// ---------------------------------------------------------------------------
// 차트 실행 — ChartSpec → (derive) → QueryResult (동기 인메모리)
// ---------------------------------------------------------------------------

export interface ChartComputation {
  derived: DerivedChartQuery | null;
  result: QueryResult | null;
  error: string | null;
}

/**
 * spec+테이블에서 파생 질의·결과를 계산한다. 순수 메모 — 같은 spec이면
 * 재계산하지 않는다. 추가 필터(대시보드 전역/크로스필터)는 concat 규칙(GOAL §11).
 */
export function useChartComputation(
  table: DataTable | undefined,
  spec: ChartSpec | undefined,
  extraFilters: FilterRule[] = [],
): ChartComputation {
  const extraKey = JSON.stringify(extraFilters);
  return useMemo(() => {
    if (!table || !spec) return { derived: null, result: null, error: null };
    try {
      const merged: ChartSpec = extraFilters.length
        ? { ...spec, filters: [...spec.filters, ...extraFilters] }
        : spec;
      const derived = deriveChartQuery(merged, table);
      const result = runQuery(table, derived.query);
      return { derived, result, error: null };
    } catch (error) {
      return {
        derived: null,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, spec, extraKey]);
}

export type { BiChartRecord, BiDashboardRecord, BiDatasetRecord };

#!/usr/bin/env node
/**
 * bi-workbench 런타임 스모크 — 새 스키마(bi_datasets 파일 정본) 검증
 *
 * 1) 컬럼 지향 JSON 파일을 가진 데이터셋 레코드 생성
 * 2) ChartSpec 차트 + 대시보드 생성
 * 3) 재조회로 파일 URL·spec 파싱 검증
 * 4) 기본은 정리(cleanup). --keep 로 레코드 유지
 *
 * 연결: RUNTIME_APP_ID/RUNTIME_CODEBASE_ID + SM_INTERNAL_URL (코더 런타임)
 *       또는 PB_API_BASE (+ PB_SUPERUSER_TOKEN)
 */

const runtimeId = process.env.RUNTIME_APP_ID || process.env.RUNTIME_CODEBASE_ID;
const internalUrl = process.env.SM_INTERNAL_URL;
const directApiBase = process.env.PB_API_BASE;
const keep = process.argv.includes("--keep");

if (!directApiBase && (!runtimeId || !internalUrl)) {
  console.error("Missing PB_API_BASE or RUNTIME_APP_ID/RUNTIME_CODEBASE_ID with SM_INTERNAL_URL.");
  process.exit(1);
}

const apiBase = directApiBase
  ? directApiBase.replace(/\/$/, "")
  : `${internalUrl.replace(/\/$/, "")}/internal/coder/runtime/${runtimeId}/data/api`;

const authHeaders = process.env.PB_SUPERUSER_TOKEN
  ? { Authorization: `Bearer ${process.env.PB_SUPERUSER_TOKEN}` }
  : {};

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { ...authHeaders, ...(options.headers || {}) },
  });
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  }
  if (response.status === 204) return {};
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

function assert(cond, message) {
  if (!cond) throw new Error(`smoke assertion failed: ${message}`);
}

async function main() {
  const stamp = Date.now().toString(36);

  // 1) 데이터셋 — 컬럼 지향 JSON 파일이 정본
  const fields = [
    {
      fid: "f1_region",
      name: "region",
      displayName: "region",
      analyticType: "dimension",
      semanticType: "nominal",
      dataType: "string",
      hidden: false,
      profile: { count: 4, nullCount: 0, distinctCount: 3, topValues: [{ value: "KR", count: 2 }] },
    },
    {
      fid: "f2_revenue",
      name: "revenue",
      displayName: "revenue",
      analyticType: "measure",
      semanticType: "quantitative",
      dataType: "int",
      hidden: false,
      profile: { count: 4, nullCount: 0, distinctCount: 4, min: 30, max: 120, mean: 69 },
    },
  ];
  const payload = {
    v: 1,
    rowCount: 4,
    cols: { f1_region: ["KR", "JP", "SG", "KR"], f2_revenue: [120, 84, 42, 30] },
  };
  const form = new FormData();
  form.set("name", `smoke_dataset_${stamp}`);
  form.set("rowCount", "4");
  form.set("byteSize", String(JSON.stringify(payload).length));
  form.set("fields", JSON.stringify(fields));
  form.set("sourceName", "smoke.json");
  form.set("version", "1");
  form.set("data", new Blob([JSON.stringify(payload)], { type: "application/json" }), "data.json");
  const dataset = await request("/collections/bi_datasets/records", { method: "POST", body: form });
  assert(dataset.id, "dataset id");
  assert(typeof dataset.data === "string" && dataset.data.length > 0, "dataset file stored");
  console.log(`dataset created: ${dataset.id}`);

  // 2) 파일 재다운로드 검증
  const fileRes = await fetch(
    `${apiBase.replace(/\/api$/, "")}/api/files/${dataset.collectionId}/${dataset.id}/${dataset.data}`,
    { headers: authHeaders },
  );
  assert(fileRes.ok, `file download (${fileRes.status})`);
  const restored = await fileRes.json();
  assert(restored.rowCount === 4 && restored.cols.f2_revenue[0] === 120, "file roundtrip");
  console.log("dataset file roundtrip ok");

  // 3) 차트 (ChartSpec)
  const spec = {
    datasetId: dataset.id,
    markType: "bar",
    encodings: { x: { fid: "f1_region", sort: "byMeasure" }, y: [{ fid: "f2_revenue", agg: "sum" }] },
    stack: "none",
    filters: [],
    style: {},
    meta: { origin: "manual", title: "smoke bar" },
  };
  const chart = await request("/collections/bi_charts/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: `smoke_chart_${stamp}`, datasetId: dataset.id, spec: JSON.stringify(spec) }),
  });
  assert(chart.id, "chart id");
  console.log(`chart created: ${chart.id}`);

  // 4) 대시보드 (위젯 + 전역필터 구조)
  const config = {
    widgets: [{ id: "w1", kind: "chart", chartId: chart.id, layout: { x: 0, y: 0, w: 6, h: 4 } }],
    globalFilters: [{ datasetId: dataset.id, rule: { fid: "f1_region", op: "oneOf", values: ["KR"] } }],
    crossFilter: true,
  };
  const dashboard = await request("/collections/bi_dashboards/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: `smoke_dash_${stamp}`, config: JSON.stringify(config) }),
  });
  assert(dashboard.id, "dashboard id");
  console.log(`dashboard created: ${dashboard.id}`);

  // 5) 재조회 파싱 검증
  const chartBack = await request(`/collections/bi_charts/records/${chart.id}`);
  const parsedSpec = typeof chartBack.spec === "string" ? JSON.parse(chartBack.spec) : chartBack.spec;
  assert(parsedSpec.encodings.x.fid === "f1_region", "chart spec roundtrip");
  const dashBack = await request(`/collections/bi_dashboards/records/${dashboard.id}`);
  const parsedConfig = typeof dashBack.config === "string" ? JSON.parse(dashBack.config) : dashBack.config;
  assert(parsedConfig.widgets[0].chartId === chart.id, "dashboard config roundtrip");
  console.log("record roundtrips ok");

  if (!keep) {
    await request(`/collections/bi_dashboards/records/${dashboard.id}`, { method: "DELETE" }).catch(() => {});
    await request(`/collections/bi_charts/records/${chart.id}`, { method: "DELETE" }).catch(() => {});
    await request(`/collections/bi_datasets/records/${dataset.id}`, { method: "DELETE" }).catch(() => {});
    console.log("cleaned up (use --keep to retain records)");
  }
  console.log("bi-workbench smoke passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

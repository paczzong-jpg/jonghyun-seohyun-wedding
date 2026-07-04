#!/usr/bin/env node
/**
 * bi-workbench PocketBase 컬렉션 셋업 (GOAL §12 축소판)
 *
 * 사용:
 *  - 코더 런타임: RUNTIME_APP_ID(또는 RUNTIME_CODEBASE_ID) + SM_INTERNAL_URL
 *  - 로컬 PB:     PB_API_BASE(+ PB_SUPERUSER_TOKEN 필요 시)
 *
 * 데이터 rows는 레코드가 아니라 bi_datasets.data 파일(컬럼 지향 JSON)로
 * 저장된다 — 컬렉션은 3개면 충분하다.
 */

const runtimeId = process.env.RUNTIME_APP_ID || process.env.RUNTIME_CODEBASE_ID;
const internalUrl = process.env.SM_INTERNAL_URL;
const directApiBase = process.env.PB_API_BASE;

if (!directApiBase && (!runtimeId || !internalUrl)) {
  console.error("Missing PB_API_BASE or RUNTIME_APP_ID/RUNTIME_CODEBASE_ID with SM_INTERNAL_URL.");
  process.exit(1);
}

const apiBase = directApiBase
  ? directApiBase.replace(/\/$/, "")
  : `${internalUrl.replace(/\/$/, "")}/internal/coder/runtime/${runtimeId}/data/api`;
const endpoint = `${apiBase}/collections`;

const text = (name, required = false, max = 5000) => ({ name, type: "text", required, max });
const number = (name) => ({ name, type: "number" });
const json = (name, maxSize = 20 * 1024 * 1024) => ({ name, type: "json", maxSize });
const autodate = [
  { name: "created", type: "autodate", onCreate: true, onUpdate: false },
  { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
];

const collections = [
  {
    name: "bi_datasets",
    fields: [
      text("name", true, 500),
      number("rowCount"),
      number("byteSize"),
      json("fields"),
      json("relationships"),
      text("sourceName", false, 1000),
      number("version"),
      {
        name: "data",
        type: "file",
        maxSelect: 1,
        maxSize: 200 * 1024 * 1024,
        mimeTypes: ["application/json"],
      },
      ...autodate,
    ],
  },
  {
    name: "bi_charts",
    fields: [text("name", true, 500), text("datasetId", true, 100), json("spec"), ...autodate],
  },
  {
    name: "bi_dashboards",
    fields: [text("name", true, 500), json("config"), ...autodate],
  },
];

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(process.env.PB_SUPERUSER_TOKEN
        ? { Authorization: `Bearer ${process.env.PB_SUPERUSER_TOKEN}` }
        : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${body}`);
  }
  return response.json();
}

async function upsertCollection(existingItems, collection) {
  // 스타터 정책: 오픈 룰. 로그인/워크스페이스 롤을 붙일 때 조여야 한다.
  const payload = {
    name: collection.name,
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: collection.fields,
  };
  const existing = existingItems.find((item) => item.name === collection.name);
  if (existing) {
    await request(`${endpoint}/${existing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    console.log(`updated ${collection.name}`);
    return;
  }
  await request(endpoint, { method: "POST", body: JSON.stringify(payload) });
  console.log(`created ${collection.name}`);
}

async function main() {
  const existingResponse = await request(`${endpoint}?perPage=200`);
  const existingItems = Array.isArray(existingResponse?.items)
    ? existingResponse.items
    : Array.isArray(existingResponse)
      ? existingResponse
      : [];
  for (const collection of collections) {
    await upsertCollection(existingItems, collection);
  }
  console.log("bi-workbench collections ready.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

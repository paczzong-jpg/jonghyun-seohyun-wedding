#!/usr/bin/env node
// 마케팅 스튜디오 PB 컬렉션 셋업 — 샌드박스 내부 런타임 API 로 upsert 한다.
// 사용: node api/setup_marketing_collections.mjs

const runtimeId = process.env.RUNTIME_APP_ID || process.env.RUNTIME_CODEBASE_ID;
const internalUrl = process.env.SM_INTERNAL_URL;

if (!runtimeId || !internalUrl) {
  console.error("Missing RUNTIME_APP_ID/RUNTIME_CODEBASE_ID or SM_INTERNAL_URL.");
  process.exit(1);
}

const endpoint = `${internalUrl.replace(/\/$/, "")}/internal/coder/runtime/${runtimeId}/data/api/collections`;

const dateFields = [
  { name: "created", type: "autodate", onCreate: true, onUpdate: false },
  { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
];

const openRules = {
  listRule: "",
  viewRule: "",
  createRule: "",
  updateRule: "",
  deleteRule: "",
};

const collections = [
  {
    name: "marketing_brands",
    fields: [
      { name: "url", type: "text", required: true, max: 2000 },
      { name: "name", type: "text", required: true },
      { name: "industry", type: "text" },
      { name: "tagline", type: "text", max: 1000 },
      { name: "valueProposition", type: "text", max: 2000 },
      { name: "toneOfVoice", type: "json" },
      { name: "personality", type: "json" },
      { name: "targetAudience", type: "text", max: 1000 },
      { name: "keyMessages", type: "json" },
      { name: "primaryColors", type: "json" },
      { name: "secondaryColors", type: "json" },
      { name: "fonts", type: "json" },
      { name: "logoUrl", type: "text", max: 2000 },
      { name: "ogImageUrl", type: "text", max: 2000 },
      { name: "images", type: "json", maxSize: 50000 },
      { name: "imageryStyle", type: "text" },
      { name: "layoutStyle", type: "text" },
      { name: "language", type: "text" },
      ...dateFields,
    ],
  },
  {
    name: "marketing_campaigns",
    fields: [
      { name: "brandId", type: "text", required: true },
      { name: "goal", type: "text", required: true },
      { name: "direction", type: "text", max: 2000 },
      { name: "concepts", type: "json", maxSize: 100000 },
      ...dateFields,
    ],
  },
  {
    name: "marketing_assets",
    fields: [
      { name: "campaignId", type: "text", required: true },
      { name: "brandId", type: "text", required: true },
      { name: "conceptIndex", type: "number" },
      { name: "platformId", type: "text", required: true },
      { name: "headline", type: "text", max: 500 },
      { name: "body", type: "text", max: 2000 },
      { name: "cta", type: "text", max: 200 },
      { name: "style", type: "json" },
      ...dateFields,
    ],
  },
];

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${body}`);
  }
  return response.json();
}

async function listCollections() {
  const result = await request(endpoint);
  if (Array.isArray(result?.items)) return result.items;
  return Array.isArray(result) ? result : [];
}

async function upsertCollection(collection, existing) {
  const current = existing.find((item) => item.name === collection.name);
  const payload = {
    name: collection.name,
    type: "base",
    ...openRules,
    fields: collection.fields,
  };
  if (current) {
    await request(`${endpoint}/${current.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    console.log(`updated ${collection.name}`);
  } else {
    await request(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log(`created ${collection.name}`);
  }
}

async function main() {
  const existing = await listCollections();
  for (const collection of collections) {
    await upsertCollection(collection, existing);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

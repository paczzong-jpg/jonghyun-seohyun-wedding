#!/usr/bin/env node

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
    name: "chat_users",
    fields: [
      { name: "userKey", type: "text", required: true },
      { name: "displayName", type: "text", required: true },
      { name: "email", type: "text" },
      { name: "role", type: "text", required: true },
      ...dateFields,
    ],
  },
  {
    name: "chat_conversations",
    fields: [
      { name: "ownerKey", type: "text", required: true },
      { name: "title", type: "text", required: true },
      { name: "visibility", type: "text", required: true },
      { name: "endpointId", type: "text", required: true },
      { name: "endpointKind", type: "text", required: true },
      { name: "endpointLabel", type: "text", required: true },
      { name: "modelLabel", type: "text" },
      { name: "remoteConversationId", type: "text" },
      { name: "pinned", type: "bool" },
      { name: "archived", type: "bool" },
      ...dateFields,
    ],
  },
  {
    name: "chat_messages",
    fields: [
      { name: "conversationId", type: "text", required: true },
      { name: "ownerKey", type: "text", required: true },
      { name: "role", type: "text", required: true },
      { name: "content", type: "text", max: 50000 },
      { name: "attachments", type: "json" },
      { name: "status", type: "text", required: true },
      { name: "metadata", type: "json" },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
  },
  {
    name: "chat_feedback",
    fields: [
      { name: "messageId", type: "text", required: true },
      { name: "ownerKey", type: "text", required: true },
      { name: "rating", type: "text", required: true },
      { name: "note", type: "text", max: 10000 },
      ...dateFields,
    ],
  },
  {
    name: "chat_artifacts",
    fields: [
      { name: "conversationId", type: "text", required: true },
      { name: "ownerKey", type: "text", required: true },
      { name: "messageId", type: "text" },
      { name: "kind", type: "text", required: true },
      { name: "title", type: "text", required: true },
      { name: "content", type: "text", max: 100000 },
      { name: "language", type: "text" },
      { name: "status", type: "text", required: true },
      { name: "version", type: "number" },
      { name: "metadata", type: "json" },
      ...dateFields,
    ],
  },
  {
    name: "chat_artifact_versions",
    fields: [
      { name: "artifactId", type: "text", required: true },
      { name: "ownerKey", type: "text", required: true },
      { name: "version", type: "number", required: true },
      { name: "title", type: "text", required: true },
      { name: "content", type: "text", max: 100000 },
      { name: "language", type: "text" },
      { name: "source", type: "text", required: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
  },
  {
    name: "chat_suggestions",
    fields: [
      { name: "artifactId", type: "text", required: true },
      { name: "ownerKey", type: "text", required: true },
      { name: "description", type: "text", required: true, max: 10000 },
      { name: "originalText", type: "text", max: 50000 },
      { name: "suggestedText", type: "text", required: true, max: 50000 },
      { name: "resolved", type: "bool" },
      ...dateFields,
    ],
  },
  {
    name: "chat_usage_events",
    fields: [
      { name: "conversationId", type: "text", required: true },
      { name: "ownerKey", type: "text", required: true },
      { name: "eventType", type: "text", required: true },
      { name: "metadata", type: "json" },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
  },
];

const seedUsers = [
  { userKey: "guest:ally", displayName: "Ally", email: "ally@example.com", role: "member" },
  { userKey: "guest:young", displayName: "Young", email: "young@example.com", role: "owner" },
  { userKey: "guest:eugene", displayName: "Eugene", email: "eugene@example.com", role: "member" },
  { userKey: "guest:kade", displayName: "Kade", email: "kade@example.com", role: "member" },
  { userKey: "guest:han", displayName: "Han", email: "han@example.com", role: "member" },
  { userKey: "guest:heather", displayName: "Heather", email: "heather@example.com", role: "member" },
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

function recordsEndpoint(collectionName) {
  return `${endpoint}/${collectionName}/records`;
}

async function hasRecords(collectionName) {
  const url = new URL(recordsEndpoint(collectionName));
  url.searchParams.set("perPage", "1");
  const result = await request(url.toString());
  return Array.isArray(result?.items) && result.items.length > 0;
}

async function createRecord(collectionName, data) {
  return request(recordsEndpoint(collectionName), {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function seed() {
  if (!(await hasRecords("chat_users"))) {
    for (const user of seedUsers) {
      await createRecord("chat_users", user);
    }
    console.log(`seeded ${seedUsers.length} chat users`);
  }

  if (await hasRecords("chat_conversations")) return;

  const conversation = await createRecord("chat_conversations", {
    ownerKey: "guest:young",
    title: "MISO 운영 준비",
    visibility: "team",
    endpointId: "direct-llm",
    endpointKind: "direct-llm",
    endpointLabel: "Direct LLM",
    modelLabel: "",
    remoteConversationId: "",
    pinned: true,
    archived: false,
  });

  await createRecord("chat_messages", {
    conversationId: conversation.id,
    ownerKey: "guest:young",
    role: "user",
    content: "이번 주 MISO Coder 운영 점검 항목을 정리해줘.",
    attachments: [],
    status: "done",
    metadata: { seeded: true },
  });
  await createRecord("chat_messages", {
    conversationId: conversation.id,
    ownerKey: "guest:young",
    role: "assistant",
    content: "배포 상태, 런타임 에러, 사용자 피드백, 비용 지표를 나눠 점검하면 됩니다.",
    attachments: [],
    status: "done",
    metadata: { seeded: true },
  });
  const artifact = await createRecord("chat_artifacts", {
    conversationId: conversation.id,
    ownerKey: "guest:young",
    messageId: "",
    kind: "text",
    title: "운영 점검 canvas",
    content: "배포 상태\n런타임 에러\n사용자 피드백\n비용 지표",
    language: "markdown",
    status: "ready",
    version: 1,
    metadata: { seeded: true },
  });
  await createRecord("chat_artifact_versions", {
    artifactId: artifact.id,
    ownerKey: "guest:young",
    version: 1,
    title: "운영 점검 canvas",
    content: "배포 상태\n런타임 에러\n사용자 피드백\n비용 지표",
    language: "markdown",
    source: "seed",
  });
  console.log("seeded chat conversation");
}

async function main() {
  const existing = await listCollections();
  for (const collection of collections) {
    await upsertCollection(collection, existing);
  }
  await seed();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

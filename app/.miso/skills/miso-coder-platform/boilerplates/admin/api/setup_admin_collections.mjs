#!/usr/bin/env node

const runtimeId = process.env.RUNTIME_APP_ID || process.env.RUNTIME_CODEBASE_ID;
const internalUrl = process.env.SM_INTERNAL_URL;
const taskCollectionName = process.env.ADMIN_TASKS_COLLECTION || process.env.RECORDS_COLLECTION || "admin_tasks";
const userCollectionName = process.env.ADMIN_USERS_COLLECTION || "admin_users";

if (!runtimeId || !internalUrl) {
  console.error("Missing RUNTIME_APP_ID/RUNTIME_CODEBASE_ID or SM_INTERNAL_URL.");
  process.exit(1);
}

const endpoint = `${internalUrl.replace(/\/$/, "")}/internal/coder/runtime/${runtimeId}/data/api/collections`;

const taskFields = [
  { name: "name", type: "text", required: true },
  { name: "category", type: "text", required: true },
  { name: "status", type: "text", required: true },
  { name: "priority", type: "text", required: true },
  { name: "owner", type: "text", required: true },
  { name: "amount", type: "number" },
  { name: "dueDate", type: "text" },
  { name: "memo", type: "text", max: 10000 },
  { name: "created", type: "autodate", onCreate: true, onUpdate: false },
  { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
];

const userFields = [
  { name: "firstName", type: "text", required: true },
  { name: "lastName", type: "text" },
  { name: "username", type: "text", required: true },
  { name: "email", type: "email", required: true },
  { name: "phoneNumber", type: "text" },
  { name: "status", type: "text", required: true },
  { name: "role", type: "text", required: true },
  { name: "department", type: "text", required: true },
  { name: "created", type: "autodate", onCreate: true, onUpdate: false },
  { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
];

const seedTasks = [
  {
    name: "관리자 대시보드 KPI 구성",
    category: "기획",
    status: "진행중",
    priority: "높음",
    owner: "Young",
    amount: 1200000,
    dueDate: "2026-07-03",
    memo: "운영자가 첫 화면에서 상태를 판단할 수 있게 KPI와 최근 활동을 정리한다.",
  },
  {
    name: "리스트 필터와 일괄 액션 개선",
    category: "개발",
    status: "진행중",
    priority: "긴급",
    owner: "Eugene",
    amount: 800000,
    dueDate: "2026-07-01",
    memo: "검색, 상태, 우선순위, 담당자 필터를 한 화면에서 빠르게 조작한다.",
  },
  {
    name: "PocketBase 컬렉션 seed 스크립트",
    category: "개발",
    status: "완료",
    priority: "보통",
    owner: "Kade",
    amount: 500000,
    dueDate: "2026-06-30",
    memo: "새 앱 생성 후 컬렉션과 샘플 데이터를 한 번에 준비한다.",
  },
  {
    name: "운영 권한 정책 점검",
    category: "운영",
    status: "보류",
    priority: "높음",
    owner: "Han",
    amount: 300000,
    dueDate: "2026-07-05",
    memo: "공개 generated app과 운영자 화면의 권한 경계를 분리한다.",
  },
  {
    name: "테이블 빈 상태와 모바일 레이아웃",
    category: "디자인",
    status: "대기",
    priority: "보통",
    owner: "Heather",
    amount: 450000,
    dueDate: "2026-07-08",
    memo: "모바일에서도 필터, 선택, 상세 보기 흐름이 끊기지 않게 다듬는다.",
  },
  {
    name: "고객 문의 응답 매크로 정리",
    category: "고객지원",
    status: "완료",
    priority: "낮음",
    owner: "Ally",
    amount: 200000,
    dueDate: "2026-06-29",
    memo: "반복 문의 답변 템플릿을 운영 문서와 맞춘다.",
  },
];

const seedUsers = [
  {
    firstName: "Ally",
    lastName: "Kim",
    username: "ally",
    email: "ally@miso.local",
    phoneNumber: "+82-10-1000-1001",
    status: "active",
    role: "admin",
    department: "Operations",
  },
  {
    firstName: "Young",
    lastName: "Lee",
    username: "young",
    email: "young@miso.local",
    phoneNumber: "+82-10-1000-1002",
    status: "active",
    role: "owner",
    department: "Product",
  },
  {
    firstName: "Eugene",
    lastName: "Park",
    username: "eugene",
    email: "eugene@miso.local",
    phoneNumber: "+82-10-1000-1003",
    status: "active",
    role: "admin",
    department: "Engineering",
  },
  {
    firstName: "Kade",
    lastName: "Choi",
    username: "kade",
    email: "kade@miso.local",
    phoneNumber: "+82-10-1000-1004",
    status: "active",
    role: "manager",
    department: "Engineering",
  },
  {
    firstName: "Han",
    lastName: "Jung",
    username: "han",
    email: "han@miso.local",
    phoneNumber: "+82-10-1000-1005",
    status: "invited",
    role: "manager",
    department: "SRE",
  },
  {
    firstName: "Heather",
    lastName: "Kang",
    username: "heather",
    email: "heather@miso.local",
    phoneNumber: "+82-10-1000-1006",
    status: "active",
    role: "operator",
    department: "Design",
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

function recordsEndpoint(collectionName) {
  return `${endpoint}/${collectionName}/records`;
}

async function listRecords(collectionName) {
  const url = new URL(recordsEndpoint(collectionName));
  url.searchParams.set("perPage", "1");
  const result = await request(url.toString());
  return Array.isArray(result?.items) ? result.items : [];
}

async function createRecord(collectionName, data) {
  return request(recordsEndpoint(collectionName), {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function upsertCollection(existingItems, collectionName, fields) {
  const existing = existingItems.find((item) => item.name === collectionName);
  const payload = {
    name: collectionName,
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields,
  };

  if (existing) {
    await request(`${endpoint}/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    console.log(`updated ${collectionName}`);
  } else {
    await request(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log(`created ${collectionName}`);
  }
}

async function seedIfEmpty(collectionName, rows, label) {
  const current = await listRecords(collectionName);
  if (current.length === 0) {
    for (const row of rows) {
      await createRecord(collectionName, row);
    }
    console.log(`seeded ${rows.length} ${label}`);
  }
}

async function main() {
  const existingResponse = await request(endpoint);
  const existingItems = Array.isArray(existingResponse?.items)
    ? existingResponse.items
    : Array.isArray(existingResponse)
      ? existingResponse
      : [];

  await upsertCollection(existingItems, taskCollectionName, taskFields);
  await upsertCollection(existingItems, userCollectionName, userFields);
  await seedIfEmpty(taskCollectionName, seedTasks, "admin tasks");
  await seedIfEmpty(userCollectionName, seedUsers, "admin users");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

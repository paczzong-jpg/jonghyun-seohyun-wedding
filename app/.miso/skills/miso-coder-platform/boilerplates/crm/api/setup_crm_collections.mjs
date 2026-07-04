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

const rules = {
  listRule: "",
  viewRule: "",
  createRule: "",
  updateRule: "",
  deleteRule: "",
};

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

async function upsertCollection(collection) {
  const existing = await listCollections();
  const current = existing.find((item) => item.name === collection.name);
  const payload = {
    name: collection.name,
    type: "base",
    ...rules,
    fields: collection.fields,
  };
  if (current) {
    await request(`${endpoint}/${current.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    console.log(`updated ${collection.name}`);
    return current.id;
  }
  const created = await request(endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log(`created ${collection.name}`);
  return created.id;
}

function relationField(name, collectionId) {
  return { name, type: "relation", collectionId, maxSelect: 1 };
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

async function main() {
  const companiesId = await upsertCollection({
    name: "crm_companies",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "industry", type: "text" },
      { name: "owner", type: "text" },
      { name: "website", type: "text" },
      { name: "size", type: "text" },
      { name: "health", type: "text" },
      ...dateFields,
    ],
  });

  const contactsId = await upsertCollection({
    name: "crm_contacts",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "email", type: "text" },
      { name: "phone", type: "text" },
      { name: "title", type: "text" },
      { name: "owner", type: "text" },
      relationField("company", companiesId),
      { name: "lastContactedAt", type: "text" },
      ...dateFields,
    ],
  });

  const dealsId = await upsertCollection({
    name: "crm_deals",
    fields: [
      { name: "title", type: "text", required: true },
      { name: "value", type: "number" },
      { name: "stage", type: "text", required: true },
      { name: "probability", type: "number" },
      { name: "owner", type: "text" },
      relationField("company", companiesId),
      relationField("contact", contactsId),
      { name: "closeDate", type: "text" },
      { name: "nextStep", type: "text", max: 10000 },
      ...dateFields,
    ],
  });

  await upsertCollection({
    name: "crm_tasks",
    fields: [
      { name: "title", type: "text", required: true },
      { name: "status", type: "text", required: true },
      { name: "dueDate", type: "text" },
      { name: "owner", type: "text" },
      relationField("company", companiesId),
      relationField("deal", dealsId),
      { name: "memo", type: "text", max: 10000 },
      ...dateFields,
    ],
  });

  await upsertCollection({
    name: "crm_quotes",
    fields: [
      { name: "title", type: "text", required: true },
      { name: "status", type: "text", required: true },
      { name: "amount", type: "number" },
      { name: "owner", type: "text" },
      relationField("company", companiesId),
      relationField("deal", dealsId),
      { name: "expiresAt", type: "text" },
      { name: "memo", type: "text", max: 10000 },
      ...dateFields,
    ],
  });

  if (await hasRecords("crm_companies")) return;

  const miso = await createRecord("crm_companies", {
    name: "MISO Enterprise",
    industry: "SaaS",
    owner: "Young",
    website: "https://miso.example.com",
    size: "51-200",
    health: "green",
  });
  const studio = await createRecord("crm_companies", {
    name: "52g Studio",
    industry: "Media",
    owner: "Ally",
    website: "https://52g.example.com",
    size: "11-50",
    health: "yellow",
  });
  const infra = await createRecord("crm_companies", {
    name: "Cloud Ops Korea",
    industry: "Public",
    owner: "Han",
    website: "",
    size: "201-500",
    health: "green",
  });

  const young = await createRecord("crm_contacts", {
    name: "Young",
    email: "young@example.com",
    phone: "010-0000-0002",
    title: "MISO PO",
    owner: "Ally",
    company: miso.id,
    lastContactedAt: "2026-06-28",
  });
  const eugene = await createRecord("crm_contacts", {
    name: "Eugene",
    email: "eugene@example.com",
    phone: "010-0000-0003",
    title: "FE Lead",
    owner: "Young",
    company: studio.id,
    lastContactedAt: "2026-06-29",
  });
  const han = await createRecord("crm_contacts", {
    name: "Han",
    email: "han@example.com",
    phone: "010-0000-0005",
    title: "SRE",
    owner: "Kade",
    company: infra.id,
    lastContactedAt: "2026-06-27",
  });

  const dealA = await createRecord("crm_deals", {
    title: "Enterprise workspace rollout",
    value: 48000000,
    stage: "proposal",
    probability: 60,
    owner: "Young",
    company: miso.id,
    contact: young.id,
    closeDate: "2026-07-18",
    nextStep: "Send final security checklist and pricing confirmation.",
  });
  const dealB = await createRecord("crm_deals", {
    title: "Published site analytics package",
    value: 22000000,
    stage: "qualified",
    probability: 40,
    owner: "Eugene",
    company: studio.id,
    contact: eugene.id,
    closeDate: "2026-07-10",
    nextStep: "Confirm event dashboard data model.",
  });
  const dealC = await createRecord("crm_deals", {
    title: "Runtime observability support",
    value: 18000000,
    stage: "negotiation",
    probability: 70,
    owner: "Han",
    company: infra.id,
    contact: han.id,
    closeDate: "2026-07-22",
    nextStep: "Review SRE handoff and support SLA.",
  });

  await createRecord("crm_tasks", {
    title: "Prepare security Q&A",
    status: "doing",
    dueDate: "2026-07-02",
    owner: "Kade",
    company: miso.id,
    deal: dealA.id,
    memo: "Answer tenant isolation and runtime backup questions.",
  });
  await createRecord("crm_tasks", {
    title: "Send dashboard mock flow",
    status: "todo",
    dueDate: "2026-07-03",
    owner: "Heather",
    company: studio.id,
    deal: dealB.id,
    memo: "Include CRM-style analytics drilldown.",
  });

  await createRecord("crm_quotes", {
    title: "MISO Enterprise annual quote",
    status: "sent",
    amount: 48000000,
    owner: "Young",
    company: miso.id,
    deal: dealA.id,
    expiresAt: "2026-07-15",
    memo: "Annual contract, onboarding included.",
  });
  await createRecord("crm_quotes", {
    title: "Runtime support pilot",
    status: "draft",
    amount: 18000000,
    owner: "Han",
    company: infra.id,
    deal: dealC.id,
    expiresAt: "2026-07-20",
    memo: "Pilot term with renewal option.",
  });

  console.log("seeded CRM records");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

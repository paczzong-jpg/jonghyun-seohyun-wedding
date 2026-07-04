#!/usr/bin/env node

const runtimeId = process.env.RUNTIME_APP_ID || process.env.RUNTIME_CODEBASE_ID;
const internalUrl = process.env.SM_INTERNAL_URL;

if (!runtimeId || !internalUrl) {
  console.error("Missing RUNTIME_APP_ID/RUNTIME_CODEBASE_ID or SM_INTERNAL_URL.");
  process.exit(1);
}

const endpoint = `${internalUrl.replace(/\/$/, "")}/internal/coder/runtime/${runtimeId}/data/api/collections`;

const names = {
  issues: process.env.PM_ISSUES_COLLECTION || "pm_issues",
  projects: process.env.PM_PROJECTS_COLLECTION || "pm_projects",
  teams: process.env.PM_TEAMS_COLLECTION || "pm_teams",
  members: process.env.PM_MEMBERS_COLLECTION || "pm_members",
  inbox: process.env.PM_INBOX_COLLECTION || "pm_inbox",
};

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

const members = [
  { key: "ally", name: "Ally", email: "ally@miso.local", role: "Operations", status: "online", initials: "AL", joinedDate: "2026-01-12", teamKeys: ["OPS", "PRODUCT"] },
  { key: "young", name: "Young", email: "young@miso.local", role: "기획자 · MISO PO", status: "online", initials: "YO", joinedDate: "2026-01-03", teamKeys: ["PRODUCT", "DESIGN"] },
  { key: "eugene", name: "Eugene", email: "eugene@miso.local", role: "FE 개발", status: "away", initials: "EU", joinedDate: "2026-02-10", teamKeys: ["WEB", "DESIGN"] },
  { key: "kade", name: "Kade", email: "kade@miso.local", role: "BE 개발", status: "online", initials: "KA", joinedDate: "2026-02-18", teamKeys: ["PLATFORM", "OPS"] },
  { key: "han", name: "Han", email: "han@miso.local", role: "SRE", status: "offline", initials: "HA", joinedDate: "2026-03-04", teamKeys: ["PLATFORM", "OPS"] },
  { key: "heather", name: "Heather", email: "heather@miso.local", role: "UI/UX", status: "online", initials: "HE", joinedDate: "2026-03-14", teamKeys: ["DESIGN", "PRODUCT"] },
];

const teams = [
  { key: "PRODUCT", name: "Product", icon: "P", joined: true, tone: "primary", memberKeys: ["ally", "young", "heather"], projectKeys: ["pm-admin", "live-event"] },
  { key: "WEB", name: "Web", icon: "W", joined: true, tone: "blue", memberKeys: ["eugene", "heather"], projectKeys: ["pm-admin", "chat-service"] },
  { key: "PLATFORM", name: "Platform", icon: "F", joined: true, tone: "violet", memberKeys: ["kade", "han"], projectKeys: ["pb-runtime", "chat-service"] },
  { key: "DESIGN", name: "Design", icon: "D", joined: true, tone: "rose", memberKeys: ["young", "eugene", "heather"], projectKeys: ["live-event", "pm-admin"] },
  { key: "OPS", name: "Operations", icon: "O", joined: false, tone: "amber", memberKeys: ["ally", "kade", "han"], projectKeys: ["pb-runtime"] },
];

const projects = [
  { key: "pm-admin", name: "Project Management Boilerplate", status: "active", health: "on-track", priority: "high", lead: "Eugene", percentComplete: 72, targetDate: "2026-07-08", description: "Vite and PocketBase project workspace based on Circle." },
  { key: "pb-runtime", name: "PocketBase Runtime Schema", status: "active", health: "at-risk", priority: "urgent", lead: "Kade", percentComplete: 56, targetDate: "2026-07-05", description: "Schema setup, JSVM hooks, realtime-safe data model." },
  { key: "chat-service", name: "Advanced Chat Service", status: "planned", health: "no-update", priority: "medium", lead: "Young", percentComplete: 18, targetDate: "2026-07-18", description: "Conversation isolation, agent handoff, direct LLM support." },
  { key: "live-event", name: "Live Event Console", status: "active", health: "on-track", priority: "medium", lead: "Heather", percentComplete: 64, targetDate: "2026-07-12", description: "QR entry, realtime quiz, Q&A, and prize draw." },
];

const issues = [
  { identifier: "MISO-501", title: "Port Circle workspace shell to Vite", description: "Keep compact Linear-style navigation and remove Next-specific surfaces.", status: "done", priority: "high", assignee: "Eugene", teamKey: "WEB", projectKey: "pm-admin", label: "Frontend", dueDate: "2026-07-02", rank: "miso-0001" },
  { identifier: "MISO-502", title: "Add PocketBase collections for issues and projects", description: "Create setup script and PB v0.31 compatible hooks.", status: "in-progress", priority: "urgent", assignee: "Kade", teamKey: "PLATFORM", projectKey: "pb-runtime", label: "Runtime", dueDate: "2026-07-03", rank: "miso-0002" },
  { identifier: "MISO-503", title: "Design issue board and dense list states", description: "Preserve Circle density while using managed shadcn components.", status: "review", priority: "high", assignee: "Heather", teamKey: "DESIGN", projectKey: "pm-admin", label: "Design", dueDate: "2026-07-04", rank: "miso-0003" },
  { identifier: "MISO-504", title: "Clarify selective overlay README instructions", description: "Document shell, issue workspace, projects, teams, and inbox slices.", status: "todo", priority: "medium", assignee: "Young", teamKey: "PRODUCT", projectKey: "pm-admin", label: "Docs", dueDate: "2026-07-05", rank: "miso-0004" },
  { identifier: "MISO-505", title: "Verify generated app build after overlay", description: "Run a production Vite build against a copied app template.", status: "todo", priority: "medium", assignee: "Han", teamKey: "OPS", projectKey: "pb-runtime", label: "QA", dueDate: "2026-07-06", rank: "miso-0005" },
  { identifier: "MISO-506", title: "Create live event project rollup", description: "Link Q&A, quiz, and prize draw tasks to a single project view.", status: "backlog", priority: "low", assignee: "Ally", teamKey: "PRODUCT", projectKey: "live-event", label: "Operations", dueDate: "2026-07-10", rank: "miso-0006" },
  { identifier: "MISO-507", title: "Add chat service conversation ownership model", description: "Keep user isolation, provider mode, and tool route examples aligned.", status: "backlog", priority: "medium", assignee: "Kade", teamKey: "PLATFORM", projectKey: "chat-service", label: "Backend", dueDate: "2026-07-13", rank: "miso-0007" },
  { identifier: "MISO-508", title: "Tune mobile issue list density", description: "Keep row content readable without turning issue lists into cards.", status: "in-progress", priority: "medium", assignee: "Eugene", teamKey: "WEB", projectKey: "pm-admin", label: "Mobile", dueDate: "2026-07-07", rank: "miso-0008" },
];

const inbox = [
  { title: "Kade moved MISO-502 to In Progress", issueIdentifier: "MISO-502", kind: "status", actor: "Kade", read: false, createdAt: "2026-07-01 09:20:00" },
  { title: "Heather requested design review on MISO-503", issueIdentifier: "MISO-503", kind: "mention", actor: "Heather", read: false, createdAt: "2026-07-01 10:10:00" },
  { title: "MISO-505 is due this week", issueIdentifier: "MISO-505", kind: "due-date", actor: "System", read: true, createdAt: "2026-07-01 11:00:00" },
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
    ...rules,
    fields: collection.fields,
  };

  if (current) {
    await request(`${endpoint}/${current.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    console.log(`updated ${collection.name}`);
    return;
  }

  await request(endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log(`created ${collection.name}`);
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

async function seedCollection(collectionName, records) {
  if (await hasRecords(collectionName)) return;
  for (const record of records) {
    await createRecord(collectionName, record);
  }
  console.log(`seeded ${records.length} ${collectionName} records`);
}

async function main() {
  const existing = await listCollections();
  const collections = [
    {
      name: names.members,
      fields: [
        { name: "key", type: "text", required: true },
        { name: "name", type: "text", required: true },
        { name: "email", type: "text" },
        { name: "role", type: "text" },
        { name: "status", type: "text" },
        { name: "initials", type: "text" },
        { name: "joinedDate", type: "text" },
        { name: "teamKeys", type: "json" },
        ...dateFields,
      ],
    },
    {
      name: names.teams,
      fields: [
        { name: "key", type: "text", required: true },
        { name: "name", type: "text", required: true },
        { name: "icon", type: "text" },
        { name: "joined", type: "bool" },
        { name: "tone", type: "text" },
        { name: "memberKeys", type: "json" },
        { name: "projectKeys", type: "json" },
        ...dateFields,
      ],
    },
    {
      name: names.projects,
      fields: [
        { name: "key", type: "text", required: true },
        { name: "name", type: "text", required: true },
        { name: "status", type: "text" },
        { name: "health", type: "text" },
        { name: "priority", type: "text" },
        { name: "lead", type: "text" },
        { name: "percentComplete", type: "number" },
        { name: "targetDate", type: "text" },
        { name: "description", type: "text", max: 10000 },
        ...dateFields,
      ],
    },
    {
      name: names.issues,
      fields: [
        { name: "identifier", type: "text", required: true },
        { name: "title", type: "text", required: true },
        { name: "description", type: "text", max: 10000 },
        { name: "status", type: "text", required: true },
        { name: "priority", type: "text", required: true },
        { name: "assignee", type: "text" },
        { name: "teamKey", type: "text" },
        { name: "projectKey", type: "text" },
        { name: "label", type: "text" },
        { name: "dueDate", type: "text" },
        { name: "rank", type: "text" },
        ...dateFields,
      ],
    },
    {
      name: names.inbox,
      fields: [
        { name: "title", type: "text", required: true },
        { name: "issueIdentifier", type: "text" },
        { name: "kind", type: "text" },
        { name: "actor", type: "text" },
        { name: "read", type: "bool" },
        { name: "createdAt", type: "text" },
        ...dateFields,
      ],
    },
  ];

  for (const collection of collections) {
    await upsertCollection(collection, existing);
  }

  await seedCollection(names.members, members);
  await seedCollection(names.teams, teams);
  await seedCollection(names.projects, projects);
  await seedCollection(names.issues, issues);
  await seedCollection(names.inbox, inbox);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

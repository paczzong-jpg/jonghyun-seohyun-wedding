// crm_hooks.pb.js — PocketBase 서버 훅 (Go Goja ES5 런타임)
//
// 역할: CRM 레코드 생성 시 status/stage/health 기본값을 보정한다.
// 제약: async/await, import/export, npm 패키지 사용 금지.

onRecordCreateRequest(function(e) {
  if (e.collection.name === "crm_companies" && !e.record.get("health")) {
    e.record.set("health", "green");
  }

  if (e.collection.name === "crm_deals") {
    if (!e.record.get("stage")) e.record.set("stage", "lead");
    if (!e.record.get("probability")) e.record.set("probability", 25);
  }

  if (e.collection.name === "crm_tasks" && !e.record.get("status")) {
    e.record.set("status", "todo");
  }

  if (e.collection.name === "crm_quotes" && !e.record.get("status")) {
    e.record.set("status", "draft");
  }

  e.next();
});

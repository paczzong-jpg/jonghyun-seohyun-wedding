// project_management_hooks.pb.js -- PocketBase v0.31 JSVM hooks.
// Goja/CommonJS runtime only: no import/export, no npm packages, no async/await.

onRecordCreateRequest(function(e) {
  if (e.collection.name === "pm_issues") {
    if (!e.record.get("status")) e.record.set("status", "todo");
    if (!e.record.get("priority")) e.record.set("priority", "medium");
    if (!e.record.get("assignee")) e.record.set("assignee", "Ally");
    if (!e.record.get("rank")) e.record.set("rank", "miso-0001");
  }

  if (e.collection.name === "pm_projects") {
    if (!e.record.get("status")) e.record.set("status", "planned");
    if (!e.record.get("health")) e.record.set("health", "no-update");
    if (!e.record.get("priority")) e.record.set("priority", "medium");
    if (!e.record.get("percentComplete")) e.record.set("percentComplete", 0);
  }

  if (e.collection.name === "pm_teams") {
    if (e.record.get("joined") === undefined || e.record.get("joined") === null) {
      e.record.set("joined", false);
    }
  }

  if (e.collection.name === "pm_inbox" && !e.record.get("read")) {
    e.record.set("read", false);
  }

  e.next();
});

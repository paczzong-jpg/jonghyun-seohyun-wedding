// (선택) admin_tasks 컬렉션 서버훅 예시.
// Go Goja 런타임: ES5 호환, CommonJS(import/export 불가), async/await 불가.
// 외부 HTTP 호출이 필요하면 $http.send() 대신 proxyFetch()를 사용한다.

// admin_tasks 레코드 생성 전: 서버에서 기본값을 보장한다.
onRecordCreateRequest(function(e) {
  if (!e.record.get("status")) {
    e.record.set("status", "대기");
  }
  if (!e.record.get("priority")) {
    e.record.set("priority", "보통");
  }
  if (!e.record.get("owner")) {
    e.record.set("owner", "Ally");
  }
  var amount = e.record.get("amount");
  if (amount === undefined || amount === null || amount === "") {
    e.record.set("amount", 0);
  }
  e.next();
}, "admin_tasks");

// admin_users 레코드 생성 전: 초대/권한 관리 기본값을 보장한다.
onRecordCreateRequest(function(e) {
  if (!e.record.get("status")) {
    e.record.set("status", "invited");
  }
  if (!e.record.get("role")) {
    e.record.set("role", "viewer");
  }
  if (!e.record.get("department")) {
    e.record.set("department", "Operations");
  }
  if (!e.record.get("username")) {
    var email = e.record.get("email") || "operator@miso.local";
    e.record.set("username", String(email).split("@")[0]);
  }
  e.next();
}, "admin_users");

// admin_tasks 레코드 생성 후 후처리 예시.
// onRecordAfterCreateSuccess(function(e) {
//   console.log("admin_tasks created:", e.record.id);
// }, "admin_tasks");

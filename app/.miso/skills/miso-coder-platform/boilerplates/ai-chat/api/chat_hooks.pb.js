// chat_hooks.pb.js — PocketBase 서버 훅 (Go Goja ES5 런타임)
//
// 역할:
// - chat_messages 생성 시 attachments/metadata/status 기본값 보정
// - chat_conversations 생성 시 archived/pinned 기본값 보정
//
// 제약:
// - async/await, import/export, npm 패키지 사용 금지
// - 브라우저에서 호출할 외부 API는 MISO SDK를 사용하고, 비밀키가 필요한 호출은 PB hook으로 분리

onRecordCreateRequest(function(e) {
  if (e.collection.name === "chat_conversations") {
    if (e.record.get("pinned") === null) e.record.set("pinned", false);
    if (e.record.get("archived") === null) e.record.set("archived", false);
  }

  if (e.collection.name === "chat_messages") {
    if (!e.record.get("status")) e.record.set("status", "done");
    if (!e.record.get("attachments")) e.record.set("attachments", []);
    if (!e.record.get("metadata")) e.record.set("metadata", {});
  }

  e.next();
});

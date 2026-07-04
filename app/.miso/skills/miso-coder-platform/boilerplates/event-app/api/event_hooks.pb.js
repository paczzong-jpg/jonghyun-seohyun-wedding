// event_hooks.pb.js — PocketBase 서버 훅 (Go Goja ES5 런타임)
//
// 역할: participants 컬렉션에 레코드가 생성될 때 참가 확인 메일 발송.
//
// ★ messaging/mail recipe와 연계:
//   실제 메일 발송은 MISO messaging/mail recipe의 메일러 설정이 필요합니다.
//   $app.newMailClient() 또는 runtime proxy helper로 외부 메일 API(SendGrid, Resend 등)를 호출합니다.
//
// ★ 제약사항 (CRITICAL):
//   - Go Goja ES5 런타임 — async/await, import/export, npm 패키지 사용 불가
//   - 외부 HTTP: require(__hooks + "/_runtime_proxy.js") 후 runtimeProxy.proxyFetch() 사용
//   - $http.send() 직접 호출은 네트워크 격리로 실패
//
// ★ 컬렉션 생성:
//   node api/setup_event_collections.mjs
//   필요한 env: SM_INTERNAL_URL + RUNTIME_APP_ID 또는 RUNTIME_CODEBASE_ID.
//   participants, questions, quiz_*, draw_* 컬렉션을 생성/갱신한다.

onRecordAfterCreateSuccess(function(e) {
  // participants 컬렉션에만 적용
  if (e.collection.name !== "participants") {
    e.next();
    return;
  }

  var name = e.record.get("name");
  var email = e.record.get("email");

  if (!email) {
    e.next();
    return;
  }

  // ★ runtime proxy helper로 외부 메일 서비스 호출 예시 (Resend).
  // RESEND_API_KEY는 .env 에 VITE_ 없이 추가하고 $os.getenv()로 읽는다.
  // 실제 사용 전: .env 에 RESEND_API_KEY=re_xxx 추가 필요.
  var apiKey = $os.getenv("RESEND_API_KEY");

  if (!apiKey) {
    // API 키 없으면 메일 발송 생략 (개발 환경)
    console.log("[event_hooks] RESEND_API_KEY 없음 — 확인 메일 생략. email=" + email);
    e.next();
    return;
  }

  var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
  var result = runtimeProxy.proxyFetch({
    url: "https://api.resend.com/emails",
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "MISO Live 2026 <noreply@miso.example.com>",
      to: [email],
      subject: "[MISO Live 2026] 참가 신청이 완료되었습니다",
      html: "<h2>안녕하세요, " + name + "님!</h2>"
        + "<p>MISO Live 2026 참가 신청이 정상적으로 접수되었습니다.</p>"
        + "<p>행사 당일 QR 체크인 후 Q&A, 라이브 퀴즈, 경품추첨에 참여해 주세요.</p>"
        + "<p>감사합니다.</p>",
    }),
  });

  if (result.statusCode >= 400) {
    console.error("[event_hooks] 확인 메일 발송 실패. status=" + result.statusCode + " email=" + email);
  } else {
    console.log("[event_hooks] 확인 메일 발송 완료. email=" + email);
  }

  e.next();
});

// Copy to api/kakao-talk-share-webhook.pb.js.
// Receives Kakao Talk Share webhooks by GET or POST.

routerAdd("GET", "/api/kakao/talk-share-webhook", function (e) {
  var verifyKakaoAdminHeader = function () {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var expected = runtimeEnv.KAKAO_ADMIN_VERIFIER || "";
    if (!expected) return true;
    var actual = e.request.header.get("Authorization") || "";
    return actual === "KakaoAK " + expected;
  };

  try {
    if (!verifyKakaoAdminHeader()) {
      return e.json(401, { ok: false, error: "Invalid Kakao Authorization header" });
    }
    var q = e.request.url.query();
    return e.json(200, {
      ok: true,
      chat_type: q.get("CHAT_TYPE") || "",
      hash_chat_id: q.get("HASH_CHAT_ID") || "",
      template_id: q.get("TEMPLATE_ID") || "",
    });
  } catch (err) {
    return e.json(200, { ok: true });
  }
});

routerAdd("POST", "/api/kakao/talk-share-webhook", function (e) {
  var readJsonBody = function (event) {
    var info = event.requestInfo();
    var parsed = info.body || {};
    if (typeof parsed === "string") {
      try {
        return JSON.parse(parsed);
      } catch (err) {
        return {};
      }
    }
    return parsed;
  };

  var verifyKakaoAdminHeader = function () {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var expected = runtimeEnv.KAKAO_ADMIN_VERIFIER || "";
    if (!expected) return true;
    var actual = e.request.header.get("Authorization") || "";
    return actual === "KakaoAK " + expected;
  };

  try {
    if (!verifyKakaoAdminHeader()) {
      return e.json(401, { ok: false, error: "Invalid Kakao Authorization header" });
    }
    var body = readJsonBody(e);
    return e.json(200, {
      ok: true,
      chat_type: body.CHAT_TYPE || "",
      hash_chat_id: body.HASH_CHAT_ID || "",
      template_id: body.TEMPLATE_ID || "",
    });
  } catch (err) {
    return e.json(200, { ok: true });
  }
});

// Copy to api/kakao-verified-callback.pb.js.
// Verifies Kakao callback Authorization when a backend-readable admin key is configured.

routerAdd("POST", "/api/kakao/verified-callback", function (e) {
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

  var verifyKakao = function () {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var expected = runtimeEnv.KAKAO_ADMIN_VERIFIER || "";
    if (!expected) return true;
    var actual = e.request.header.get("Authorization") || "";
    return actual === "KakaoAK " + expected;
  };

  try {
    if (!verifyKakao()) {
      return e.json(401, { ok: false, error: "Invalid Kakao Authorization header" });
    }

    var body = readJsonBody(e);
    return e.json(200, { ok: true, event: body.event || "", payload: body });
  } catch (err) {
    return e.json(200, { ok: true });
  }
});

// Copy to api/kakao-channel-webhook.pb.js.
// Receives Kakao Talk Channel add/block callbacks.

routerAdd("POST", "/api/kakao/channel-webhook", function (e) {
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
      event: body.event || "",
      id: body.id || "",
      id_type: body.id_type || "",
      channel_public_id: body.channel_public_id || "",
      channel_uuid: body.channel_uuid || "",
      updated_at: body.updated_at || "",
    });
  } catch (err) {
    return e.json(200, { ok: true });
  }
});

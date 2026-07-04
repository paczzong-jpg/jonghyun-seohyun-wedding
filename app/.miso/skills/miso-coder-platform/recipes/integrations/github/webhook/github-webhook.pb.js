// Copy to api/github-webhook.pb.js.
// Verifies GitHub webhook deliveries with X-Hub-Signature-256.

routerAdd("POST", "/api/github/webhook", function (e) {
  var safeEqual = function (a, b) {
    a = String(a || "");
    b = String(b || "");
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  };

  var verifyGitHub = function (rawBody) {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var secret = runtimeEnv.GITHUB_WEBHOOK_SECRET_RAW || "";
    if (!secret) return "Missing GITHUB_WEBHOOK_SECRET_RAW";

    var signature = e.request.header.get("X-Hub-Signature-256") || "";
    var expected = "sha256=" + $security.hs256(rawBody, secret);
    return safeEqual(expected, signature) ? "" : "Invalid GitHub webhook signature";
  };

  try {
    var rawBody = readerToString(e.request.body);
    var verificationError = verifyGitHub(rawBody);
    if (verificationError) return e.json(401, { error: verificationError });

    var payload = {};
    try {
      payload = JSON.parse(rawBody || "{}");
    } catch (err) {
      return e.json(400, { error: "Invalid JSON body" });
    }

    var eventName = e.request.header.get("X-GitHub-Event") || "";
    var deliveryId = e.request.header.get("X-GitHub-Delivery") || "";
    if (eventName === "ping") {
      return e.json(200, { ok: true, event: eventName, delivery: deliveryId, zen: payload.zen || "" });
    }

    return e.json(200, { ok: true, event: eventName, delivery: deliveryId });
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

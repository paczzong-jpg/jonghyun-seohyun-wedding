// Copy to api/slack-verified-callback.pb.js.
// Verifies Slack callbacks before handling slash commands, events, or interactions.

routerAdd("POST", "/api/slack/verified-callback", function (e) {
  var safeEqual = function (a, b) {
    a = String(a || "");
    b = String(b || "");
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  };

  var verifySlack = function (rawBody) {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var signingSecret = runtimeEnv.SLACK_SIGNING_SECRET_RAW || "";
    if (!signingSecret) return "Missing SLACK_SIGNING_SECRET_RAW";

    var timestamp = e.request.header.get("X-Slack-Request-Timestamp") || "";
    var signature = e.request.header.get("X-Slack-Signature") || "";
    var ts = Number(timestamp);
    var now = Math.floor(Date.now() / 1000);
    if (!timestamp || !isFinite(ts) || Math.abs(now - ts) > 300) {
      return "Invalid or stale Slack timestamp";
    }

    var base = "v0:" + timestamp + ":" + rawBody;
    var expected = "v0=" + $security.hs256(base, signingSecret);
    return safeEqual(expected, signature) ? "" : "Invalid Slack signature";
  };

  try {
    var rawBody = readerToString(e.request.body);
    var verificationError = verifySlack(rawBody);
    if (verificationError) return e.json(401, { error: verificationError });

    var payload = {};
    try {
      payload = JSON.parse(rawBody || "{}");
    } catch (err) {
      // Slash commands and interactions can be form-encoded. Keep this route
      // generic and adapt parsing in the selected feature recipe.
      payload = { rawBody: rawBody };
    }

    if (payload.type === "url_verification" && payload.challenge) {
      return e.json(200, { challenge: payload.challenge });
    }

    return e.json(200, { ok: true });
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

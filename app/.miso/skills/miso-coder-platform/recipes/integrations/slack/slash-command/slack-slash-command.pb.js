// Copy to api/slack-slash-command.pb.js.
// Receives Slack slash commands and verifies Slack signatures.

routerAdd("POST", "/api/slack/slash-command", function (e) {
  var parseForm = function (raw) {
    var result = {};
    var parts = String(raw || "").split("&");
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var eq = parts[i].indexOf("=");
      var key = eq >= 0 ? parts[i].substring(0, eq) : parts[i];
      var value = eq >= 0 ? parts[i].substring(eq + 1) : "";
      key = decodeURIComponent(key.replace(/\+/g, " "));
      value = decodeURIComponent(value.replace(/\+/g, " "));
      result[key] = value;
    }
    return result;
  };

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
    var now = Math.floor(Date.now() / 1000);
    var ts = Number(timestamp);
    if (!timestamp || !isFinite(ts) || Math.abs(now - ts) > 300) return "Invalid or stale Slack timestamp";

    var base = "v0:" + timestamp + ":" + rawBody;
    var expected = "v0=" + $security.hs256(base, signingSecret);
    return safeEqual(expected, signature) ? "" : "Invalid Slack signature";
  };

  try {
    var rawBody = readerToString(e.request.body);
    var verificationError = verifySlack(rawBody);
    if (verificationError) {
      return e.json(401, { error: verificationError });
    }

    var form = parseForm(rawBody);
    var command = String(form.command || "");
    var text = String(form.text || "").trim();
    var userName = String(form.user_name || "there");

    return e.json(200, {
      response_type: "ephemeral",
      text: command + " received from " + userName + (text ? ": " + text : ""),
    });
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

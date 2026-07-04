// Copy to api/teams-workflows-webhook.pb.js.
// Posts simple messages to Microsoft Teams through a Teams Workflows webhook.

routerAdd("POST", "/api/teams/workflows/send", function (e) {
  var readJsonBody = function (event) {
    var info = event.requestInfo();
    var body = info.body || {};
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch (err) {
        throw new Error("Invalid JSON body");
      }
    }
    return body;
  };

  var clampString = function (value, max) {
    var text = String(value == null ? "" : value).trim();
    if (max && text.length > max) return text.substring(0, max);
    return text;
  };

  var bytesToUtf8 = function (bytes) {
    var out = "";
    for (var i = 0; i < bytes.length; ) {
      var c = bytes[i++] & 255;
      if (c < 128) {
        out += String.fromCharCode(c);
      } else if (c >= 192 && c < 224 && i < bytes.length) {
        var c2 = bytes[i++] & 255;
        out += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      } else if (c >= 224 && c < 240 && i + 1 < bytes.length) {
        var c3 = bytes[i++] & 255;
        var c4 = bytes[i++] & 255;
        out += String.fromCharCode(((c & 15) << 12) | ((c3 & 63) << 6) | (c4 & 63));
      } else if (c >= 240 && c < 248 && i + 2 < bytes.length) {
        var c5 = bytes[i++] & 255;
        var c6 = bytes[i++] & 255;
        var c7 = bytes[i++] & 255;
        var point = ((c & 7) << 18) | ((c5 & 63) << 12) | ((c6 & 63) << 6) | (c7 & 63);
        point -= 65536;
        out += String.fromCharCode(55296 + (point >> 10), 56320 + (point & 1023));
      } else {
        out += String.fromCharCode(65533);
      }
    }
    return out;
  };

  var bodyToText = function (res) {
    if (typeof res.text === "string") return res.text;
    if (typeof res.body === "string") return res.body;
    return bytesToUtf8(res.body || []);
  };

  try {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var body = readJsonBody(e);

    var webhookUrl = runtimeEnv.TEAMS_WORKFLOW_WEBHOOK_URL || "";
    var text = clampString(body.text, 3000);
    if (!webhookUrl) return e.json(500, { error: "Missing TEAMS_WORKFLOW_WEBHOOK_URL" });
    if (!text) return e.json(400, { error: "text is required" });

    var upstream = runtimeProxy.proxyFetch({
      url: webhookUrl,
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text }),
      timeout: 20,
    });

    var responseText = bodyToText(upstream);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode || 502, {
        error: "Teams workflow webhook failed",
        details: responseText.substring(0, 1000),
      });
    }

    return e.json(200, { ok: true });
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

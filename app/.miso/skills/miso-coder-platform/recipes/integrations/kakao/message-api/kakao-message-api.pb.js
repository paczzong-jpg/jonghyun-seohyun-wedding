// Copy to api/kakao-message-api.pb.js.
// Sends a Kakao Talk "send to me" message with a user access token.

routerAdd("POST", "/api/kakao/message/send-me", function (e) {
  var readJsonBody = function (event) {
    var info = event.requestInfo();
    var parsed = info.body || {};
    if (typeof parsed === "string") {
      try {
        return JSON.parse(parsed);
      } catch (err) {
        throw new Error("Invalid JSON body");
      }
    }
    return parsed;
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

  var parseJsonOrText = function (text) {
    try {
      return JSON.parse(text);
    } catch (err) {
      return String(text || "").substring(0, 1000);
    }
  };

  try {
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var body = readJsonBody(e);
    var accessToken = String(body.accessToken || "").trim();
    var templateObject = body.templateObject || null;

    if (!accessToken || !templateObject) {
      return e.json(400, { error: "accessToken and templateObject are required" });
    }

    var upstream = runtimeProxy.proxyFetch({
      url: "https://kapi.kakao.com/v2/api/talk/memo/default/send",
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: "template_object=" + encodeURIComponent(JSON.stringify(templateObject)),
      timeout: 20,
    });

    var text = bodyToText(upstream);
    var data = parseJsonOrText(text);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, {
        error: "Kakao Talk Message request failed",
        details: data,
      });
    }

    return e.json(200, { ok: true, data: data });
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

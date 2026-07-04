// Copy to api/google-gmail.pb.js.
// Sends a Gmail message with a user-granted short-lived access token.
// External network access goes through the MISO runtime proxy.

routerAdd("POST", "/api/google/gmail/send", function (e) {
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
    var text = String(value == null ? "" : value);
    if (max && text.length > max) return text.substring(0, max);
    return text;
  };

  var cleanHeader = function (value, max) {
    return clampString(value, max).replace(/[\r\n]+/g, " ").trim();
  };

  var utf8Bytes = function (text) {
    var bytes = [];
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6));
        bytes.push(0x80 | (code & 0x3f));
      } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
        var next = text.charCodeAt(++i);
        var point = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        bytes.push(0xf0 | (point >> 18));
        bytes.push(0x80 | ((point >> 12) & 0x3f));
        bytes.push(0x80 | ((point >> 6) & 0x3f));
        bytes.push(0x80 | (point & 0x3f));
      } else {
        bytes.push(0xe0 | (code >> 12));
        bytes.push(0x80 | ((code >> 6) & 0x3f));
        bytes.push(0x80 | (code & 0x3f));
      }
    }
    return bytes;
  };

  var base64FromBytes = function (bytes) {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var out = "";
    for (var i = 0; i < bytes.length; i += 3) {
      var a = bytes[i];
      var b = i + 1 < bytes.length ? bytes[i + 1] : 0;
      var c = i + 2 < bytes.length ? bytes[i + 2] : 0;
      var n = (a << 16) | (b << 8) | c;
      out += chars[(n >> 18) & 63];
      out += chars[(n >> 12) & 63];
      out += i + 1 < bytes.length ? chars[(n >> 6) & 63] : "=";
      out += i + 2 < bytes.length ? chars[n & 63] : "=";
    }
    return out;
  };

  var makeBase64Url = function (text) {
    return base64FromBytes(utf8Bytes(text)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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

    var accessToken = clampString(body.accessToken, 4096);
    var to = cleanHeader(body.to, 500);
    var subject = cleanHeader(body.subject, 500);
    var bodyText = clampString(body.bodyText, 20000);

    if (!accessToken || !to || !subject || !bodyText) {
      return e.json(400, { error: "accessToken, to, subject, and bodyText are required" });
    }

    var mime = [
      "MIME-Version: 1.0",
      "To: " + to,
      "Subject: =?UTF-8?B?" + base64FromBytes(utf8Bytes(subject)) + "?=",
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      bodyText,
    ].join("\r\n");

    var upstream = runtimeProxy.proxyFetch({
      url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: makeBase64Url(mime) }),
      timeout: 30,
    });

    var text = bodyToText(upstream);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, {
        error: "Gmail request failed",
        details: parseJsonOrText(text),
      });
    }

    var data = parseJsonOrText(text);
    return e.json(200, {
      ok: true,
      id: data && data.id ? data.id : "",
      threadId: data && data.threadId ? data.threadId : "",
    });
  } catch (err) {
    return e.json(500, {
      error: err && err.message ? err.message : String(err),
    });
  }
});

// Copy to api/teams-outgoing-webhook.pb.js.
// Verifies Microsoft Teams outgoing webhook HMAC and returns a synchronous reply.

routerAdd("POST", "/api/teams/outgoing-webhook", function (e) {
  var safeEqual = function (a, b) {
    a = String(a || "");
    b = String(b || "");
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  };

  var utf8Bytes = function (text) {
    var bytes = [];
    text = String(text || "");
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

  var base64ToBytes = function (value) {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var clean = String(value || "").replace(/[\r\n\s]/g, "").replace(/=+$/g, "");
    var out = [];
    var buffer = 0;
    var bits = 0;
    for (var i = 0; i < clean.length; i++) {
      var idx = chars.indexOf(clean.charAt(i));
      if (idx < 0) continue;
      buffer = (buffer << 6) | idx;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out.push((buffer >> bits) & 0xff);
      }
    }
    return out;
  };

  var bytesToBase64 = function (bytes) {
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

  var rightRotate = function (value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  };

  var sha256 = function (bytes) {
    var k = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var msg = bytes.slice(0);
    var bitLen = msg.length * 8;
    msg.push(0x80);
    while ((msg.length % 64) !== 56) msg.push(0);
    var high = Math.floor(bitLen / 0x100000000);
    var low = bitLen >>> 0;
    msg.push((high >>> 24) & 0xff, (high >>> 16) & 0xff, (high >>> 8) & 0xff, high & 0xff);
    msg.push((low >>> 24) & 0xff, (low >>> 16) & 0xff, (low >>> 8) & 0xff, low & 0xff);

    for (var offset = 0; offset < msg.length; offset += 64) {
      var w = [];
      for (var i = 0; i < 16; i++) {
        var j = offset + i * 4;
        w[i] = (((msg[j] << 24) | (msg[j + 1] << 16) | (msg[j + 2] << 8) | msg[j + 3]) >>> 0);
      }
      for (var i2 = 16; i2 < 64; i2++) {
        var s0 = (rightRotate(w[i2 - 15], 7) ^ rightRotate(w[i2 - 15], 18) ^ (w[i2 - 15] >>> 3)) >>> 0;
        var s1 = (rightRotate(w[i2 - 2], 17) ^ rightRotate(w[i2 - 2], 19) ^ (w[i2 - 2] >>> 10)) >>> 0;
        w[i2] = (w[i2 - 16] + s0 + w[i2 - 7] + s1) >>> 0;
      }

      var a = h[0];
      var b = h[1];
      var c = h[2];
      var d = h[3];
      var e1 = h[4];
      var f = h[5];
      var g = h[6];
      var h7 = h[7];
      for (var t = 0; t < 64; t++) {
        var S1 = (rightRotate(e1, 6) ^ rightRotate(e1, 11) ^ rightRotate(e1, 25)) >>> 0;
        var ch = ((e1 & f) ^ (~e1 & g)) >>> 0;
        var temp1 = (h7 + S1 + ch + k[t] + w[t]) >>> 0;
        var S0 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) >>> 0;
        var maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        var temp2 = (S0 + maj) >>> 0;
        h7 = g;
        g = f;
        f = e1;
        e1 = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0;
      h[1] = (h[1] + b) >>> 0;
      h[2] = (h[2] + c) >>> 0;
      h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e1) >>> 0;
      h[5] = (h[5] + f) >>> 0;
      h[6] = (h[6] + g) >>> 0;
      h[7] = (h[7] + h7) >>> 0;
    }

    var out = [];
    for (var n = 0; n < h.length; n++) {
      out.push((h[n] >>> 24) & 0xff, (h[n] >>> 16) & 0xff, (h[n] >>> 8) & 0xff, h[n] & 0xff);
    }
    return out;
  };

  var hmacSha256Base64 = function (rawBody, base64Key) {
    var key = base64ToBytes(base64Key);
    if (key.length > 64) key = sha256(key);
    while (key.length < 64) key.push(0);
    var ipad = [];
    var opad = [];
    for (var i = 0; i < 64; i++) {
      ipad.push(key[i] ^ 0x36);
      opad.push(key[i] ^ 0x5c);
    }
    return bytesToBase64(sha256(opad.concat(sha256(ipad.concat(utf8Bytes(rawBody))))));
  };

  var extractHmac = function (headerValue) {
    var text = String(headerValue || "").trim();
    if (text.substring(0, 5).toLowerCase() === "hmac ") return text.substring(5).trim();
    return text;
  };

  try {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var hmacKey = runtimeEnv.TEAMS_OUTGOING_WEBHOOK_HMAC_KEY_RAW || "";
    if (!hmacKey) return e.json(500, { error: "Missing TEAMS_OUTGOING_WEBHOOK_HMAC_KEY_RAW" });

    var rawBody = readerToString(e.request.body);
    var provided = extractHmac(e.request.header.get("Authorization") || "");
    var expected = hmacSha256Base64(rawBody, hmacKey);
    if (!provided || !safeEqual(expected, provided)) {
      return e.json(401, { error: "Invalid Teams outgoing webhook HMAC" });
    }

    var payload = {};
    try {
      payload = JSON.parse(rawBody || "{}");
    } catch (err) {
      payload = {};
    }
    var text = "";
    if (payload.text) text = String(payload.text).trim();

    return e.json(200, {
      type: "message",
      text: text ? "Received: " + text : "Received your Teams message.",
    });
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

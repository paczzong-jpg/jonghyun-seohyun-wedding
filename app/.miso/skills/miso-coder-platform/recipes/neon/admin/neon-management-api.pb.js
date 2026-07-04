// Copy to api/neon-management-api.pb.js.
// Backend-only route for Neon Management API calls through the MISO proxy.

routerAdd("GET", "/api/neon/projects", function (e) {
  try {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");

    var apiKey = runtimeEnv.NEON_API_KEY || "";
    var pinnedProjectId = runtimeEnv.NEON_PROJECT_ID || "";

    if (!apiKey) {
      return e.json(500, { error: "Missing NEON_API_KEY" });
    }

    var url = "https://console.neon.tech/api/v2/projects";
    if (pinnedProjectId) {
      url += "/" + encodeURIComponent(pinnedProjectId);
    }

    var upstream = runtimeProxy.proxyFetch({
      url: url,
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + apiKey,
      },
      timeout: 30,
    });

    var text = bodyToText(upstream);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, {
        error: "Neon request failed",
        details: parseJsonOrText(text),
      });
    }

    return e.json(200, {
      ok: true,
      data: parseJsonOrText(text),
    });
  } catch (err) {
    return e.json(500, {
      error: err && err.message ? err.message : String(err),
    });
  }
});

function bytesToUtf8(bytes) {
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
}

function bodyToText(res) {
  if (typeof res.text === "string") return res.text;
  if (typeof res.body === "string") return res.body;
  return bytesToUtf8(res.body || []);
}

function parseJsonOrText(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return String(text || "").substring(0, 1000);
  }
}

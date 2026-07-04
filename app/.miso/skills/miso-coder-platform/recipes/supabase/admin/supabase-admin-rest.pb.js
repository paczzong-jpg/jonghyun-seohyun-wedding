// Copy to api/supabase-admin-rest.pb.js and customize route/table/validation.
// This route is backend-only. It uses proxyFetch because all external network
// access from PocketBase hooks must pass through the MISO runtime proxy.

routerAdd("POST", "/api/supabase/admin-upsert", function (e) {
  try {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");

    var baseUrl = runtimeEnv.SUPABASE_URL || "";
    var key = runtimeEnv.SUPABASE_SECRET_KEY || runtimeEnv.SUPABASE_SERVICE_ROLE_KEY;
    var table = runtimeEnv.SUPABASE_ADMIN_TABLE || "todos";

    if (!baseUrl || !key) {
      return e.json(500, { error: "Missing SUPABASE_URL and backend Supabase key" });
    }
    if (!/^[A-Za-z0-9_]+$/.test(table)) {
      return e.json(500, { error: "Invalid SUPABASE_ADMIN_TABLE" });
    }

    var info = e.requestInfo();
    var body = info.body || {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (err) {
        return e.json(400, { error: "Invalid JSON body" });
      }
    }

    var row = body.row || body;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return e.json(400, { error: "Body must be an object or { row }" });
    }

    var headers = supabaseHeaders(key);
    headers["Content-Type"] = "application/json";
    headers.Prefer = "resolution=merge-duplicates,return=representation";

    var upstream = runtimeProxy.proxyFetch({
      url: trimTrailingSlash(baseUrl) + "/rest/v1/" + encodeURIComponent(table),
      method: "POST",
      headers: headers,
      body: JSON.stringify(row),
      timeout: 30,
    });

    var text = bodyToText(upstream);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, {
        error: "Supabase request failed",
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

function supabaseHeaders(key) {
  var headers = { apikey: key };

  // New sb_secret_ keys are opaque API keys. Legacy service_role keys are JWTs.
  if (key.indexOf("sb_secret_") !== 0) {
    headers.Authorization = "Bearer " + key;
  }

  return headers;
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

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

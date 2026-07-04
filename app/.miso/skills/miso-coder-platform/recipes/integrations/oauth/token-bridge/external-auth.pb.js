// External access-token bridge.
// Copy to api/external-auth.pb.js and configure EXTERNAL_AUTH_USERINFO_URL.
// Every helper and require() stays inside the handler for the PocketBase Goja runtime.

routerAdd("POST", "/api/auth/external-token", function (e) {
  try {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");

    function jsonBody(event) {
      var body = event.requestInfo().body || {};
      if (typeof body === "string") {
        try {
          return JSON.parse(body);
        } catch (_) {
          return {};
        }
      }
      return body;
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

    function parseJson(text) {
      try {
        return JSON.parse(text || "{}");
      } catch (_) {
        return {};
      }
    }

    function hasAudience(value, expected) {
      if (!expected) return true;
      if (Object.prototype.toString.call(value) === "[object Array]") {
        for (var i = 0; i < value.length; i++) {
          if (String(value[i]) === expected) return true;
        }
        return false;
      }
      return String(value || "") === expected;
    }

    function cleanEmail(value) {
      return String(value || "").trim().toLowerCase();
    }

    var body = jsonBody(e);
    var token = String(body.accessToken || body.token || "").trim();
    if (!token) {
      return e.json(400, { error: "missing accessToken" });
    }

    var userinfoUrl = runtimeEnv.EXTERNAL_AUTH_USERINFO_URL || "";
    var collectionName = runtimeEnv.EXTERNAL_AUTH_COLLECTION || "users";
    var expectedAudience = runtimeEnv.EXTERNAL_AUTH_AUDIENCE || "";
    var provider = runtimeEnv.EXTERNAL_AUTH_PROVIDER || "external";
    if (!userinfoUrl) {
      return e.json(500, { error: "missing EXTERNAL_AUTH_USERINFO_URL" });
    }

    var upstream = runtimeProxy.proxyFetch({
      url: userinfoUrl,
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
      timeout: 30,
    });

    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(401, { error: "external token rejected", provider: provider });
    }

    var claims = parseJson(bodyToText(upstream));
    var subject = String(claims.sub || claims.id || claims.user_id || "").trim();
    var email = cleanEmail(claims.email || claims.upn || claims.preferred_username);

    if (!subject || !email) {
      return e.json(401, { error: "external token missing subject or email", provider: provider });
    }
    if (claims.email_verified === false) {
      return e.json(403, { error: "external email is not verified", provider: provider });
    }
    if (!hasAudience(claims.aud || claims.audience, expectedAudience)) {
      return e.json(401, { error: "external token audience mismatch", provider: provider });
    }

    var collection = $app.findCollectionByNameOrId(collectionName);
    var savedRecord = null;

    $app.runInTransaction(function (tx) {
      var record = null;
      try {
        record = tx.findAuthRecordByEmail(collectionName, email);
      } catch (_) {
        record = null;
      }

      if (!record) {
        record = new Record(collection);
        record.set("email", email);
        record.set("verified", true);
        record.setRandomPassword();
      } else if (record.get("verified") !== true) {
        record.set("verified", true);
      }

      tx.save(record);
      savedRecord = record;
    });

    var record = savedRecord;
    return e.json(200, {
      token: record.newAuthToken(),
      record: record.publicExport(),
    });
  } catch (err) {
    return e.json(500, { error: "external auth bridge failed", detail: err && err.message ? err.message : String(err) });
  }
});

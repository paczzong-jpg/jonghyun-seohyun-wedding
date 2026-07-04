// Copy to api/snowflake-sql.pb.js.
// Runs read-only Snowflake SQL API statements through the MISO runtime proxy.

routerAdd("POST", "/api/snowflake/sql/query", function (e) {
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

  var isReadOnlyStatement = function (statement) {
    var text = String(statement || "").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--.*$/gm, " ").trim().toLowerCase();
    var first = (text.match(/^[a-z]+/) || [""])[0];
    return ["select", "with", "show", "describe", "desc", "explain"].indexOf(first) >= 0;
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
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var body = readJsonBody(e);

    var accountUrl = clampString(runtimeEnv.SNOWFLAKE_ACCOUNT_URL, 500).replace(/\/+$/, "");
    var token = runtimeEnv.SNOWFLAKE_PAT || runtimeEnv.SNOWFLAKE_ACCESS_TOKEN || "";
    var statement = clampString(body.statement, 100000);
    var timeout = Math.min(60, Math.max(1, Number(body.timeoutSeconds || 30)));

    if (!accountUrl || !token) return e.json(500, { error: "Missing Snowflake env values" });
    if (!statement) return e.json(400, { error: "statement is required" });
    if (!isReadOnlyStatement(statement)) return e.json(400, { error: "Only read-only Snowflake statements are allowed by default" });

    var payload = {
      statement: statement,
      timeout: timeout,
    };
    if (runtimeEnv.SNOWFLAKE_WAREHOUSE) payload.warehouse = runtimeEnv.SNOWFLAKE_WAREHOUSE;
    if (runtimeEnv.SNOWFLAKE_DATABASE) payload.database = runtimeEnv.SNOWFLAKE_DATABASE;
    if (runtimeEnv.SNOWFLAKE_SCHEMA) payload.schema = runtimeEnv.SNOWFLAKE_SCHEMA;
    if (runtimeEnv.SNOWFLAKE_ROLE) payload.role = runtimeEnv.SNOWFLAKE_ROLE;

    var upstream = runtimeProxy.proxyFetch({
      url: accountUrl + "/api/v2/statements?async=false&nullable=false",
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "X-Snowflake-Authorization-Token-Type": runtimeEnv.SNOWFLAKE_TOKEN_TYPE || "PROGRAMMATIC_ACCESS_TOKEN",
      },
      body: JSON.stringify(payload),
      timeout: timeout + 10,
    });

    var text = bodyToText(upstream);
    var data = parseJsonOrText(text);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, { error: "Snowflake SQL request failed", details: data });
    }

    return e.json(200, { ok: true, data: data });
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

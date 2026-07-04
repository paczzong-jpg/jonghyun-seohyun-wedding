// Copy to api/databricks-sql.pb.js.
// Runs read-only Databricks SQL warehouse statements through the MISO runtime proxy.

routerAdd("POST", "/api/databricks/sql/query", function (e) {
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

    var host = clampString(runtimeEnv.DATABRICKS_WORKSPACE_URL, 500).replace(/\/+$/, "");
    var token = runtimeEnv.DATABRICKS_TOKEN || "";
    var warehouseId = clampString(body.warehouseId || runtimeEnv.DATABRICKS_WAREHOUSE_ID, 200);
    var statement = clampString(body.statement, 100000);
    var rowLimit = Math.min(1000, Math.max(1, Number(body.rowLimit || 100)));

    if (!host || !token || !warehouseId) return e.json(500, { error: "Missing Databricks env values" });
    if (!statement) return e.json(400, { error: "statement is required" });
    if (!isReadOnlyStatement(statement)) return e.json(400, { error: "Only read-only Databricks statements are allowed by default" });

    var payload = {
      warehouse_id: warehouseId,
      statement: statement,
      wait_timeout: "10s",
      disposition: "INLINE",
      format: "JSON_ARRAY",
      row_limit: rowLimit,
    };

    var upstream = runtimeProxy.proxyFetch({
      url: host + "/api/2.0/sql/statements/",
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      timeout: 30,
    });

    var text = bodyToText(upstream);
    var data = parseJsonOrText(text);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, { error: "Databricks SQL request failed", details: data });
    }

    return e.json(200, { ok: true, data: data });
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

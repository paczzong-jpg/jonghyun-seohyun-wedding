// Copy to api/google-bigquery.pb.js.
// Runs read-only BigQuery jobs.query requests with a user-granted Google access token.

routerAdd("POST", "/api/google/bigquery/query", function (e) {
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

  var normalizeRows = function (data) {
    var fields = data && data.schema && data.schema.fields ? data.schema.fields : [];
    var rows = data && data.rows ? data.rows : [];
    var out = [];
    for (var r = 0; r < rows.length; r++) {
      var item = {};
      var cells = rows[r] && rows[r].f ? rows[r].f : [];
      for (var c = 0; c < fields.length; c++) {
        item[fields[c].name || "col_" + c] = cells[c] ? cells[c].v : null;
      }
      out.push(item);
    }
    return out;
  };

  try {
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var body = readJsonBody(e);
    var accessToken = clampString(body.accessToken, 4096);
    var projectId = clampString(body.projectId, 300);
    var query = clampString(body.query, 100000);
    var location = clampString(body.location, 100);
    var maxResults = Math.min(1000, Math.max(1, Number(body.maxResults || 100)));

    if (!accessToken || !projectId || !query) {
      return e.json(400, { error: "accessToken, projectId, and query are required" });
    }
    if (!isReadOnlyStatement(query)) return e.json(400, { error: "Only read-only BigQuery statements are allowed by default" });

    var payload = {
      query: query,
      useLegacySql: false,
      maxResults: maxResults,
      timeoutMs: 10000,
    };
    if (location) payload.location = location;

    var upstream = runtimeProxy.proxyFetch({
      url: "https://bigquery.googleapis.com/bigquery/v2/projects/" + encodeURIComponent(projectId) + "/queries",
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      timeout: 30,
    });

    var text = bodyToText(upstream);
    var data = parseJsonOrText(text);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, { error: "BigQuery request failed", details: data });
    }

    return e.json(200, {
      ok: true,
      jobComplete: data && data.jobComplete === true,
      jobReference: data && data.jobReference ? data.jobReference : null,
      schema: data && data.schema ? data.schema : null,
      rows: normalizeRows(data),
      totalRows: data && data.totalRows ? data.totalRows : "0",
      pageToken: data && data.pageToken ? data.pageToken : "",
      raw: data,
    });
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

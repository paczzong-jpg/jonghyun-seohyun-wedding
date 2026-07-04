// Copy to api/powerbi-rest.pb.js.
// Lists Power BI workspaces or reports using Entra service principal auth.

routerAdd("POST", "/api/powerbi/reports", function (e) {
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

    var tenantId = clampString(runtimeEnv.POWERBI_TENANT_ID, 200);
    var clientId = clampString(runtimeEnv.POWERBI_CLIENT_ID, 200);
    var clientSecret = runtimeEnv.POWERBI_CLIENT_SECRET || "";
    var workspaceId = clampString(body.workspaceId || runtimeEnv.POWERBI_WORKSPACE_ID, 200);

    if (!tenantId || !clientId || !clientSecret) return e.json(500, { error: "Missing Power BI env values" });

    var tokenRes = runtimeProxy.proxyFetch({
      url: "https://login.microsoftonline.com/" + encodeURIComponent(tenantId) + "/oauth2/v2.0/token",
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body:
        "grant_type=client_credentials" +
        "&client_id=" +
        encodeURIComponent(clientId) +
        "&client_secret=" +
        encodeURIComponent(clientSecret) +
        "&scope=" +
        encodeURIComponent("https://analysis.windows.net/powerbi/api/.default"),
      timeout: 30,
    });

    var tokenText = bodyToText(tokenRes);
    var tokenData = parseJsonOrText(tokenText);
    if (tokenRes.statusCode < 200 || tokenRes.statusCode >= 300) {
      return e.json(tokenRes.statusCode, { error: "Power BI token request failed", details: tokenData });
    }

    var accessToken = tokenData && tokenData.access_token ? tokenData.access_token : "";
    if (!accessToken) return e.json(502, { error: "Power BI token response missing access_token" });

    var apiUrl = workspaceId
      ? "https://api.powerbi.com/v1.0/myorg/groups/" + encodeURIComponent(workspaceId) + "/reports"
      : "https://api.powerbi.com/v1.0/myorg/groups";

    var upstream = runtimeProxy.proxyFetch({
      url: apiUrl,
      method: "GET",
      headers: { Accept: "application/json", Authorization: "Bearer " + accessToken },
      timeout: 30,
    });

    var text = bodyToText(upstream);
    var data = parseJsonOrText(text);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, { error: "Power BI REST request failed", details: data });
    }

    return e.json(200, { ok: true, data: data });
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});
